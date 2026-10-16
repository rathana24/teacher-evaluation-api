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

describe('Course catalog CRUD boundaries and permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let serial = 0;
  const marker = `CC${Date.now()}`;
  const unsafeParent = 9007199254740992n;
  const ownedIds = new Set<bigint>();
  const tokens: Partial<Record<user_role, string>> = {};
  let originalCourses: unknown;
  let originalDepartments: unknown;
  let originalCourseIds: bigint[] = [];
  let originalDepartmentIds: bigint[] = [];
  let fixtures:
    | {
        users: bigint[];
        departments: bigint[];
        courses: bigint[];
        major: bigint;
        year: bigint;
        semester: bigint;
        offering: bigint;
        rule: bigint;
      }
    | undefined;
  const f = () => fixtures!;
  const api = () => request(app.getHttpServer());
  const auth = (token = tokens.ADMIN!) => ({
    Authorization: `Bearer ${token}`,
  });
  const target = () => String(f().courses[0]);
  const body = (overrides: Record<string, unknown> = {}) => ({
    course_code: `${marker}-${++serial}`,
    course_name: `${marker} Course ${serial}`,
    department_id: Number(f().departments[0]),
    ...overrides,
  });
  const ownedWhere = () => ({
    OR: [
      { id: { in: [...ownedIds] } },
      { course_code: { startsWith: marker } },
      ...(fixtures ? [{ department_id: { in: f().departments } }] : []),
    ],
  });
  const read = (id: string) => api().get(`/api/courses/${id}`).set(auth());
  const update = (id: string, input: object) =>
    api().put(`/api/courses/${id}`).set(auth()).send(input);
  const remove = (id: string) => api().delete(`/api/courses/${id}`).set(auth());
  async function track(operation: PromiseLike<request.Response>) {
    const response = await operation;
    if (response.status === 201 && typeof response.body.id === 'string')
      ownedIds.add(BigInt(response.body.id));
    return response;
  }
  const create = (input: Record<string, unknown> = body()) =>
    track(api().post('/api/courses').set(auth()).send(input));
  async function newCourse(input = body()) {
    const response = await create(input);
    expect(response.status).toBe(201);
    return {
      id: response.body.id as string,
      code: response.body.course_code as string,
      name: response.body.course_name as string,
    };
  }
  async function state() {
    return {
      courses: await prisma.courses.findMany({
        where: ownedWhere(),
        orderBy: { id: 'asc' },
      }),
      departments: await prisma.departments.findMany({
        where: { code: { startsWith: marker } },
        orderBy: { id: 'asc' },
      }),
      users: await prisma.users.findMany({
        where: { full_name: { startsWith: marker } },
        orderBy: { id: 'asc' },
      }),
      offerings: await prisma.course_offerings.findMany({
        where: { id: f().offering },
      }),
      rules: await prisma.course_year_rules.findMany({
        where: { id: f().rule },
      }),
      majors: await prisma.majors.findMany({ where: { id: f().major } }),
      semesters: await prisma.semesters.findMany({
        where: { id: f().semester },
      }),
      years: await prisma.academic_years.findMany({ where: { id: f().year } }),
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
  function safeCourse(value: Record<string, unknown>) {
    expect(Object.keys(value).sort()).toEqual(
      [
        'id',
        'course_code',
        'course_name',
        'description',
        'department_id',
        'created_at',
        'updated_at',
        'departments',
      ].sort(),
    );
    expect(typeof value.id).toBe('string');
    expect(typeof value.department_id).toBe('string');
    expect(Number.isNaN(Date.parse(value.created_at as string))).toBe(false);
    expect(Number.isNaN(Date.parse(value.updated_at as string))).toBe(false);
    expect(value.departments).toMatchObject({ id: value.department_id });
    expect(Object.keys(value.departments as object).sort()).toEqual(
      ['id', 'code', 'name', 'status', 'created_at', 'updated_at'].sort(),
    );
  }
  async function preserved() {
    expect(
      await prisma.courses.findMany({
        where: { id: { in: originalCourseIds } },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(originalCourses);
    expect(
      await prisma.departments.findMany({
        where: { id: { in: originalDepartmentIds } },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(originalDepartments);
  }
  async function cleanup(keepBaseline: boolean) {
    if (!confirmed) return;
    await prisma.courses.deleteMany({
      where: {
        ...ownedWhere(),
        ...(keepBaseline && fixtures ? { id: { notIn: f().courses } } : {}),
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
    const courses = await prisma.courses.findMany({ orderBy: { id: 'asc' } });
    const departments = await prisma.departments.findMany({
      orderBy: { id: 'asc' },
    });
    expect(
      departments.some((department) => department.id === unsafeParent),
    ).toBe(false);
    originalCourses = courses;
    originalDepartments = departments;
    originalCourseIds = courses.map((course) => course.id);
    originalDepartmentIds = departments.map((department) => department.id);
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
        for (let index = 0; index < 4; index++) {
          const department = await tx.departments.create({
            data: {
              ...(index === 3 ? { id: unsafeParent } : {}),
              code: `${marker}-D${index}`,
              name: `${marker} Department ${index}`,
              status: index === 2 ? 'INACTIVE' : 'ACTIVE',
            },
          });
          departments.push(department.id);
        }
        const courses: bigint[] = [];
        for (let index = 0; index < 4; index++) {
          const course = await tx.courses.create({
            data: {
              course_code: `${marker}-B${index}`,
              course_name: `${marker} Baseline ${index}`,
              department_id: departments[index === 3 ? 2 : 0],
              created_at: now,
              updated_at: now,
            },
          });
          courses.push(course.id);
        }
        const major = await tx.majors.create({
          data: { code: marker, name: marker, department_id: departments[0] },
        });
        const year = await tx.academic_years.create({
          data: { name: marker, start_year: 2098, is_active: false },
        });
        const semester = await tx.semesters.create({
          data: {
            semester_name: marker,
            semester_number: 1,
            academic_year_id: year.id,
            created_at: now,
            updated_at: now,
          },
        });
        const offering = await tx.course_offerings.create({
          data: {
            course_id: courses[1],
            lecturer_id: users[1],
            semester_id: semester.id,
            year_level: 1,
            class_type: 'COURSE',
            section_code: marker,
            created_at: now,
            updated_at: now,
          },
        });
        const rule = await tx.course_year_rules.create({
          data: { course_id: courses[2], major_id: major.id, year_level: 1 },
        });
        return {
          users,
          departments,
          courses,
          major: major.id,
          year: year.id,
          semester: semester.id,
          offering: offering.id,
          rule: rule.id,
        };
      },
      { timeout: 20000 },
    );
    f().courses.forEach((id) => ownedIds.add(id));
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
            await tx.course_offerings.delete({ where: { id: f().offering } });
            await tx.course_year_rules.delete({ where: { id: f().rule } });
            await tx.courses.deleteMany({ where: ownedWhere() });
            await tx.majors.delete({ where: { id: f().major } });
            await tx.semesters.delete({ where: { id: f().semester } });
            await tx.academic_years.delete({ where: { id: f().year } });
            await tx.departments.deleteMany({
              where: { id: { in: f().departments } },
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
    '%s reads list/detail with public department metadata and string IDs',
    async (role) => {
      const before = await state();
      const list = await api().get('/api/courses').set(auth(tokens[role]));
      expect(list.status).toBe(200);
      list.body.forEach((course: Record<string, unknown>) =>
        safeCourse(course),
      );
      for (const id of f().courses)
        expect(list.body.map((row: { id: string }) => row.id)).toContain(
          String(id),
        );
      const detail = await api()
        .get(`/api/courses/${target()}`)
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
              ? api().get('/api/courses')
              : route === 'detail'
                ? api().get(`/api/courses/${target()}`)
                : route === 'create'
                  ? api().post('/api/courses')
                  : route === 'update'
                    ? api().put(`/api/courses/${target()}`)
                    : api().delete(`/api/courses/${target()}`);
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
  it('creates the frontend course catalog payload', async () => {
    const input = body({ description: 'Synthetic course description' });
    const response = await create(input);
    expect(response.status).toBe(201);
    safeCourse(response.body);
    expect(response.body).toMatchObject({
      ...input,
      department_id: String(input.department_id),
    });
  });
  it.each(['omitted', 'null', 'empty'])(
    'supports %s description on create and strips injected fields',
    async (kind) => {
      const input: Record<string, unknown> = body({
        id: target(),
        password_hash: 'injected',
      });
      if (kind !== 'omitted') input.description = kind === 'null' ? null : '';
      const response = await create(input);
      expect(response.status).toBe(201);
      safeCourse(response.body);
      expect(response.body.id).not.toBe(target());
      expect(response.body.description).toBe(kind === 'empty' ? '' : null);
    },
  );
  it('accepts maximum-length code and Khmer course name', async () => {
    const response = await create(
      body({
        course_code: `${marker}-Max`.padEnd(30, 'x'),
        course_name: '\u1780'.repeat(150),
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body.course_code).toHaveLength(30);
    expect(response.body.course_name).toHaveLength(150);
  });
  it.each([
    'course_code',
    'course_name',
    'description',
    'department_id',
  ] as const)('partially updates only %s', async (field) => {
    const course = await newCourse();
    const before = await prisma.courses.findUniqueOrThrow({
      where: { id: BigInt(course.id) },
    });
    const value =
      field === 'department_id'
        ? Number(f().departments[1])
        : field === 'course_code'
          ? body().course_code
          : `${marker} Updated ${field}`;
    const response = await update(course.id, { [field]: value });
    expect(response.status).toBe(200);
    const after = await prisma.courses.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after).toEqual({
      ...before,
      [field]: field === 'department_id' ? BigInt(value) : value,
      updated_at: after.updated_at,
    });
  });
  it('supports empty updates without erasing other metadata', async () => {
    const course = await newCourse(body({ description: 'Keep this' }));
    const response = await update(course.id, {});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      course_code: course.code,
      course_name: course.name,
      description: 'Keep this',
      department_id: String(f().departments[0]),
    });
  });
  it.each(['text', 'null', 'empty'])(
    'supports a %s description update',
    async (kind) => {
      const course = await newCourse(body({ description: 'Original' }));
      const value =
        kind === 'text' ? 'New description' : kind === 'null' ? null : '';
      const response = await update(course.id, { description: value });
      expect(response.status).toBe(200);
      expect(response.body.description).toBe(value);
    },
  );
  it('preserves raw description spaces at the API boundary', async () => {
    const response = await create(
      body({ description: '  Deliberate description spaces  ' }),
    );
    expect(response.status).toBe(201);
    expect(response.body.description).toBe('  Deliberate description spaces  ');
  });
  it.each(['create', 'update'])(
    'enforces global course-code uniqueness on %s across departments',
    async (operation) => {
      const first = await newCourse();
      const second = operation === 'update' ? await newCourse() : undefined;
      const input = body({
        course_code: first.code,
        department_id: Number(f().departments[1]),
      });
      await rejected(
        () =>
          operation === 'create' ? create(input) : update(second!.id, input),
        409,
      );
    },
  );
  it('preserves case-sensitive course codes without automatic uppercasing', async () => {
    const first = await newCourse();
    const response = await create(
      body({ course_code: first.code.toLowerCase() }),
    );
    expect(response.status).toBe(201);
    expect(response.body.course_code).toBe(first.code.toLowerCase());
  });
  it('allows duplicate course names when course codes differ', async () => {
    const first = await newCourse();
    const response = await create(body({ course_name: first.name }));
    expect(response.status).toBe(201);
    expect(response.body.course_name).toBe(first.name);
  });
  it('preserves existing code characters and internal spaces', async () => {
    const code = `${marker} /_ a`;
    const response = await create(body({ course_code: code }));
    expect(response.status).toBe(201);
    expect(response.body.course_code).toBe(code);
  });
  it.each(['create', 'update'])(
    'rejects assigning an inactive department on %s',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ department_id: Number(f().departments[2]) }))
            : update(course!.id, { department_id: Number(f().departments[2]) }),
        400,
      );
      expect(response.body.message).toBe(
        'Cannot assign course to an inactive department',
      );
    },
  );
  it('permits legacy inactive-parent metadata edits only when the parent is omitted', async () => {
    const id = String(f().courses[3]);
    const response = await update(id, {
      course_name: `${marker} Legacy rename`,
    });
    expect(response.status).toBe(200);
    expect(response.body.department_id).toBe(String(f().departments[2]));
    await rejected(
      () =>
        update(id, {
          department_id: Number(f().departments[2]),
          course_name: `${marker} Blocked rename`,
        }),
      400,
    );
  });
  it.each(['create', 'update'])(
    'rejects an absent safe integer parent on %s',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const response = await rejected(
        () =>
          operation === 'create'
            ? create(body({ department_id: Number.MAX_SAFE_INTEGER }))
            : update(course!.id, { department_id: Number.MAX_SAFE_INTEGER }),
        400,
      );
      expect(response.body.message).toBe('Department not found');
    },
  );
  it('deletes an unused course with empty 204 and subsequent 404', async () => {
    const course = await newCourse();
    const response = await remove(course.id);
    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect((await read(course.id)).status).toBe(404);
  });
  it.each([1, 2])(
    'protects course dependency fixture %s from deletion',
    async (index) => {
      await rejected(() => remove(String(f().courses[index])), 409);
    },
  );
  it.each([1, 2])(
    'permits display changes on dependency fixture %s without rewriting offering/rule rows',
    async (index) => {
      const before = await state();
      const response = await update(String(f().courses[index]), {
        course_code: body().course_code,
        course_name: `${marker} Renamed ${index}`,
        description: 'Safe display metadata',
      });
      expect(response.status).toBe(200);
      const after = await state();
      expect(after.offerings).toEqual(before.offerings);
      expect(after.rules).toEqual(before.rules);
    },
  );
  const invalid: Array<[string, Record<string, unknown>]> = [
    ['empty code', { course_code: '' }],
    ['null code', { course_code: null }],
    ['numeric code', { course_code: 123 }],
    ['long code', { course_code: 'x'.repeat(31) }],
    ['empty name', { course_name: '' }],
    ['null name', { course_name: null }],
    ['numeric name', { course_name: 123 }],
    ['long name', { course_name: 'x'.repeat(151) }],
    ['numeric description', { description: 123 }],
    ['zero parent', { department_id: 0 }],
    ['negative parent', { department_id: -1 }],
    ['fraction parent', { department_id: 1.5 }],
    ['string parent', { department_id: '1' }],
    ['null parent', { department_id: null }],
  ];
  it.each(['course_name', 'department_id'])(
    'requires %s on create',
    async (field) => {
      const input: Record<string, unknown> = body();
      delete input[field];
      await rejected(() => create(input), 400);
    },
  );
  it('requires an idempotency key when course_code is omitted', async () => {
    const input: Record<string, unknown> = body();
    delete input.course_code;
    const response = await rejected(() => create(input), 400);
    expect(response.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });
  it.each(invalid)('rejects create %s', async (_label, overrides) => {
    await rejected(() => create(body(overrides)), 400);
  });
  it.each(invalid)('rejects update %s', async (_label, overrides) => {
    const course = await newCourse();
    await rejected(() => update(course.id, overrides), 400);
  });
  const blankCases = ['create', 'update'].flatMap((operation) =>
    ['course_code', 'course_name'].map((field) => ({ operation, field })),
  );
  it.each(blankCases)(
    'rejects whitespace-only $field on $operation',
    async ({ operation, field }) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ [field]: ' \t ' }))
            : update(course!.id, { [field]: ' \t ' }),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects oversized numeric parent on %s before Prisma',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      await rejected(
        () =>
          operation === 'create'
            ? create(body({ department_id: 1e30 }))
            : update(course!.id, { department_id: 1e30 }),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects unsafe raw JSON parent on %s rather than assigning another department',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const before = await state();
      const raw = JSON.stringify(
        body({ department_id: 'UNSAFE_PARENT' }),
      ).replace('"UNSAFE_PARENT"', '9007199254740993');
      const response = await (operation === 'create'
        ? track(
            api()
              .post('/api/courses')
              .set(auth())
              .set('Content-Type', 'application/json')
              .send(raw),
          )
        : api()
            .put(`/api/courses/${course!.id}`)
            .set(auth())
            .set('Content-Type', 'application/json')
            .send(raw));
      expect({
        status: response.status,
        department_id: response.body.department_id,
      }).toEqual({ status: 400, department_id: undefined });
      expect(await state()).toEqual(before);
    },
  );
  const pathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '9223372036854775807', expected: 404 },
    { method, id: 'invalid-id', expected: 400 },
    { method, id: '9223372036854775808', expected: 400 },
  ]);
  it.each(pathCases)(
    'checks $method course ID $id',
    async ({ method, id, expected }) => {
      await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { course_name: `${marker} Path` })
              : remove(id),
        expected,
      );
    },
  );

  it.each(['create', 'update'])(
    'trims outer code/name whitespace on %s while preserving case and internal characters',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const code = `${marker} /_ a`;
      const name = `${marker} Mixed  Case \u1780`;
      const input = body({
        course_code: ` \t${code}\n `,
        course_name: ` \n${name}\t `,
        description: '  Keep description spaces  ',
      });
      const response =
        operation === 'create'
          ? await create(input)
          : await update(course!.id, input);
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body).toMatchObject({
        course_code: code,
        course_name: name,
        description: '  Keep description spaces  ',
      });
      expect(
        await prisma.courses.findUniqueOrThrow({
          where: { id: BigInt(response.body.id) },
        }),
      ).toMatchObject({ course_code: code, course_name: name });
    },
  );
  it.each(['create', 'update'])(
    'accepts trimmed maximum lengths on %s',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const code = body().course_code.padEnd(30, 'x');
      const name = '\u1780'.repeat(150);
      const input = body({
        course_code: ` ${code} `,
        course_name: `\t${name}\n`,
      });
      const response =
        operation === 'create'
          ? await create(input)
          : await update(course!.id, input);
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body).toMatchObject({
        course_code: code,
        course_name: name,
      });
    },
  );
  const trimmedOverlength = ['create', 'update'].flatMap((operation) =>
    ['course_code', 'course_name'].map((field) => ({ operation, field })),
  );
  it.each(trimmedOverlength)(
    'rejects overlength $field after trimming on $operation',
    async ({ operation, field }) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const input = body({
        [field]: ` ${'x'.repeat(field === 'course_code' ? 31 : 151)} `,
      });
      await rejected(
        () =>
          operation === 'create' ? create(input) : update(course!.id, input),
        400,
      );
    },
  );
  it.each(['create', 'update'])(
    'rejects a duplicate course code after trimming on %s without writes',
    async (operation) => {
      const first = await newCourse();
      const second = operation === 'update' ? await newCourse() : undefined;
      const input = body({ course_code: ` \t${first.code} ` });
      const response = await rejected(
        () =>
          operation === 'create' ? create(input) : update(second!.id, input),
        409,
      );
      expect(response.body.message).toBe('course_code already exists');
    },
  );
  it.each(['create', 'update'])(
    'rejects the first unsafe numeric department ID on %s without writes',
    async (operation) => {
      const course = operation === 'update' ? await newCourse() : undefined;
      const input = body({ department_id: Number.MAX_SAFE_INTEGER + 1 });
      const response = await rejected(
        () =>
          operation === 'create' ? create(input) : update(course!.id, input),
        400,
      );
      expect(response.body.message).toContain(
        'department_id must not be greater than 9007199254740991',
      );
    },
  );
  const additionalPathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '-9223372036854775808', expected: 404 },
    { method, id: '-9223372036854775809', expected: 400 },
    { method, id: '9'.repeat(1000), expected: 400 },
    { method, id: '9007199254740993', expected: 404 },
  ]);
  it.each(additionalPathCases)(
    'checks additional $method course path bounds (expected $expected)',
    async ({ method, id, expected }) => {
      const response = await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { course_name: `${marker} Bound` })
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
    'preserves leading-zero existing course IDs on %s',
    async (method) => {
      const course = await newCourse();
      const id = `000${course.id}`;
      const response =
        method === 'GET'
          ? await read(id)
          : method === 'PUT'
            ? await update(id, { course_name: `${marker} Leading zero` })
            : await remove(id);
      expect(response.status).toBe(method === 'DELETE' ? 204 : 200);
      if (method !== 'DELETE') expect(response.body.id).toBe(course.id);
      else expect((await read(course.id)).status).toBe(404);
    },
  );
  it('documents safe numeric input, nullability, complete responses and path/dependency errors', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const schemas = document.components!.schemas!;
    expect(schemas.CreateCourseDto).toMatchObject({
      required: expect.arrayContaining([
        'course_name',
        'department_id',
      ]),
      properties: {
        course_code: { minLength: 1, maxLength: 30, nullable: false },
        course_name: { minLength: 1, maxLength: 150, nullable: false },
        department_id: {
          type: 'integer',
          minimum: 1,
          maximum: Number.MAX_SAFE_INTEGER,
          nullable: false,
        },
        description: { type: 'string', nullable: true },
      },
    });
    expect((schemas.CreateCourseDto as { required?: string[] }).required).not.toContain('course_code');
    const updateSchema = schemas.UpdateCourseDto;
    if (!('properties' in updateSchema))
      throw new Error('Expected update schema properties');
    expect(updateSchema.required ?? []).toEqual([]);
    expect(updateSchema.properties).toMatchObject({
      course_code: { minLength: 1, maxLength: 30, nullable: false },
      course_name: { minLength: 1, maxLength: 150, nullable: false },
      department_id: {
        type: 'integer',
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
        nullable: false,
      },
      description: { type: 'string', nullable: true },
    });
    for (const method of ['get', 'put', 'delete'] as const) {
      const operation = document.paths['/api/courses/{id}'][method]!;
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
    expect(document.paths['/api/courses'].post!.responses).toHaveProperty(
      '400',
    );
    expect(
      document.paths['/api/courses/{id}'].delete!.responses,
    ).toHaveProperty('409');
    expect(document.paths['/api/courses'].post!.responses['201']).toMatchObject(
      {
        content: {
          'application/json': {
            schema: {
              example: {
                department_id: '1',
                departments: {
                  id: '1',
                  code: 'CS',
                  name: 'Computer Science',
                  status: 'ACTIVE',
                  created_at: expect.any(String),
                  updated_at: expect.any(String),
                },
              },
            },
          },
        },
      },
    );
  });
});
