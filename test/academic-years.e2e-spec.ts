import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Academic years CRUD and permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let serial = 0;
  const marker = `AY${Date.now()}`;
  const ownedIds = new Set<bigint>();
  const tokens: Partial<Record<user_role, string>> = {};
  let originalYears: unknown;
  let originalYearIds: bigint[] = [];
  let fixtures:
    | {
        years: bigint[];
        users: bigint[];
        department: bigint;
        major: bigint;
        course: bigint;
        rule: bigint;
      }
    | undefined;
  const f = () => fixtures!;
  const api = () => request(app.getHttpServer());
  const auth = (token = tokens.ADMIN!) => ({
    Authorization: `Bearer ${token}`,
  });
  const body = (overrides: Record<string, unknown> = {}) => ({
    name: `${marker}-${++serial}`,
    start_year: 2094,
    is_active: false,
    ...overrides,
  });
  const target = () => String(f().years[0]);
  const ownedWhere = () => ({
    OR: [{ id: { in: [...ownedIds] } }, { name: { startsWith: marker } }],
  });
  async function create(input: Record<string, unknown> = body()) {
    const response = await api()
      .post('/api/academic-years')
      .set(auth())
      .send(input);
    if (response.status === 201 && typeof response.body.id === 'string')
      ownedIds.add(BigInt(response.body.id));
    return response;
  }
  async function newYear(input = body()) {
    const response = await create(input);
    expect(response.status).toBe(201);
    return {
      id: response.body.id as string,
      name: response.body.name as string,
    };
  }
  const read = (id: string) =>
    api().get(`/api/academic-years/${id}`).set(auth());
  const update = (id: string, input: object) =>
    api().put(`/api/academic-years/${id}`).set(auth()).send(input);
  const remove = (id: string) =>
    api().delete(`/api/academic-years/${id}`).set(auth());
  function safeYear(value: Record<string, unknown>) {
    expect(Object.keys(value).sort()).toEqual(
      [
        'id',
        'name',
        'start_year',
        'start_date',
        'end_date',
        'is_active',
        'created_at',
        'updated_at',
      ].sort(),
    );
    expect(typeof value.id).toBe('string');
    expect(typeof value.is_active).toBe('boolean');
    expect(Number.isNaN(Date.parse(value.created_at as string))).toBe(false);
    expect(Number.isNaN(Date.parse(value.updated_at as string))).toBe(false);
  }
  async function state() {
    const years = await prisma.academic_years.findMany({
      where: ownedWhere(),
      orderBy: { id: 'asc' },
    });
    const ids = years.map((year) => year.id);
    return {
      years,
      semesters: await prisma.semesters.findMany({
        where: { academic_year_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      generations: await prisma.student_generations.findMany({
        where: { entry_academic_year_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      placements: await prisma.student_academic_records.findMany({
        where: { academic_year_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      revisions: await prisma.curriculum_revisions.findMany({
        where: { effective_academic_year_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      users: await prisma.users.findMany({
        where: { full_name: { startsWith: marker } },
        orderBy: { id: 'asc' },
      }),
    };
  }
  async function rejected(
    operation: () => PromiseLike<request.Response>,
    status: number,
  ) {
    const before = await state();
    const response = await operation();
    expect(response.status).toBe(status);
    expect(await state()).toEqual(before);
    return response;
  }
  async function noForeignActiveYear() {
    expect(
      await prisma.academic_years.count({
        where: { is_active: true, NOT: ownedWhere() },
      }),
    ).toBe(0);
  }
  async function cleanupYears(keepBaseline: boolean) {
    if (!confirmed) return;
    await prisma.academic_years.deleteMany({
      where: {
        ...ownedWhere(),
        ...(keepBaseline && fixtures ? { id: { notIn: f().years } } : {}),
      },
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    const [database] = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    expect(database.name).toBe('teacher_evaluation_test');
    const existingYears = await prisma.academic_years.findMany({
      orderBy: { id: 'asc' },
    });
    // Do not deactivate another tester's active year. An idle isolated DB is required.
    expect(existingYears.filter((year) => year.is_active)).toEqual([]);
    originalYears = existingYears;
    originalYearIds = existingYears.map((year) => year.id);
    confirmed = true;
    const hash = await bcrypt.hash('Password123', 10);
    const users: bigint[] = [];
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT'] as user_role[]) {
      const user = await prisma.users.create({
        data: {
          email: `${marker.toLowerCase()}-${role.toLowerCase()}@example.test`,
          full_name: `${marker} ${role}`,
          role,
          status: 'ACTIVE',
          password_hash: hash,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      users.push(user.id);
      const login = await api()
        .post('/api/auth/login')
        .send({ identifier: user.email, password: 'Password123' });
      expect(login.status).toBe(200);
      tokens[role] = login.body.access_token;
    }
    fixtures = await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const years: bigint[] = [];
        for (let index = 0; index < 6; index++) {
          const year = await tx.academic_years.create({
            data: {
              name: `${marker}-B${index}`,
              start_year: 2094,
              is_active: false,
            },
          });
          years.push(year.id);
        }
        await tx.semesters.create({
          data: {
            academic_year_id: years[1],
            semester_name: marker,
            semester_number: 1,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.student_generations.create({
          data: { name: `${marker}-Direct`, entry_academic_year_id: years[2] },
        });
        const generation = await tx.student_generations.create({
          data: { name: `${marker}-Profile`, entry_academic_year_id: years[5] },
        });
        const department = await tx.departments.create({
          data: { code: marker, name: marker },
        });
        const major = await tx.majors.create({
          data: { code: marker, name: marker, department_id: department.id },
        });
        await tx.students.create({
          data: {
            user_id: users[2],
            student_code: marker.toLowerCase(),
            generation_id: generation.id,
            student_academic_records: {
              create: {
                academic_year_id: years[3],
                major_id: major.id,
                year_level: 1,
                class_group: 'A',
              },
            },
          },
        });
        const course = await tx.courses.create({
          data: {
            course_code: marker,
            course_name: marker,
            department_id: department.id,
            created_at: now,
            updated_at: now,
          },
        });
        const rule = await tx.course_year_rules.create({
          data: { course_id: course.id, major_id: major.id, year_level: 1 },
        });
        await tx.curriculum_revisions.create({
          data: {
            rule_id: rule.id,
            revision_no: 1,
            effective_academic_year_id: years[4],
            effective_start_year: 2094,
            enabled: true,
          },
        });
        return {
          years,
          users,
          department: department.id,
          major: major.id,
          course: course.id,
          rule: rule.id,
        };
      },
      { timeout: 20000 },
    );
    f().years.forEach((id) => ownedIds.add(id));
  }, 30000);

  afterEach(async () => {
    await cleanupYears(true);
    if (confirmed)
      expect(
        await prisma.academic_years.findMany({
          where: { id: { in: originalYearIds } },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(originalYears);
  });
  afterAll(async () => {
    try {
      if (confirmed) {
        if (fixtures)
          await prisma.$transaction(async (tx) => {
            const own = f();
            await tx.student_academic_records.deleteMany({
              where: { academic_year_id: { in: own.years } },
            });
            await tx.students.deleteMany({
              where: { user_id: { in: own.users } },
            });
            await tx.student_generations.deleteMany({
              where: { entry_academic_year_id: { in: own.years } },
            });
            await tx.semesters.deleteMany({
              where: { academic_year_id: { in: own.years } },
            });
            await tx.curriculum_revisions.deleteMany({
              where: { rule_id: own.rule },
            });
            await tx.course_year_rules.delete({ where: { id: own.rule } });
            await tx.courses.delete({ where: { id: own.course } });
            await tx.majors.delete({ where: { id: own.major } });
            await tx.departments.delete({ where: { id: own.department } });
            await tx.academic_years.deleteMany({ where: ownedWhere() });
          });
        await prisma.users.deleteMany({
          where: { full_name: { startsWith: marker } },
        });
        expect(
          await prisma.academic_years.findMany({
            where: { id: { in: originalYearIds } },
            orderBy: { id: 'asc' },
          }),
        ).toEqual(originalYears);
      }
    } finally {
      await app?.close();
    }
  });

  it.each<user_role>(['ADMIN', 'LECTURER', 'STUDENT'])(
    '%s can read year lists/details with safe metadata',
    async (role) => {
      const before = await state();
      const list = await api()
        .get('/api/academic-years')
        .set(auth(tokens[role]));
      expect(list.status).toBe(200);
      list.body.forEach((year: Record<string, unknown>) => safeYear(year));
      for (const id of f().years)
        expect(list.body.map((year: { id: string }) => year.id)).toContain(
          String(id),
        );
      const detail = await api()
        .get(`/api/academic-years/${target()}`)
        .set(auth(tokens[role]));
      expect(detail.status).toBe(200);
      expect(detail.body).toEqual(
        list.body.find((year: { id: string }) => year.id === target()),
      );
      expect(await state()).toEqual(before);
    },
  );
  const authCases = ['list', 'detail', 'create', 'update', 'delete'].flatMap(
    (route) =>
      [
        'missing JWT',
        'invalid JWT',
        ...(['create', 'update', 'delete'].includes(route)
          ? ['LECTURER', 'STUDENT']
          : []),
      ].map((identity) => ({ route, identity })),
  );
  it.each(authCases)(
    'protects $route from $identity',
    async ({ route, identity }) => {
      await rejected(
        () => {
          let operation =
            route === 'list'
              ? api().get('/api/academic-years')
              : route === 'detail'
                ? api().get(`/api/academic-years/${target()}`)
                : route === 'create'
                  ? api().post('/api/academic-years')
                  : route === 'update'
                    ? api().put(`/api/academic-years/${target()}`)
                    : api().delete(`/api/academic-years/${target()}`);
          if (identity !== 'missing JWT')
            operation = operation.set(
              auth(
                identity === 'invalid JWT'
                  ? 'invalid-token'
                  : tokens[identity as user_role],
              ),
            );
          return ['create', 'update'].includes(route)
            ? operation.send(body())
            : operation;
        },
        identity.endsWith('JWT') ? 401 : 403,
      );
    },
  );
  it('creates the frontend name/start_year/is_active payload', async () => {
    const input = body();
    const response = await create(input);
    expect(response.status).toBe(201);
    safeYear(response.body);
    expect(response.body).toMatchObject({
      ...input,
      start_date: null,
      end_date: null,
    });
  });
  it('preserves omitted and nullable creation defaults', async () => {
    const response = await create({ name: body().name });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      start_year: null,
      start_date: null,
      end_date: null,
      is_active: false,
    });
    const explicit = await create(
      body({
        start_year: null,
        is_active: null,
        start_date: null,
        end_date: null,
      }),
    );
    expect(explicit.status).toBe(201);
    expect(explicit.body).toMatchObject({
      start_year: null,
      is_active: false,
      start_date: null,
      end_date: null,
    });
  });
  it.each([1900, 2200])(
    'accepts start_year=%s independent of the display label',
    async (startYear) => {
      const response = await create(body({ start_year: startYear }));
      expect(response.status).toBe(201);
      expect(response.body.start_year).toBe(startYear);
    },
  );
  it('accepts a maximum-length Khmer display name', async () => {
    const response = await create(body({ name: '\u1780'.repeat(20) }));
    expect(response.status).toBe(201);
    expect(response.body.name).toHaveLength(20);
  });
  it('strips injected IDs/private fields', async () => {
    const response = await create(
      body({ id: target(), password_hash: 'injected', auth_version: 99 }),
    );
    expect(response.status).toBe(201);
    expect(response.body.id).not.toBe(target());
    safeYear(response.body);
  });
  it.each(['name', 'start_year'] as const)(
    'partially updates only %s',
    async (field) => {
      const year = await newYear();
      const before = await prisma.academic_years.findUniqueOrThrow({
        where: { id: BigInt(year.id) },
      });
      const value = field === 'name' ? body().name : 2100;
      const response = await update(year.id, { [field]: value });
      expect(response.status).toBe(200);
      const after = await prisma.academic_years.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(after).toEqual({
        ...before,
        [field]: value,
        updated_at: after.updated_at,
      });
    },
  );
  it('preserves empty update compatibility and allows clearing unprotected chronology', async () => {
    const year = await newYear();
    expect((await update(year.id, {})).status).toBe(200);
    const response = await update(year.id, { start_year: null });
    expect(response.status).toBe(200);
    expect(response.body.start_year).toBeNull();
  });
  it.each(['create', 'update'])(
    'rejects duplicate names atomically on %s',
    async (operation) => {
      const first = await newYear();
      const second = await newYear();
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ name: first.name }))
            : update(second.id, { name: first.name, start_year: 2101 }),
        409,
      );
    },
  );
  it('normalizes calendar dates to UTC days and supports clearing either endpoint', async () => {
    const response = await create(
      body({
        start_date: '2026-10-14T00:30:00+07:00',
        end_date: '2026-10-14T23:30:00-05:00',
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body.start_date).toBe('2026-10-13T00:00:00.000Z');
    expect(response.body.end_date).toBe('2026-10-15T00:00:00.000Z');
    const startCleared = await update(response.body.id, { start_date: null });
    expect(startCleared.status).toBe(200);
    expect(startCleared.body.start_date).toBeNull();
    const endCleared = await update(response.body.id, { end_date: null });
    expect(endCleared.status).toBe(200);
    expect(endCleared.body.end_date).toBeNull();
  });
  it('rechecks date order against the stored other endpoint', async () => {
    const year = await newYear(
      body({ start_date: '2026-10-14', end_date: '2026-10-16' }),
    );
    await rejected(
      () => update(year.id, { start_date: '2026-10-16T01:00:00Z' }),
      400,
    );
  });
  it('activating a new owned year replaces the prior owned active year', async () => {
    await noForeignActiveYear();
    const first = await newYear(body({ is_active: true }));
    const second = await newYear(body({ is_active: true }));
    expect((await read(first.id)).body.is_active).toBe(false);
    expect((await read(second.id)).body.is_active).toBe(true);
    expect(
      await prisma.academic_years.count({ where: { is_active: true } }),
    ).toBe(1);
  });
  it('switches activation by update and permits explicit deactivation', async () => {
    await noForeignActiveYear();
    const first = await newYear();
    const second = await newYear();
    expect((await update(first.id, { is_active: true })).status).toBe(200);
    expect((await update(second.id, { is_active: true })).status).toBe(200);
    expect((await read(first.id)).body.is_active).toBe(false);
    expect((await update(second.id, { is_active: false })).status).toBe(200);
    expect(
      await prisma.academic_years.count({ where: { is_active: true } }),
    ).toBe(0);
  });
  it('duplicate active creation rolls back the previous owned activation', async () => {
    await noForeignActiveYear();
    await newYear(body({ is_active: true }));
    const existing = await newYear();
    await rejected(
      () => create(body({ name: existing.name, is_active: true })),
      409,
    );
  });
  it('invalid date activation leaves the existing owned active year unchanged', async () => {
    await noForeignActiveYear();
    await newYear(body({ is_active: true }));
    const targetYear = await newYear();
    await rejected(
      () =>
        update(targetYear.id, {
          is_active: true,
          start_date: '2026-10-14',
          end_date: '2026-10-13',
        }),
      400,
    );
  });
  it('deletes an unused year with 204 and no response body', async () => {
    const year = await newYear();
    const response = await remove(year.id);
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await read(year.id)).status).toBe(404);
  });
  it.each([1, 2, 3, 4])(
    'protects independent year dependency fixture %s from deletion',
    async (index) => {
      await rejected(() => remove(String(f().years[index])), 409);
    },
  );
  it('preserves curriculum chronology while allowing a display rename', async () => {
    const id = String(f().years[4]);
    await rejected(() => update(id, { start_year: 2100 }), 409);
    const before = await state();
    expect((await update(id, { name: `${marker}-Ren` })).status).toBe(200);
    expect((await state()).revisions).toEqual(before.revisions);
  });
  const invalid: Array<[string, Record<string, unknown>]> = [
    ['empty name', { name: '' }],
    ['null name', { name: null }],
    ['numeric name', { name: 123 }],
    ['long name', { name: 'x'.repeat(21) }],
    ['low chronology', { start_year: 1899 }],
    ['high chronology', { start_year: 2201 }],
    ['fraction chronology', { start_year: 2094.5 }],
    ['string chronology', { start_year: '2094' }],
    ['string active', { is_active: 'true' }],
    ['numeric active', { is_active: 1 }],
    ['bad start date', { start_date: 'invalid' }],
    ['bad end date', { end_date: 'invalid' }],
    ['equal dates', { start_date: '2026-10-14', end_date: '2026-10-14' }],
    ['reversed dates', { start_date: '2026-10-14', end_date: '2026-10-13' }],
  ];
  it('requires a create name', async () => {
    const input: Record<string, unknown> = body();
    delete input.name;
    await rejected(() => create(input), 400);
  });
  it.each(invalid)('rejects create %s', async (_label, overrides) => {
    await rejected(() => create(body(overrides)), 400);
  });
  it.each(invalid)('rejects update %s', async (_label, overrides) => {
    const year = await newYear();
    await rejected(() => update(year.id, overrides), 400);
  });
  it('rejects null is_active on update', async () => {
    const year = await newYear();
    await rejected(() => update(year.id, { is_active: null }), 400);
  });
  it.each(['create', 'update'])(
    'rejects whitespace-only names on %s',
    async (operation) => {
      if (operation === 'create')
        await rejected(() => create(body({ name: ' \t ' })), 400);
      else {
        const year = await newYear();
        await rejected(() => update(year.id, { name: ' \t ' }), 400);
      }
    },
  );
  const impossibleDates = ['create', 'update'].flatMap((operation) =>
    ['start_date', 'end_date'].map((field) => ({ operation, field })),
  );
  it.each(impossibleDates)(
    'rejects impossible calendar day for $operation $field',
    async ({ operation, field }) => {
      const input = { [field]: '2026-02-30' };
      if (operation === 'create')
        await rejected(() => create(body(input)), 400);
      else {
        const year = await newYear();
        await rejected(() => update(year.id, input), 400);
      }
    },
  );
  const pathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '9223372036854775807', expected: 404 },
    { method, id: 'invalid-id', expected: 400 },
    { method, id: '9223372036854775808', expected: 400 },
  ]);
  it.each(pathCases)(
    'checks $method year ID $id',
    async ({ method, id, expected }) => {
      await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { name: `${marker}-Path` })
              : remove(id),
        expected,
      );
    },
  );

  // Step 19 regression cases; the original 87 cases above remain unchanged.
  it.each(['create', 'update'])(
    'trims a padded maximum-length name on %s',
    async (operation) => {
      const name = `${marker}-Trim`.padEnd(20, 'x');
      const response =
        operation === 'create'
          ? await create(body({ name: ` \t${name}\u00a0` }))
          : await update((await newYear()).id, { name: ` \t${name}\u00a0` });
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body.name).toBe(name);
    },
  );
  it.each(['create', 'update'])(
    'checks uniqueness after name trimming on %s',
    async (operation) => {
      const existing = await newYear();
      const targetYear = operation === 'update' ? await newYear() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ name: ` ${existing.name} ` }))
            : update(targetYear!.id, { name: ` ${existing.name} ` }),
        409,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects Unicode-whitespace-only names on %s',
    async (operation) => {
      const name = '\u00a0\u2003\u3000';
      const targetYear = operation === 'update' ? await newYear() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ name }))
            : update(targetYear!.id, { name }),
        400,
      );
      expect(response.body.message).toContain('name should not be empty');
    },
  );
  const mixedInvalidUpdates: Array<[string, Record<string, unknown>]> = [
    ['blank name', { name: ' \t ' }],
    ['null name', { name: null }],
    ['null active', { is_active: null }],
    ['impossible start', { start_date: '2026-02-30' }],
    ['impossible end', { end_date: '2026-02-30' }],
  ];
  it.each(mixedInvalidUpdates)(
    'rejects mixed %s update without changing owned activation/history',
    async (_label, overrides) => {
      await noForeignActiveYear();
      await newYear(body({ is_active: true }));
      const year = await newYear();
      await rejected(
        () =>
          update(year.id, {
            name: body().name,
            start_year: 2100,
            start_date: '2026-02-01',
            end_date: '2026-03-31',
            is_active: true,
            ...overrides,
          }),
        400,
      );
    },
  );
  const validCalendarCases = ['create', 'update'].flatMap((operation) =>
    [
      ['2024-02-29', '2024-02-29T00:00:00.000Z'],
      ['2000-02-29', '2000-02-29T00:00:00.000Z'],
      ['2026-10-14T10:30:00', '2026-10-14T00:00:00.000Z'],
    ].map(([date, stored]) => ({ operation, date, stored })),
  );
  it.each(validCalendarCases)(
    'preserves valid calendar date $date on $operation',
    async ({ operation, date, stored }) => {
      const response =
        operation === 'create'
          ? await create(body({ start_date: date }))
          : await update((await newYear()).id, { start_date: date });
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body.start_date).toBe(stored);
      expect(response.body.end_date).toBeNull();
    },
  );
  const invalidCalendarCases = ['create', 'update'].flatMap((operation) =>
    [
      '2025-02-29',
      '1900-02-29',
      '2026-04-31T12:30:00Z',
      '2026-02-30T23:30:00+07:00',
    ].map((date) => ({ operation, date })),
  );
  it.each(invalidCalendarCases)(
    'rejects impossible calendar date $date on $operation without writes',
    async ({ operation, date }) => {
      const targetYear = operation === 'update' ? await newYear() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ start_date: date }))
            : update(targetYear!.id, { start_date: date }),
        400,
      );
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('start_date')]),
      );
    },
  );
  it('clears nullable chronology/dates in the same valid update as a trimmed rename', async () => {
    const year = await newYear(
      body({ start_date: '2026-10-01', end_date: '2027-07-31' }),
    );
    const name = body().name;
    const response = await update(year.id, {
      name: ` ${name} `,
      start_year: null,
      start_date: null,
      end_date: null,
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name,
      start_year: null,
      start_date: null,
      end_date: null,
      is_active: false,
    });
  });
  const additionalPathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '-9223372036854775809', expected: 400 },
    { method, id: '-9223372036854775808', expected: 404 },
    { method, id: '9'.repeat(1000), expected: 400 },
    { method, id: '9007199254740993', expected: 404 },
  ]);
  it.each(additionalPathCases)(
    'checks additional $method ID bounds (expected $expected)',
    async ({ method, id, expected }) => {
      const response = await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { name: `${marker}-Bnd` })
              : remove(id),
        expected,
      );
      if (expected === 400)
        expect(response.body.message).toBe(
          'id must be between -9223372036854775808 and 9223372036854775807',
        );
    },
  );
  it.each(['GET', 'PUT', 'DELETE'])(
    'preserves leading-zero existing IDs on %s',
    async (method) => {
      const year = await newYear();
      const id = `000${year.id}`;
      const response =
        method === 'GET'
          ? await read(id)
          : method === 'PUT'
            ? await update(id, { name: body().name })
            : await remove(id);
      expect(response.status).toBe(method === 'DELETE' ? 204 : 200);
      if (method !== 'DELETE') expect(response.body.id).toBe(year.id);
      else expect((await read(year.id)).status).toBe(404);
    },
  );
  it('documents nullable fields, required values, path bounds and 400 responses', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const schemas = document.components!.schemas!;
    expect(schemas.CreateAcademicYearDto).toMatchObject({
      required: ['name'],
      properties: {
        name: { nullable: false, minLength: 1, maxLength: 20 },
        start_year: { nullable: true, minimum: 1900, maximum: 2200 },
        start_date: {
          nullable: true,
          description: expect.stringContaining('real ISO calendar date'),
        },
        end_date: {
          nullable: true,
          description: expect.stringContaining('real ISO calendar date'),
        },
        is_active: { type: 'boolean', nullable: true, default: false },
      },
    });
    const updateSchema = schemas.UpdateAcademicYearDto;
    if (!('properties' in updateSchema))
      throw new Error('Expected update schema properties');
    expect(updateSchema.required ?? []).toEqual([]);
    expect(updateSchema.properties).toMatchObject({
      name: { nullable: false },
      start_year: { nullable: true },
      start_date: { nullable: true },
      end_date: { nullable: true },
      is_active: { type: 'boolean', nullable: false },
    });
    for (const method of ['get', 'put', 'delete'] as const) {
      const operation = document.paths['/api/academic-years/{id}'][method]!;
      expect(operation.responses).toHaveProperty('400');
      expect(operation.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'id',
            in: 'path',
            required: true,
            description: expect.stringContaining(
              '-9223372036854775808 to 9223372036854775807',
            ),
            schema: expect.objectContaining({ type: 'string' }),
          }),
        ]),
      );
    }
    expect(
      document.paths['/api/academic-years'].post!.responses,
    ).toHaveProperty('400');
    expect(
      document.paths['/api/academic-years'].post!.responses['201'],
    ).toMatchObject({
      content: {
        'application/json': { schema: { example: { start_year: 2026 } } },
      },
    });
  });
});
