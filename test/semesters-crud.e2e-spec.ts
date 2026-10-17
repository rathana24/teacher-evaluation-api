import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { evaluation_status, user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Semester CRUD boundaries and permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let serial = 0;
  const marker = `SM${Date.now()}`;
  const unsafeParent = 9007199254740992n;
  const ownedIds = new Set<bigint>();
  const tokens: Partial<Record<user_role, string>> = {};
  let originalYears: unknown;
  let originalSemesters: unknown;
  let originalYearIds: bigint[] = [];
  let originalSemesterIds: bigint[] = [];
  let fixtures:
    | {
        users: bigint[];
        years: bigint[];
        semesters: bigint[];
        department: bigint;
        course: bigint;
        survey: bigint;
        version: bigint;
        offerings: bigint[];
        evaluations: bigint[];
      }
    | undefined;
  const f = () => fixtures!;
  const api = () => request(app.getHttpServer());
  const auth = (token = tokens.ADMIN!) => ({
    Authorization: `Bearer ${token}`,
  });
  const target = () => String(f().semesters[0]);
  const body = (overrides: Record<string, unknown> = {}) => ({
    semester_name: `${marker}-${++serial}`,
    semester_number: 1,
    academic_year_id: Number(f().years[1]),
    ...overrides,
  });
  const ownedWhere = () => ({
    OR: [
      { id: { in: [...ownedIds] } },
      { semester_name: { startsWith: marker } },
      ...(fixtures ? [{ academic_year_id: { in: f().years } }] : []),
    ],
  });
  const read = (id: string) => api().get(`/api/semesters/${id}`).set(auth());
  const update = (id: string, input: object) =>
    api().put(`/api/semesters/${id}`).set(auth()).send(input);
  const remove = (id: string) =>
    api().delete(`/api/semesters/${id}`).set(auth());
  async function track(operation: PromiseLike<request.Response>) {
    const response = await operation;
    if (response.status === 201 && typeof response.body.id === 'string')
      ownedIds.add(BigInt(response.body.id));
    return response;
  }
  const create = (input: Record<string, unknown> = body()) =>
    track(api().post('/api/semesters').set(auth()).send(input));
  async function newSemester(input = body()) {
    const response = await create(input);
    expect(response.status).toBe(201);
    return {
      id: response.body.id as string,
      name: response.body.semester_name as string,
    };
  }
  async function state() {
    return {
      semesters: await prisma.semesters.findMany({
        where: ownedWhere(),
        orderBy: { id: 'asc' },
      }),
      years: await prisma.academic_years.findMany({
        where: { name: { startsWith: marker } },
        orderBy: { id: 'asc' },
      }),
      users: await prisma.users.findMany({
        where: { full_name: { startsWith: marker } },
        orderBy: { id: 'asc' },
      }),
      offerings: await prisma.course_offerings.findMany({
        where: { id: { in: f().offerings } },
        orderBy: { id: 'asc' },
      }),
      evaluations: await prisma.evaluations.findMany({
        where: { id: { in: f().evaluations } },
        orderBy: { id: 'asc' },
      }),
      versions: await prisma.survey_versions.findMany({
        where: { id: f().version },
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
  function safeSemester(value: Record<string, unknown>) {
    expect(Object.keys(value).sort()).toEqual(
      [
        'id',
        'semester_name',
        'semester_number',
        'academic_year_id',
        'start_date',
        'end_date',
        'created_at',
        'updated_at',
        'academic_years',
      ].sort(),
    );
    expect(typeof value.id).toBe('string');
    expect(typeof value.academic_year_id).toBe('string');
    expect(Number.isNaN(Date.parse(value.created_at as string))).toBe(false);
    expect(Number.isNaN(Date.parse(value.updated_at as string))).toBe(false);
    expect(value.academic_years).toMatchObject({ id: value.academic_year_id });
    expect(Object.keys(value.academic_years as object).sort()).toEqual(
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
  }
  async function preserved() {
    expect(
      await prisma.academic_years.findMany({
        where: { id: { in: originalYearIds } },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(originalYears);
    expect(
      await prisma.semesters.findMany({
        where: { id: { in: originalSemesterIds } },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(originalSemesters);
  }
  async function cleanup(keepBaseline: boolean) {
    if (!confirmed) return;
    await prisma.semesters.deleteMany({
      where: {
        ...ownedWhere(),
        ...(keepBaseline && fixtures ? { id: { notIn: f().semesters } } : {}),
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
    expect(database.name).toBe(selectedTestDatabase());
    const years = await prisma.academic_years.findMany({
      orderBy: { id: 'asc' },
    });
    const semesters = await prisma.semesters.findMany({
      orderBy: { id: 'asc' },
    });
    // Never reuse or overwrite a pre-existing large-ID row for precision probes.
    expect(years.some((year) => year.id === unsafeParent)).toBe(false);
    originalYears = years;
    originalSemesters = semesters;
    originalYearIds = years.map((year) => year.id);
    originalSemesterIds = semesters.map((semester) => semester.id);
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
        for (let index = 0; index < 4; index++) {
          const year = await tx.academic_years.create({
            data: {
              ...(index === 3 ? { id: unsafeParent } : {}),
              name: `${marker}-Y${index}`,
              start_year: 2097,
              is_active: false,
            },
          });
          years.push(year.id);
        }
        const semesters: bigint[] = [];
        for (let index = 0; index < 6; index++) {
          const semester = await tx.semesters.create({
            data: {
              academic_year_id: years[0],
              semester_name: `${marker}-B${index}`,
              semester_number: index < 2 ? index + 1 : null,
              created_at: now,
              updated_at: now,
            },
          });
          semesters.push(semester.id);
        }
        const department = await tx.departments.create({
          data: { code: marker, name: marker },
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
        const survey = await tx.surveys.create({
          data: {
            title: marker,
            created_by: users[0],
            created_at: now,
            updated_at: now,
          },
        });
        const version = await tx.survey_versions.create({
          data: {
            survey_id: survey.id,
            version_no: 1,
            status: 'LOCKED',
            locked_at: now,
            created_by: users[0],
            created_at: now,
          },
        });
        const offerings: bigint[] = [];
        const evaluations: bigint[] = [];
        for (let index = 1; index < 5; index++) {
          const offering = await tx.course_offerings.create({
            data: {
              course_id: course.id,
              lecturer_id: users[1],
              semester_id: semesters[index],
              year_level: 1,
              class_type: 'COURSE',
              section_code: marker,
              created_at: now,
              updated_at: now,
            },
          });
          offerings.push(offering.id);
          if (index > 1) {
            const status = (['DRAFT', 'OPEN', 'CLOSED'] as evaluation_status[])[
              index - 2
            ];
            const evaluation = await tx.evaluations.create({
              data: {
                course_offering_id: offering.id,
                survey_version_id: version.id,
                status,
                created_by: users[0],
                created_at: now,
                updated_at: now,
              },
            });
            evaluations.push(evaluation.id);
          }
        }
        return {
          users,
          years,
          semesters,
          department: department.id,
          course: course.id,
          survey: survey.id,
          version: version.id,
          offerings,
          evaluations,
        };
      },
      { timeout: 20000 },
    );
    f().semesters.forEach((id) => ownedIds.add(id));
  }, 30000);
  afterEach(async () => {
    await cleanup(true);
    if (confirmed) await preserved();
  });
  afterAll(async () => {
    try {
      if (confirmed) {
        if (fixtures)
          await prisma.$transaction(async (tx) => {
            await tx.evaluations.deleteMany({
              where: { id: { in: f().evaluations } },
            });
            await tx.course_offerings.deleteMany({
              where: { id: { in: f().offerings } },
            });
            await tx.survey_versions.delete({ where: { id: f().version } });
            await tx.surveys.delete({ where: { id: f().survey } });
            await tx.semesters.deleteMany({ where: ownedWhere() });
            await tx.courses.delete({ where: { id: f().course } });
            await tx.departments.delete({ where: { id: f().department } });
            await tx.academic_years.deleteMany({
              where: { id: { in: f().years } },
            });
          });
        await prisma.users.deleteMany({
          where: { full_name: { startsWith: marker } },
        });
        await preserved();
      }
    } finally {
      await app?.close();
    }
  });

  it.each<user_role>(['ADMIN', 'LECTURER', 'STUDENT'])(
    '%s reads list/detail with stored classifications and string IDs',
    async (role) => {
      const before = await state();
      const list = await api().get('/api/semesters').set(auth(tokens[role]));
      expect(list.status).toBe(200);
      list.body.forEach((semester: Record<string, unknown>) =>
        safeSemester(semester),
      );
      for (const id of f().semesters)
        expect(list.body.map((row: { id: string }) => row.id)).toContain(
          String(id),
        );
      const detail = await api()
        .get(`/api/semesters/${target()}`)
        .set(auth(tokens[role]));
      expect(detail.status).toBe(200);
      expect(detail.body).toEqual(
        list.body.find((row: { id: string }) => row.id === target()),
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
              ? api().get('/api/semesters')
              : route === 'detail'
                ? api().get(`/api/semesters/${target()}`)
                : route === 'create'
                  ? api().post('/api/semesters')
                  : route === 'update'
                    ? api().put(`/api/semesters/${target()}`)
                    : api().delete(`/api/semesters/${target()}`);
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
  it.each([1, 2])(
    'creates frontend numeric payload with semester_number=%s',
    async (number) => {
      const input = body({
        semester_name: `Semester ${number}`,
        semester_number: number,
        start_date: '2026-10-01',
        end_date: '2027-02-28',
      });
      const response = await create(input);
      expect(response.status).toBe(201);
      safeSemester(response.body);
      expect(response.body).toMatchObject({
        semester_name: input.semester_name,
        semester_number: number,
        academic_year_id: String(input.academic_year_id),
      });
    },
  );
  it('defaults omitted dates to null and strips injected fields', async () => {
    const response = await create(
      body({ id: target(), password_hash: 'injected', auth_version: 99 }),
    );
    expect(response.status).toBe(201);
    safeSemester(response.body);
    expect(response.body.id).not.toBe(target());
    expect(response.body.start_date).toBeNull();
    expect(response.body.end_date).toBeNull();
  });
  it('accepts a maximum-length Khmer semester name', async () => {
    const response = await create(body({ semester_name: '\u1780'.repeat(50) }));
    expect(response.status).toBe(201);
    expect(response.body.semester_name).toHaveLength(50);
  });
  it.each(['semester_name', 'semester_number', 'academic_year_id'] as const)(
    'partially updates only %s',
    async (field) => {
      const semester = await newSemester();
      const before = await prisma.semesters.findUniqueOrThrow({
        where: { id: BigInt(semester.id) },
      });
      const value =
        field === 'semester_name'
          ? body().semester_name
          : field === 'semester_number'
            ? 2
            : Number(f().years[2]);
      const response = await update(semester.id, { [field]: value });
      expect(response.status).toBe(200);
      const after = await prisma.semesters.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(after).toEqual({
        ...before,
        [field]: field === 'academic_year_id' ? BigInt(value) : value,
        updated_at: after.updated_at,
      });
    },
  );
  it('allows an empty update while preserving historical unknown semester number', async () => {
    const id = String(f().semesters[5]);
    expect((await update(id, {})).status).toBe(200);
    const response = await update(id, { semester_name: `${marker}-Legacy` });
    expect(response.status).toBe(200);
    expect(response.body.semester_number).toBeNull();
  });
  it('rejects clearing a known semester number without changing it', async () => {
    const semester = await newSemester();
    const response = await rejected(
      () => update(semester.id, { semester_number: null }),
      400,
    );
    expect(response.body.code).toBe('SEMESTER_NUMBER_REQUIRED');
  });
  it('accepts null for a historical semester whose number is already unknown', async () => {
    const id = String(f().semesters[5]);
    const response = await update(id, { semester_number: null });
    expect(response.status).toBe(200);
    expect(response.body.semester_number).toBeNull();
  });
  it.each(['name', 'number'])(
    'rejects a duplicate %s within one year on create',
    async (field) => {
      const first = await newSemester();
      await rejected(
        () =>
          create(
            body({
              semester_name:
                field === 'name' ? first.name : body().semester_name,
              semester_number: field === 'number' ? 1 : 2,
            }),
          ),
        409,
      );
    },
  );
  it.each(['name', 'number'])(
    'rejects a duplicate %s within one year on update without partial writes',
    async (field) => {
      const first = await newSemester();
      const second = await newSemester(body({ semester_number: 2 }));
      await rejected(
        () =>
          update(
            second.id,
            field === 'name'
              ? { semester_name: first.name, start_date: '2026-10-01' }
              : { semester_number: 1, start_date: '2026-10-01' },
          ),
        409,
      );
    },
  );
  it('allows the same name and number in different academic years', async () => {
    const first = await newSemester();
    const response = await create(
      body({
        semester_name: first.name,
        academic_year_id: Number(f().years[2]),
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body.academic_year_id).toBe(String(f().years[2]));
  });
  it('rejects moving a semester into an occupied year-number context', async () => {
    const semester = await newSemester();
    await rejected(
      () => update(semester.id, { academic_year_id: Number(f().years[0]) }),
      409,
    );
  });
  it('normalizes offsets to UTC days and permits nullable date clearing', async () => {
    const semester = await newSemester(
      body({
        start_date: '2026-10-14T00:30:00+07:00',
        end_date: '2026-10-14T23:30:00-05:00',
      }),
    );
    const readBack = await read(semester.id);
    expect(readBack.body.start_date).toBe('2026-10-13T00:00:00.000Z');
    expect(readBack.body.end_date).toBe('2026-10-15T00:00:00.000Z');
    const cleared = await update(semester.id, {
      start_date: null,
      end_date: null,
    });
    expect(cleared.status).toBe(200);
    expect(cleared.body.start_date).toBeNull();
    expect(cleared.body.end_date).toBeNull();
  });
  it('accepts valid leap days and offsetless ISO datetimes', async () => {
    const semester = await newSemester(
      body({ start_date: '2024-02-29', end_date: '2024-03-01T10:30:00' }),
    );
    const response = await read(semester.id);
    expect(response.body.start_date).toBe('2024-02-29T00:00:00.000Z');
    expect(response.body.end_date).toBe('2024-03-01T00:00:00.000Z');
  });
  it('checks a partial date update against the stored other endpoint', async () => {
    const semester = await newSemester(
      body({ start_date: '2026-10-14', end_date: '2026-10-16' }),
    );
    await rejected(
      () => update(semester.id, { start_date: '2026-10-16' }),
      400,
    );
  });
  it('deletes an unused semester with bodyless 204 and subsequent 404', async () => {
    const semester = await newSemester();
    const response = await remove(semester.id);
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await read(semester.id)).status).toBe(404);
  });
  it('protects a semester referenced by a course offering from deletion', async () => {
    await rejected(() => remove(String(f().semesters[1])), 409);
  });
  it('permits a year move for an offering semester with no evaluation', async () => {
    const before = await state();
    const response = await update(String(f().semesters[1]), {
      academic_year_id: Number(f().years[2]),
    });
    expect(response.status).toBe(200);
    expect(response.body.academic_year_id).toBe(String(f().years[2]));
    expect((await state()).offerings).toEqual(before.offerings);
  });
  it.each(['DRAFT', 'OPEN', 'CLOSED'])(
    'protects the academic year of a %s evaluated semester',
    async (_status) => {
      const index = ['DRAFT', 'OPEN', 'CLOSED'].indexOf(_status) + 2;
      const response = await rejected(
        () =>
          update(String(f().semesters[index]), {
            academic_year_id: Number(f().years[2]),
          }),
        409,
      );
      expect(response.body.code).toBe('SEMESTER_HISTORY_PROTECTED');
    },
  );
  it.each(['DRAFT', 'OPEN', 'CLOSED'])(
    'allows display metadata and identical year IDs for a %s evaluated semester',
    async (status) => {
      const index = ['DRAFT', 'OPEN', 'CLOSED'].indexOf(status) + 2;
      const before = await state();
      const response = await update(String(f().semesters[index]), {
        semester_name: `${marker}-${status}`,
        academic_year_id: Number(f().years[0]),
      });
      expect(response.status).toBe(200);
      const after = await state();
      expect(after.offerings).toEqual(before.offerings);
      expect(after.evaluations).toEqual(before.evaluations);
      expect(after.versions).toEqual(before.versions);
    },
  );
  it('supports rereading existing Semester 1 before creating only missing Semester 2', async () => {
    const first = await newSemester(body({ semester_name: 'Semester 1' }));
    const original = await prisma.semesters.findUniqueOrThrow({
      where: { id: BigInt(first.id) },
    });
    const list = await api().get('/api/semesters').set(auth());
    const own = list.body.filter(
      (row: { academic_year_id: string }) =>
        row.academic_year_id === String(f().years[1]),
    );
    expect(
      own.map((row: { semester_number: number }) => row.semester_number),
    ).toEqual([1]);
    const second = await newSemester(
      body({ semester_name: 'Semester 2', semester_number: 2 }),
    );
    const retryList = await api().get('/api/semesters').set(auth());
    expect(
      retryList.body
        .filter(
          (row: { academic_year_id: string }) =>
            row.academic_year_id === String(f().years[1]),
        )
        .map((row: { id: string }) => row.id),
    ).toEqual([first.id, second.id]);
    expect(
      await prisma.semesters.findUniqueOrThrow({ where: { id: original.id } }),
    ).toEqual(original);
  });

  const invalid: Array<[string, Record<string, unknown>]> = [
    ['empty name', { semester_name: '' }],
    ['null name', { semester_name: null }],
    ['numeric name', { semester_name: 123 }],
    ['long name', { semester_name: 'x'.repeat(51) }],
    ['zero parent', { academic_year_id: 0 }],
    ['negative parent', { academic_year_id: -1 }],
    ['fraction parent', { academic_year_id: 1.5 }],
    ['string parent', { academic_year_id: '1' }],
    ['null parent', { academic_year_id: null }],
    ['low number', { semester_number: 0 }],
    ['high number', { semester_number: 3 }],
    ['fraction number', { semester_number: 1.5 }],
    ['string number', { semester_number: '1' }],
    ['bad start date', { start_date: 'invalid' }],
    ['bad end date', { end_date: 'invalid' }],
    ['equal dates', { start_date: '2026-10-14', end_date: '2026-10-14' }],
    ['reversed dates', { start_date: '2026-10-14', end_date: '2026-10-13' }],
  ];
  it.each(['semester_name', 'academic_year_id', 'semester_number'])(
    'requires %s on create',
    async (field) => {
      const input: Record<string, unknown> = body();
      delete input[field];
      await rejected(() => create(input), 400);
    },
  );
  it('rejects a null semester number on create', async () => {
    await rejected(() => create(body({ semester_number: null })), 400);
  });
  it.each(invalid)('rejects create %s', async (_label, overrides) => {
    await rejected(() => create(body(overrides)), 400);
  });
  it.each(invalid)('rejects update %s', async (_label, overrides) => {
    const semester = await newSemester();
    await rejected(() => update(semester.id, overrides), 400);
  });
  it.each(['create', 'update'])(
    'rejects whitespace-only names on %s',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ semester_name: ' \t ' }))
            : update(semester!.id, { semester_name: ' \t ' }),
        400,
      );
    },
  );
  const impossibleDates = ['create', 'update'].flatMap((operation) =>
    ['start_date', 'end_date'].map((field) => ({ operation, field })),
  );
  it.each(impossibleDates)(
    'rejects impossible $field on $operation',
    async ({ operation, field }) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ [field]: '2026-02-30' }))
            : update(semester!.id, { [field]: '2026-02-30' }),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects an absent safe integer parent on %s',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ academic_year_id: Number.MAX_SAFE_INTEGER }))
            : update(semester!.id, {
                academic_year_id: Number.MAX_SAFE_INTEGER,
              }),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects oversized numeric parent on %s before Prisma encoding',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ academic_year_id: 1e30 }))
            : update(semester!.id, { academic_year_id: 1e30 }),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects an unsafe JSON integer parent on %s rather than attaching a different year',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      // Raw JSON retains the odd integer before body-parser rounds it to the
      // deliberately owned even-ID year; validation must reject unsafe numbers.
      const raw = JSON.stringify(
        body({ academic_year_id: 'UNSAFE_PARENT' }),
      ).replace('"UNSAFE_PARENT"', '9007199254740993');
      const before = await state();
      const response = await (operation === 'create'
        ? track(
            api()
              .post('/api/semesters')
              .set(auth())
              .set('Content-Type', 'application/json')
              .send(raw),
          )
        : api()
            .put(`/api/semesters/${semester!.id}`)
            .set(auth())
            .set('Content-Type', 'application/json')
            .send(raw));
      expect({
        status: response.status,
        academic_year_id: response.body.academic_year_id,
      }).toEqual({ status: 400, academic_year_id: undefined });
      expect(await state()).toEqual(before);
    },
  );
  const pathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '9223372036854775807', expected: 404 },
    { method, id: 'invalid-id', expected: 400 },
    { method, id: '9223372036854775808', expected: 400 },
  ]);
  it.each(pathCases)(
    'checks $method semester ID $id',
    async ({ method, id, expected }) => {
      await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { semester_name: `${marker}-Path` })
              : remove(id),
        expected,
      );
    },
  );

  // Step 21 regression cases; the original 106 cases above remain unchanged.
  it.each(['create', 'update'])(
    'trims a padded maximum-length name on %s',
    async (operation) => {
      const name = `${marker}-Trim`.padEnd(50, 'x');
      const response =
        operation === 'create'
          ? await create(body({ semester_name: ` \t${name}\u00a0` }))
          : await update((await newSemester()).id, {
              semester_name: ` \t${name}\u00a0`,
            });
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body.semester_name).toBe(name);
    },
  );
  it.each(['create', 'update'])(
    'checks per-year name uniqueness after trimming on %s',
    async (operation) => {
      const first = await newSemester();
      const second =
        operation === 'update'
          ? await newSemester(body({ semester_number: 2 }))
          : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(
                body({ semester_name: ` ${first.name} `, semester_number: 2 }),
              )
            : update(second!.id, { semester_name: ` ${first.name} ` }),
        409,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects Unicode-whitespace-only names on %s',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ semester_name: '\u00a0\u2003\u3000' }))
            : update(semester!.id, { semester_name: '\u00a0\u2003\u3000' }),
        400,
      );
      expect(response.body.message).toContain(
        'semester_name should not be empty',
      );
    },
  );
  const mixedInvalidUpdates: Array<[string, Record<string, unknown>]> = [
    ['blank name', { semester_name: ' \t ' }],
    ['null name', { semester_name: null }],
    ['null parent', { academic_year_id: null }],
    ['unsafe parent', { academic_year_id: Number.MAX_SAFE_INTEGER + 1 }],
    ['impossible start', { start_date: '2026-02-30' }],
    ['impossible end', { end_date: '2026-02-30' }],
  ];
  it.each(mixedInvalidUpdates)(
    'rejects mixed %s updates without committing valid companion changes',
    async (_label, overrides) => {
      const semester = await newSemester();
      await rejected(
        () =>
          update(semester.id, {
            semester_name: body().semester_name,
            semester_number: 2,
            academic_year_id: Number(f().years[2]),
            start_date: '2026-02-01',
            end_date: '2026-03-31',
            ...overrides,
          }),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'accepts the maximum safe integer as an absent parent lookup on %s',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ academic_year_id: Number.MAX_SAFE_INTEGER }))
            : update(semester!.id, {
                academic_year_id: Number.MAX_SAFE_INTEGER,
              }),
        400,
      );
      expect(response.body.message).toBe('Academic year not found');
    },
  );
  it.each(['create', 'update'])(
    'rejects the adjacent unsafe numeric parent on %s at field validation',
    async (operation) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ academic_year_id: Number.MAX_SAFE_INTEGER + 1 }))
            : update(semester!.id, {
                academic_year_id: Number.MAX_SAFE_INTEGER + 1,
              }),
        400,
      );
      expect(response.body.message).toContain(
        'academic_year_id must not be greater than 9007199254740991',
      );
    },
  );
  const validCalendarCases = ['create', 'update'].flatMap((operation) =>
    [
      ['2000-02-29', '2000-02-29T00:00:00.000Z'],
      ['2024-02-29T00:30:00+07:00', '2024-02-28T00:00:00.000Z'],
      ['2026-10-14T10:30:00', '2026-10-14T00:00:00.000Z'],
    ].map(([date, stored]) => ({ operation, date, stored })),
  );
  it.each(validCalendarCases)(
    'accepts valid calendar $date on $operation',
    async ({ operation, date, stored }) => {
      const response =
        operation === 'create'
          ? await create(body({ start_date: date }))
          : await update((await newSemester()).id, { start_date: date });
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body.start_date).toBe(stored);
      expect(response.body.end_date).toBeNull();
    },
  );
  const invalidCalendarCases = ['create', 'update'].flatMap((operation) =>
    [
      '1900-02-29',
      '2025-02-29',
      '2026-04-31T12:30:00Z',
      '2026-02-30T23:30:00+07:00',
    ].map((date) => ({ operation, date })),
  );
  it.each(invalidCalendarCases)(
    'rejects impossible calendar $date on $operation without writes',
    async ({ operation, date }) => {
      const semester = operation === 'update' ? await newSemester() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ start_date: date }))
            : update(semester!.id, { start_date: date }),
        400,
      );
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('start_date')]),
      );
    },
  );
  it('clears nullable dates in the same update as a trimmed rename', async () => {
    const semester = await newSemester(
      body({ start_date: '2026-10-01', end_date: '2027-02-28' }),
    );
    const name = body().semester_name;
    const response = await update(semester.id, {
      semester_name: ` ${name} `,
      start_date: null,
      end_date: null,
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      semester_name: name,
      semester_number: 1,
      start_date: null,
      end_date: null,
      academic_year_id: String(f().years[1]),
    });
  });
  const additionalPathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '-9223372036854775809', expected: 400 },
    { method, id: '-9223372036854775808', expected: 404 },
    { method, id: '9'.repeat(1000), expected: 400 },
    { method, id: '9007199254740993', expected: 404 },
  ]);
  it.each(additionalPathCases)(
    'checks additional $method path bounds (expected $expected)',
    async ({ method, id, expected }) => {
      const response = await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { semester_name: `${marker}-Bnd` })
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
    'preserves leading-zero existing path IDs on %s',
    async (method) => {
      const semester = await newSemester();
      const id = `000${semester.id}`;
      const response =
        method === 'GET'
          ? await read(id)
          : method === 'PUT'
            ? await update(id, { semester_name: body().semester_name })
            : await remove(id);
      expect(response.status).toBe(method === 'DELETE' ? 204 : 200);
      if (method !== 'DELETE') expect(response.body.id).toBe(semester.id);
      else expect((await read(semester.id)).status).toBe(404);
    },
  );
  it('documents numeric safe bounds, nullability, complete response examples and path errors', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const schemas = document.components!.schemas!;
    expect(schemas.CreateSemesterDto).toMatchObject({
      required: expect.arrayContaining([
        'semester_name',
        'semester_number',
        'academic_year_id',
      ]),
      properties: {
        semester_name: { nullable: false, minLength: 1, maxLength: 50 },
        academic_year_id: {
          type: 'integer',
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
          nullable: false,
        },
        semester_number: {
          type: 'integer',
          minimum: 1,
          maximum: 2,
          nullable: false,
        },
        start_date: {
          nullable: true,
          description: expect.stringContaining('real ISO calendar date'),
        },
        end_date: {
          nullable: true,
          description: expect.stringContaining('real ISO calendar date'),
        },
      },
    });
    const updateSchema = schemas.UpdateSemesterDto;
    if (!('properties' in updateSchema))
      throw new Error('Expected update schema properties');
    expect(updateSchema.required ?? []).toEqual([]);
    expect(updateSchema.properties).toMatchObject({
      semester_name: { nullable: false, minLength: 1, maxLength: 50 },
      academic_year_id: {
        type: 'integer',
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
        nullable: false,
      },
      semester_number: {
        type: 'integer',
        minimum: 1,
        maximum: 2,
        nullable: true,
      },
      start_date: { nullable: true },
      end_date: { nullable: true },
    });
    for (const method of ['get', 'put', 'delete'] as const) {
      const operation = document.paths['/api/semesters/{id}'][method]!;
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
    expect(document.paths['/api/semesters'].post!.responses).toHaveProperty(
      '400',
    );
    expect(
      document.paths['/api/semesters'].post!.responses['201'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: {
              semester_number: 1,
              academic_year_id: '1',
              academic_years: {
                start_year: 2026,
                created_at: expect.any(String),
                updated_at: expect.any(String),
              },
            },
          },
        },
      },
    });
  });
});
