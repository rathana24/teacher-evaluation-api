import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Majors CRUD and permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let serial = 0;
  const marker = `E2E-MJ-${Date.now()}`;
  const ownedIds = new Set<bigint>();
  const tokens: Partial<Record<user_role, string>> = {};
  let fixtures:
    | {
        departments: bigint[];
        majors: bigint[];
        users: bigint[];
        year: bigint;
        generation: bigint;
        course: bigint;
        semester: bigint;
        offering: bigint;
        survey: bigint;
        version: bigint;
        evaluation: bigint;
      }
    | undefined;
  const f = () => fixtures!;
  const api = () => request(app.getHttpServer());
  const auth = (token = tokens.ADMIN!) => ({
    Authorization: `Bearer ${token}`,
  });
  const body = (overrides: Record<string, unknown> = {}) => ({
    code: `${marker}-${++serial}`,
    name: `${marker} Major ${serial}`,
    department_id: String(f().departments[0]),
    ...overrides,
  });
  const target = () => String(f().majors[0]);
  const ownedWhere = () => ({
    OR: [
      { id: { in: [...ownedIds] } },
      { code: { startsWith: marker } },
      { name: { startsWith: marker } },
    ],
  });
  async function create(input: Record<string, unknown> = body()) {
    const response = await api().post('/api/majors').set(auth()).send(input);
    if (response.status === 201 && typeof response.body.id === 'string')
      ownedIds.add(BigInt(response.body.id));
    return response;
  }
  async function newMajor(input = body()) {
    const response = await create(input);
    expect(response.status).toBe(201);
    return {
      id: response.body.id as string,
      code: response.body.code as string,
      name: response.body.name as string,
      department_id: response.body.department_id as string,
    };
  }
  const read = (id: string) => api().get(`/api/majors/${id}`).set(auth());
  const update = (id: string, input: object) =>
    api().put(`/api/majors/${id}`).set(auth()).send(input);
  const remove = (id: string) => api().delete(`/api/majors/${id}`).set(auth());

  function safeMajor(item: Record<string, any>, included = true) {
    expect(Object.keys(item).sort()).toEqual(
      [
        'id',
        'code',
        'name',
        'department_id',
        'created_at',
        'updated_at',
        ...(included ? ['departments', '_count'] : []),
      ].sort(),
    );
    expect(typeof item.id).toBe('string');
    expect(typeof item.department_id).toBe('string');
    expect(Number.isNaN(Date.parse(item.created_at))).toBe(false);
    expect(Number.isNaN(Date.parse(item.updated_at))).toBe(false);
    if (included) {
      expect(item.departments.id).toBe(item.department_id);
      expect(Object.keys(item.departments).sort()).toEqual(
        ['id', 'code', 'name', 'status', 'created_at', 'updated_at'].sort(),
      );
      expect(Object.keys(item._count).sort()).toEqual([
        'course_year_rules',
        'student_academic_records',
      ]);
    }
  }
  async function state() {
    const majors = await prisma.majors.findMany({
      where: ownedWhere(),
      orderBy: { id: 'asc' },
    });
    const ids = majors.map((item) => item.id);
    return {
      majors,
      departments: await prisma.departments.findMany({
        where: { id: { in: f().departments } },
        orderBy: { id: 'asc' },
      }),
      placements: await prisma.student_academic_records.findMany({
        where: { major_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      rules: await prisma.course_year_rules.findMany({
        where: { major_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      scopes: await prisma.course_offering_group_scopes.findMany({
        where: { major_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      targets: await prisma.evaluation_group_targets.findMany({
        where: { major_id: { in: ids } },
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
  async function cleanupMajors(keepBaseline: boolean) {
    if (!confirmed) return;
    await prisma.majors.deleteMany({
      where: {
        ...ownedWhere(),
        ...(keepBaseline && fixtures ? { id: { notIn: f().majors } } : {}),
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
        const departments: bigint[] = [];
        const majors: bigint[] = [];
        for (let index = 0; index < 3; index++) {
          const department = await tx.departments.create({
            data: {
              code: `${marker}-${index}`,
              name: `${marker} Department ${index}`,
              status: index === 2 ? 'INACTIVE' : 'ACTIVE',
            },
          });
          departments.push(department.id);
        }
        for (const label of ['Free', 'Placement', 'Rule', 'Scope', 'Target']) {
          const major = await tx.majors.create({
            data: {
              code: `${marker}-${label}`,
              name: `${marker} ${label}`,
              department_id: departments[0],
            },
          });
          majors.push(major.id);
        }
        const year = await tx.academic_years.create({
          data: {
            name: `MJ-${Date.now()}`,
            start_year: 2093,
            is_active: false,
          },
        });
        const generation = await tx.student_generations.create({
          data: { name: marker, entry_academic_year_id: year.id },
        });
        await tx.students.create({
          data: {
            user_id: users[2],
            student_code: marker.toLowerCase(),
            generation_id: generation.id,
            student_academic_records: {
              create: {
                academic_year_id: year.id,
                year_level: 1,
                major_id: majors[1],
                class_group: 'A',
              },
            },
          },
        });
        const course = await tx.courses.create({
          data: {
            course_code: marker,
            course_name: marker,
            department_id: departments[0],
            created_at: now,
            updated_at: now,
          },
        });
        await tx.course_year_rules.create({
          data: { course_id: course.id, major_id: majors[2], year_level: 1 },
        });
        const semester = await tx.semesters.create({
          data: {
            academic_year_id: year.id,
            semester_name: marker,
            semester_number: 1,
            created_at: now,
            updated_at: now,
          },
        });
        const offering = await tx.course_offerings.create({
          data: {
            course_id: course.id,
            lecturer_id: users[1],
            semester_id: semester.id,
            year_level: 1,
            class_type: 'TD',
            section_code: marker,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.course_offering_group_scopes.create({
          data: {
            course_offering_id: offering.id,
            academic_year_id: year.id,
            generation_id: generation.id,
            major_id: majors[3],
            year_level: 1,
            class_group: 'A',
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
            status: 'DRAFT',
            created_by: users[0],
            created_at: now,
          },
        });
        const evaluation = await tx.evaluations.create({
          data: {
            course_offering_id: offering.id,
            survey_version_id: version.id,
            status: 'DRAFT',
            created_by: users[0],
            created_at: now,
            updated_at: now,
          },
        });
        await tx.evaluation_group_targets.create({
          data: {
            evaluation_id: evaluation.id,
            academic_year_id: year.id,
            generation_id: generation.id,
            major_id: majors[4],
            year_level: 1,
            class_group: 'A',
            created_at: now,
          },
        });
        return {
          departments,
          majors,
          users,
          year: year.id,
          generation: generation.id,
          course: course.id,
          semester: semester.id,
          offering: offering.id,
          survey: survey.id,
          version: version.id,
          evaluation: evaluation.id,
        };
      },
      { timeout: 20000 },
    );
    f().majors.forEach((id) => ownedIds.add(id));
  }, 30000);

  afterEach(() => cleanupMajors(true));
  afterAll(async () => {
    try {
      if (confirmed) {
        if (fixtures)
          await prisma.$transaction(async (tx) => {
            const own = f();
            await tx.evaluation_group_targets.deleteMany({
              where: { evaluation_id: own.evaluation },
            });
            await tx.evaluations.delete({ where: { id: own.evaluation } });
            await tx.survey_versions.delete({ where: { id: own.version } });
            await tx.surveys.delete({ where: { id: own.survey } });
            await tx.course_offering_group_scopes.deleteMany({
              where: { course_offering_id: own.offering },
            });
            await tx.course_offerings.delete({ where: { id: own.offering } });
            await tx.course_year_rules.deleteMany({
              where: { course_id: own.course },
            });
            const students = await tx.students.findMany({
              where: { user_id: { in: own.users } },
              select: { id: true },
            });
            await tx.student_academic_records.deleteMany({
              where: {
                student_id: { in: students.map((student) => student.id) },
              },
            });
            await tx.students.deleteMany({
              where: { user_id: { in: own.users } },
            });
            await tx.majors.deleteMany({ where: ownedWhere() });
            await tx.courses.delete({ where: { id: own.course } });
            await tx.semesters.delete({ where: { id: own.semester } });
            await tx.student_generations.delete({
              where: { id: own.generation },
            });
            await tx.academic_years.delete({ where: { id: own.year } });
            await tx.departments.deleteMany({
              where: { id: { in: own.departments } },
            });
          });
        await prisma.users.deleteMany({
          where: { full_name: { startsWith: marker } },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it.each<user_role>(['ADMIN', 'LECTURER', 'STUDENT'])(
    '%s reads major lists and detail with safe department metadata',
    async (role) => {
      const before = await state();
      const list = await api().get('/api/majors').set(auth(tokens[role]));
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body)).toBe(true);
      list.body.forEach((item: Record<string, unknown>) => safeMajor(item));
      for (const id of f().majors)
        expect(list.body.map((item: { id: string }) => item.id)).toContain(
          String(id),
        );
      const detail = await api()
        .get(`/api/majors/${target()}`)
        .set(auth(tokens[role]));
      expect(detail.status).toBe(200);
      expect(detail.body).toEqual(
        list.body.find((item: { id: string }) => item.id === target()),
      );
      expect(await state()).toEqual(before);
    },
  );
  it('returns actual placement/rule counts while preserving the published count shape', async () => {
    for (const index of [1, 2, 3, 4]) {
      const response = await read(String(f().majors[index]));
      expect(response.status).toBe(200);
      expect(response.body._count).toEqual({
        student_academic_records: index === 1 ? 1 : 0,
        course_year_rules: index === 2 ? 1 : 0,
      });
    }
  });
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
              ? api().get('/api/majors')
              : route === 'detail'
                ? api().get(`/api/majors/${target()}`)
                : route === 'create'
                  ? api().post('/api/majors')
                  : route === 'update'
                    ? api().put(`/api/majors/${target()}`)
                    : api().delete(`/api/majors/${target()}`);
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
  it('creates from the frontend string-ID payload, uppercases code and trims name', async () => {
    const input = body();
    const response = await create({
      ...input,
      code: input.code.toLowerCase(),
      name: ` ${input.name} `,
    });
    expect(response.status).toBe(201);
    safeMajor(response.body);
    expect(response.body).toMatchObject({
      code: input.code,
      name: input.name,
      department_id: input.department_id,
      _count: { student_academic_records: 0, course_year_rules: 0 },
    });
    expect((await read(response.body.id)).body).toEqual(response.body);
  });
  it('accepts maximum code/name lengths with Khmer text', async () => {
    const response = await create(
      body({ code: marker.padEnd(30, 'X'), name: '\u1780'.repeat(150) }),
    );
    expect(response.status).toBe(201);
    expect(response.body.code).toHaveLength(30);
    expect(response.body.name).toHaveLength(150);
  });
  it('strips injected IDs, status and private fields', async () => {
    const response = await create(
      body({
        id: target(),
        status: 'INACTIVE',
        password_hash: 'injected',
        auth_version: 99,
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body.id).not.toBe(target());
    safeMajor(response.body);
  });
  it('retains the existing policy allowing an existing inactive department', async () => {
    const response = await create(
      body({ department_id: String(f().departments[2]) }),
    );
    expect(response.status).toBe(201);
    expect(response.body.departments.status).toBe('INACTIVE');
  });
  it('enforces code uniqueness globally after uppercasing', async () => {
    const first = await newMajor();
    await rejected(
      () =>
        create(
          body({
            code: first.code.toLowerCase(),
            department_id: String(f().departments[1]),
          }),
        ),
      409,
    );
  });
  it('enforces trimmed name uniqueness within a department', async () => {
    const first = await newMajor();
    await rejected(() => create(body({ name: ` ${first.name} ` })), 409);
  });
  it('allows the same name under another department', async () => {
    const first = await newMajor();
    const second = await newMajor(
      body({ name: first.name, department_id: String(f().departments[1]) }),
    );
    expect(second.name).toBe(first.name);
    expect(second.department_id).not.toBe(first.department_id);
  });
  it.each(['code', 'name', 'department_id'] as const)(
    'updates only %s',
    async (field) => {
      const existing = await newMajor();
      const before = await prisma.majors.findUniqueOrThrow({
        where: { id: BigInt(existing.id) },
      });
      const values = body({ department_id: String(f().departments[1]) });
      const next =
        field === 'department_id' ? values.department_id : values[field];
      const response = await update(existing.id, {
        [field]: field === 'code' ? String(next).toLowerCase() : next,
      });
      expect(response.status).toBe(200);
      safeMajor(response.body);
      const after = await prisma.majors.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(after).toEqual({
        ...before,
        [field]: field === 'department_id' ? BigInt(String(next)) : next,
        updated_at: after.updated_at,
      });
    },
  );
  it('preserves empty updates and unchanged code/name', async () => {
    const existing = await newMajor();
    expect((await update(existing.id, {})).status).toBe(200);
    expect((await update(existing.id, existing)).status).toBe(200);
  });
  it('rejects missing parent department without partially updating a major', async () => {
    const existing = await newMajor();
    await rejected(
      () => update(existing.id, body({ department_id: '9223372036854775807' })),
      404,
    );
  });
  it('rejects creation with a missing parent department without writes', async () => {
    await rejected(
      () => create(body({ department_id: '9223372036854775807' })),
      404,
    );
  });
  it('rejects a duplicate-code update atomically', async () => {
    const first = await newMajor();
    const second = await newMajor();
    await rejected(
      () =>
        update(second.id, {
          code: first.code.toLowerCase(),
          name: `${marker} Changed Name`,
        }),
      409,
    );
  });
  it('rejects reparenting when the destination already has the same major name', async () => {
    const first = await newMajor();
    const second = await newMajor(
      body({ name: first.name, department_id: String(f().departments[1]) }),
    );
    await rejected(
      () => update(second.id, { department_id: first.department_id }),
      409,
    );
  });
  it('deletes an unused major then returns 404', async () => {
    const existing = await newMajor();
    const response = await remove(existing.id);
    expect(response.status).toBe(200);
    safeMajor(response.body, false);
    expect(response.body).toMatchObject(existing);
    expect((await read(existing.id)).status).toBe(404);
  });
  it.each([1, 2, 3, 4])(
    'protects major dependency fixture %s from deletion',
    async (index) => {
      await rejected(() => remove(String(f().majors[index])), 409);
    },
  );
  const invalid: Array<[string, Record<string, unknown>]> = [
    ['empty code', { code: '' }],
    ['empty name', { name: '' }],
    ['null code', { code: null }],
    ['null name', { name: null }],
    ['null department', { department_id: null }],
    ['numeric code', { code: 123 }],
    ['numeric name', { name: 123 }],
    ['numeric department', { department_id: 1 }],
    ['long code', { code: 'x'.repeat(31) }],
    ['long name', { name: 'x'.repeat(151) }],
    ['code punctuation', { code: 'BAD.CODE' }],
    ['code spaces', { code: ' BAD ' }],
    ['department text', { department_id: 'abc' }],
    ['negative department', { department_id: '-1' }],
    ['fraction department', { department_id: '1.5' }],
    ['empty department', { department_id: '' }],
  ];
  it.each(['code', 'name', 'department_id'])(
    'requires create field %s',
    async (field) => {
      const input: Record<string, unknown> = body();
      delete input[field];
      await rejected(() => create(input), 400);
    },
  );
  it.each(invalid)('rejects create %s', async (_label, overrides) => {
    await rejected(() => create(body(overrides)), 400);
  });
  it.each(invalid)('rejects update %s', async (_label, overrides) => {
    const existing = await newMajor();
    await rejected(() => update(existing.id, overrides), 400);
  });
  it.each(['create', 'update'])(
    'rejects a whitespace-only major name on %s',
    async (operation) => {
      if (operation === 'create')
        await rejected(() => create(body({ name: ' \t ' })), 400);
      else {
        const existing = await newMajor();
        await rejected(() => update(existing.id, { name: ' \t ' }), 400);
      }
    },
  );
  it.each(['create', 'update'])(
    'rejects out-of-storage-range department_id on %s',
    async (operation) => {
      const input = body({ department_id: '9223372036854775808' });
      if (operation === 'create') await rejected(() => create(input), 400);
      else {
        const existing = await newMajor();
        await rejected(() => update(existing.id, input), 400);
      }
    },
  );
  const pathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '9223372036854775807', expected: 404 },
    { method, id: 'invalid-id', expected: 400 },
    { method, id: '9223372036854775808', expected: 400 },
  ]);
  it.each(pathCases)(
    'checks $method major ID $id',
    async ({ method, id, expected }) => {
      await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { name: `${marker} Path target` })
              : remove(id),
        expected,
      );
    },
  );

  it.each(['create', 'update'])(
    'accepts a normalized maximum-length name on %s',
    async (operation) => {
      const name = '\u1780'.repeat(150);
      const input = body({ name: ` \t${name}  ` });
      const response =
        operation === 'create'
          ? await create(input)
          : await update((await newMajor()).id, input);
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body.name).toBe(name);
    },
  );
  it.each(['code', 'name', 'department_id'])(
    'rejects mixed updates containing null %s without partial writes',
    async (field) => {
      const existing = await newMajor();
      const response = await rejected(
        () =>
          update(existing.id, {
            ...body({ department_id: String(f().departments[1]) }),
            [field]: null,
          }),
        400,
      );
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining(field)]),
      );
    },
  );
  it('rejects a mixed blank-name update without partial writes', async () => {
    const existing = await newMajor();
    const response = await rejected(
      () => update(existing.id, body({ name: ' \t ' })),
      400,
    );
    expect(response.body.message).toEqual(
      expect.arrayContaining(['name should not be empty']),
    );
  });
  const parentCases = ['create', 'update'].flatMap((operation) => [
    {
      operation,
      kind: 'leading zeros',
      status: operation === 'create' ? 201 : 200,
    },
    { operation, kind: 'zero absent', status: 404 },
    { operation, kind: 'large valid', status: 404 },
    { operation, kind: 'long overflow', status: 400 },
    { operation, kind: 'padded overflow', status: 400 },
  ]);
  it.each(parentCases)(
    'checks $operation department ID $kind',
    async ({ operation, kind, status }) => {
      const departmentId =
        kind === 'leading zeros'
          ? `000${f().departments[1]}`
          : kind === 'zero absent'
            ? '0'
            : kind === 'large valid'
              ? '9007199254740993'
              : kind === 'long overflow'
                ? '9'.repeat(1000)
                : '0009223372036854775808';
      const input = body({ department_id: departmentId });
      const existing = operation === 'update' ? await newMajor() : undefined;
      const perform = () =>
        operation === 'create' ? create(input) : update(existing!.id, input);
      const response =
        status >= 400 ? await rejected(perform, status) : await perform();
      expect(response.status).toBe(status);
      if (status < 400)
        expect(response.body.department_id).toBe(String(f().departments[1]));
      if (status === 400)
        expect(response.body.message).toEqual(
          expect.arrayContaining([
            'department_id must not exceed 9223372036854775807',
          ]),
        );
    },
  );
  const additionalPathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '-9223372036854775809', expected: 400 },
    { method, id: '-9223372036854775808', expected: 404 },
    { method, id: '9'.repeat(1000), expected: 400 },
  ]);
  it.each(additionalPathCases)(
    'checks signed path bounds on $method (expected $expected)',
    async ({ method, id, expected }) => {
      const response = await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { name: `${marker} Bound target` })
              : remove(id),
        expected,
      );
      if (expected === 400)
        expect(response.body.message).toBe(
          'id must be between -9223372036854775808 and 9223372036854775807',
        );
    },
  );
  it('documents major validation, optional updates, ID limits and 400 responses', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const schemas = document.components!.schemas!;
    expect(schemas.CreateMajorDto).toMatchObject({
      required: expect.arrayContaining(['code', 'name', 'department_id']),
      properties: {
        code: {
          nullable: false,
          minLength: 1,
          maxLength: 30,
          pattern: '^[A-Za-z0-9_-]+$',
        },
        name: { nullable: false, minLength: 1, maxLength: 150 },
        department_id: {
          type: 'string',
          nullable: false,
          minLength: 1,
          pattern: '^[0-9]+$',
          description: expect.stringContaining('9223372036854775807'),
        },
      },
    });
    const updateSchema = schemas.UpdateMajorDto;
    if (!('properties' in updateSchema))
      throw new Error('Expected update schema properties');
    expect(updateSchema.required ?? []).toEqual([]);
    expect(updateSchema.properties).toMatchObject({
      code: { nullable: false },
      name: { nullable: false },
      department_id: { nullable: false },
    });
    for (const method of ['get', 'put', 'delete'] as const) {
      const operation = document.paths['/api/majors/{id}'][method]!;
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
    expect(document.paths['/api/majors'].post!.responses).toHaveProperty('400');
  });
});
