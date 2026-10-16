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

describe('Departments CRUD and permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let serial = 0;
  const marker = `E2E-DP-${Date.now()}`;
  const ownedIds = new Set<bigint>();
  let fixtures:
    | {
        free: bigint;
        courses: bigint;
        members: bigint;
        majors: bigint;
        users: bigint[];
      }
    | undefined;
  const tokens: Partial<Record<user_role, string>> = {};
  const api = () => request(app.getHttpServer());
  const authorization = (token = tokens.ADMIN!) => ({
    Authorization: `Bearer ${token}`,
  });
  const body = (overrides: Record<string, unknown> = {}) => {
    const suffix = ++serial;
    return {
      code: `${marker}-${suffix}`,
      name: `${marker} Synthetic ${suffix}`,
      ...overrides,
    };
  };
  const target = () => fixtures!.free.toString();
  const ownedWhere = () => ({
    OR: [
      { id: { in: [...ownedIds] } },
      { code: { startsWith: marker } },
      { name: { startsWith: marker } },
    ],
  });
  async function create(input: Record<string, unknown> = body()) {
    const response = await api()
      .post('/api/departments')
      .set(authorization())
      .send(input);
    // Track successful writes before assertions so a rejected-input defect cannot leak fixtures.
    if (response.status === 201 && typeof response.body.id === 'string')
      ownedIds.add(BigInt(response.body.id));
    return response;
  }
  async function newDepartment(input = body()) {
    const response = await create(input);
    expect(response.status).toBe(201);
    return {
      id: response.body.id as string,
      code: response.body.code as string,
      name: response.body.name as string,
      status: response.body.status as string,
    };
  }
  const update = (id: string, input: object) =>
    api().put(`/api/departments/${id}`).set(authorization()).send(input);
  const remove = (id: string) =>
    api().delete(`/api/departments/${id}`).set(authorization());
  const read = (id: string) =>
    api().get(`/api/departments/${id}`).set(authorization());

  function safeDepartment(value: Record<string, unknown>, counts = true) {
    expect(Object.keys(value).sort()).toEqual(
      [
        'id',
        'code',
        'name',
        'status',
        'created_at',
        'updated_at',
        ...(counts ? ['_count'] : []),
      ].sort(),
    );
    expect(typeof value.id).toBe('string');
    expect(Number.isNaN(Date.parse(value.created_at as string))).toBe(false);
    expect(Number.isNaN(Date.parse(value.updated_at as string))).toBe(false);
  }
  async function state() {
    const departments = await prisma.departments.findMany({
      where: ownedWhere(),
      orderBy: { id: 'asc' },
    });
    const ids = departments.map((department) => department.id);
    return {
      departments,
      courses: await prisma.courses.findMany({
        where: { department_id: { in: ids } },
        orderBy: { id: 'asc' },
      }),
      memberships: await prisma.user_departments.findMany({
        where: { department_id: { in: ids } },
        orderBy: { department_id: 'asc' },
      }),
      majors: await prisma.majors.findMany({
        where: { department_id: { in: ids } },
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
  async function cleanup(keepBaseline: boolean) {
    if (!confirmed) return;
    const keep =
      keepBaseline && fixtures
        ? [fixtures.free, fixtures.courses, fixtures.members, fixtures.majors]
        : [];
    const rows = await prisma.departments.findMany({
      where: { ...ownedWhere(), id: { notIn: keep } },
      select: { id: true },
    });
    const ids = rows.map((row) => row.id);
    await prisma.$transaction(async (tx) => {
      await tx.user_departments.deleteMany({
        where: { department_id: { in: ids } },
      });
      await tx.courses.deleteMany({ where: { department_id: { in: ids } } });
      await tx.majors.deleteMany({ where: { department_id: { in: ids } } });
      await tx.departments.deleteMany({ where: { id: { in: ids } } });
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
    const ids: bigint[] = [];
    for (const label of ['Free', 'Courses', 'Members', 'Majors']) {
      const department = await prisma.departments.create({
        data: { code: `${marker}-${label}`, name: `${marker} ${label}` },
      });
      ids.push(department.id);
      ownedIds.add(department.id);
    }
    fixtures = {
      free: ids[0],
      courses: ids[1],
      members: ids[2],
      majors: ids[3],
      users,
    };
    await prisma.courses.create({
      data: {
        course_code: `${marker}-C`,
        course_name: `${marker} Course`,
        department_id: ids[1],
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await prisma.user_departments.create({
      data: { user_id: users[1], department_id: ids[2], is_primary: true },
    });
    await prisma.majors.create({
      data: {
        code: `${marker}-M`,
        name: `${marker} Major`,
        department_id: ids[3],
      },
    });
  }, 30000);

  afterEach(() => cleanup(true));
  afterAll(async () => {
    try {
      await cleanup(false);
      if (confirmed)
        await prisma.users.deleteMany({
          where: { full_name: { startsWith: marker } },
        });
    } finally {
      await app?.close();
    }
  });

  it.each<user_role>(['ADMIN', 'LECTURER', 'STUDENT'])(
    '%s can read department lists and details without private user data',
    async (role) => {
      const before = await state();
      const list = await api()
        .get('/api/departments')
        .set(authorization(tokens[role]));
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body)).toBe(true);
      for (const item of list.body) safeDepartment(item);
      const ids = list.body.map((item: { id: string }) => item.id);
      for (const id of [
        fixtures!.free,
        fixtures!.courses,
        fixtures!.members,
        fixtures!.majors,
      ])
        expect(ids).toContain(String(id));
      const detail = await api()
        .get(`/api/departments/${target()}`)
        .set(authorization(tokens[role]));
      expect(detail.status).toBe(200);
      safeDepartment(detail.body);
      expect(detail.body).toEqual(
        list.body.find((item: { id: string }) => item.id === target()),
      );
      expect(await state()).toEqual(before);
    },
  );

  it('returns actual course and staff-membership counts, not major counts', async () => {
    for (const [id, courses, members] of [
      [fixtures!.courses, 1, 0],
      [fixtures!.members, 0, 1],
      [fixtures!.majors, 0, 0],
    ] as Array<[bigint, number, number]>) {
      const response = await read(String(id));
      expect(response.status).toBe(200);
      expect(response.body._count).toEqual({
        courses,
        user_departments: members,
      });
    }
  });

  const routes = ['list', 'detail', 'create', 'update', 'delete'] as const;
  const authCases = routes.flatMap((route) =>
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
              ? api().get('/api/departments')
              : route === 'detail'
                ? api().get(`/api/departments/${target()}`)
                : route === 'create'
                  ? api().post('/api/departments')
                  : route === 'update'
                    ? api().put(`/api/departments/${target()}`)
                    : api().delete(`/api/departments/${target()}`);
          if (identity !== 'missing JWT')
            operation = operation.set(
              authorization(
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

  it.each([undefined, 'ACTIVE', 'INACTIVE'])(
    'creates a department with status %s',
    async (status) => {
      const input = body(status ? { status } : {});
      const response = await create(input);
      expect(response.status).toBe(201);
      safeDepartment(response.body);
      expect(response.body).toMatchObject({
        ...input,
        status: status ?? 'ACTIVE',
        _count: { courses: 0, user_departments: 0 },
      });
      expect((await read(response.body.id)).body).toEqual(response.body);
    },
  );
  it('trims surrounding whitespace while preserving internal names', async () => {
    const input = body();
    const response = await create({
      code: ` ${input.code} `,
      name: `  ${input.name}  Internal  Name  `,
    });
    expect(response.status).toBe(201);
    expect(response.body.code).toBe(input.code);
    expect(response.body.name).toBe(`${input.name}  Internal  Name`);
  });
  it('accepts stored maximum lengths and Khmer name characters', async () => {
    const response = await create(
      body({ code: marker.padEnd(30, 'X'), name: '\u1780'.repeat(150) }),
    );
    expect(response.status).toBe(201);
    expect(response.body.code).toHaveLength(30);
    expect(response.body.name).toHaveLength(150);
  });
  it('strips injected ID and private fields on create', async () => {
    const response = await create(
      body({
        id: target(),
        auth_version: 99,
        password_hash: 'injected',
        created_at: '2000-01-01T00:00:00.000Z',
        _count: { courses: 99 },
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body.id).not.toBe(target());
    safeDepartment(response.body);
    expect(response.body._count).toEqual({ courses: 0, user_departments: 0 });
    expect(response.body.created_at).not.toBe('2000-01-01T00:00:00.000Z');
  });
  it.each(['code', 'name'] as const)(
    'rejects duplicate %s on create without writes',
    async (field) => {
      const existing = await newDepartment();
      await rejected(
        () => create(body({ [field]: ` ${existing[field]} ` })),
        409,
      );
    },
  );
  it.each(['code', 'name', 'status'])(
    'updates only selected %s and preserves dependencies',
    async (field) => {
      const existing = await newDepartment();
      const before = await prisma.departments.findUniqueOrThrow({
        where: { id: BigInt(existing.id) },
      });
      const value =
        field === 'status'
          ? 'INACTIVE'
          : field === 'code'
            ? body().code
            : body().name;
      const response = await update(existing.id, {
        [field]: field === 'status' ? value : ` ${value} `,
      });
      expect(response.status).toBe(200);
      safeDepartment(response.body);
      const after = await prisma.departments.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(after).toEqual({
        ...before,
        [field]: value,
        updated_at: after.updated_at,
      });
      expect(after.updated_at.getTime()).toBeGreaterThanOrEqual(
        before.updated_at.getTime(),
      );
    },
  );
  it('accepts unchanged code/name without false duplicate conflicts', async () => {
    const existing = await newDepartment();
    expect(
      (await update(existing.id, { code: existing.code, name: existing.name }))
        .status,
    ).toBe(200);
  });
  it('retains the stored contract for an empty update body', async () => {
    const existing = await newDepartment();
    const response = await update(existing.id, {});
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(existing);
  });
  it.each(['code', 'name'] as const)(
    'rejects duplicate %s on update atomically',
    async (field) => {
      const first = await newDepartment();
      const second = await newDepartment();
      await rejected(
        () =>
          update(second.id, {
            [field]: ` ${first[field]} `,
            status: 'INACTIVE',
          }),
        409,
      );
    },
  );
  it('changes status without deleting courses, majors or memberships', async () => {
    const existing = await newDepartment();
    const id = BigInt(existing.id);
    await prisma.majors.create({
      data: {
        code: `${marker}-S`,
        name: `${marker} Status Major`,
        department_id: id,
      },
    });
    await prisma.courses.create({
      data: {
        course_code: `${marker}-S`,
        course_name: `${marker} Status Course`,
        department_id: id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await prisma.user_departments.create({
      data: {
        user_id: fixtures!.users[0],
        department_id: id,
        is_primary: false,
      },
    });
    const before = await state();
    const response = await update(existing.id, { status: 'INACTIVE' });
    expect(response.status).toBe(200);
    const after = await state();
    expect(after.courses).toEqual(before.courses);
    expect(after.majors).toEqual(before.majors);
    expect(after.memberships).toEqual(before.memberships);
    expect(after.users).toEqual(before.users);
  });
  it('deletes an unused department and then returns 404', async () => {
    const existing = await newDepartment();
    const response = await remove(existing.id);
    expect(response.status).toBe(200);
    safeDepartment(response.body, false);
    expect(response.body).toMatchObject(existing);
    expect(
      await prisma.departments.findUnique({
        where: { id: BigInt(existing.id) },
      }),
    ).toBeNull();
    expect((await read(existing.id)).status).toBe(404);
  });
  it.each(['courses', 'members', 'majors'] as const)(
    'protects a department referenced only by %s',
    async (relation) => {
      await rejected(() => remove(String(fixtures![relation])), 409);
    },
  );
  const invalidInputs: Array<[string, Record<string, unknown>]> = [
    ['missing code', { name: `${marker} Missing code` }],
    ['missing name', { code: `${marker}-missing` }],
    ['empty code', { code: '' }],
    ['empty name', { name: '' }],
    ['null code', { code: null }],
    ['null name', { name: null }],
    ['numeric code', { code: 123 }],
    ['numeric name', { name: 123 }],
    ['long code', { code: 'x'.repeat(31) }],
    ['long name', { name: 'x'.repeat(151) }],
    ['invalid status', { status: 'DISABLED' }],
    ['numeric status', { status: 1 }],
  ];
  it.each(invalidInputs)('rejects create %s', async (label, overrides) => {
    const input = label.startsWith('missing') ? overrides : body(overrides);
    await rejected(() => create(input), 400);
  });
  it.each(invalidInputs.filter(([label]) => !label.startsWith('missing')))(
    'rejects update %s',
    async (_label, overrides) => {
      const existing = await newDepartment();
      await rejected(() => update(existing.id, overrides), 400);
    },
  );
  it('rejects null status on update', async () => {
    const existing = await newDepartment();
    await rejected(() => update(existing.id, { status: null }), 400);
  });
  it.each(['code', 'name'])(
    'rejects whitespace-only %s on create',
    async (field) => {
      await rejected(() => create(body({ [field]: ' \t ' })), 400);
    },
  );
  it.each(['code', 'name'])(
    'rejects whitespace-only %s on update',
    async (field) => {
      const existing = await newDepartment();
      await rejected(() => update(existing.id, { [field]: ' \t ' }), 400);
    },
  );
  it.each(['GET', 'PUT', 'DELETE'])(
    'returns 404 for absent in-range IDs on %s',
    async (method) => {
      await rejected(
        () =>
          method === 'GET'
            ? read('9223372036854775807')
            : method === 'PUT'
              ? update('9223372036854775807', {
                  name: `${marker} Missing target`,
                })
              : remove('9223372036854775807'),
        404,
      );
    },
  );
  it.each(['GET', 'PUT', 'DELETE'])(
    'rejects malformed IDs on %s',
    async (method) => {
      await rejected(
        () =>
          method === 'GET'
            ? read('not-an-id')
            : method === 'PUT'
              ? update('not-an-id', { name: `${marker} Malformed target` })
              : remove('not-an-id'),
        400,
      );
    },
  );
  it.each(['GET', 'PUT', 'DELETE'])(
    'rejects out-of-storage-range IDs on %s',
    async (method) => {
      await rejected(
        () =>
          method === 'GET'
            ? read('9223372036854775808')
            : method === 'PUT'
              ? update('9223372036854775808', {
                  name: `${marker} Oversized target`,
                })
              : remove('9223372036854775808'),
        400,
      );
    },
  );

  it('preserves null create-status as the existing ACTIVE default alias', async () => {
    const response = await create(body({ status: null }));
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('ACTIVE');
  });

  it.each(['create', 'update'])(
    'validates normalized maximum-length text on %s',
    async (operation) => {
      const values = {
        code: marker.padEnd(30, 'X'),
        name: '\u1780'.repeat(150),
      };
      const input = {
        code: ` \t${values.code}  `,
        name: `  ${values.name}\t `,
      };
      const response =
        operation === 'create'
          ? await create(input)
          : await update((await newDepartment()).id, input);
      expect(response.status).toBe(operation === 'create' ? 201 : 200);
      expect(response.body).toMatchObject(values);
    },
  );

  it.each(['code', 'name', 'status'])(
    'rejects mixed updates containing null %s without partial writes',
    async (field) => {
      const existing = await newDepartment();
      const input = { ...body(), status: 'INACTIVE', [field]: null };
      const response = await rejected(() => update(existing.id, input), 400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining(field)]),
      );
    },
  );

  it.each(['code', 'name'])(
    'rejects mixed updates containing blank %s without partial writes',
    async (field) => {
      const existing = await newDepartment();
      const response = await rejected(
        () =>
          update(existing.id, {
            ...body(),
            status: 'INACTIVE',
            [field]: ' \t ',
          }),
        400,
      );
      expect(response.body.message).toEqual(
        expect.arrayContaining([`${field} should not be empty`]),
      );
    },
  );

  const pathCases = ['GET', 'PUT', 'DELETE'].flatMap((method) => [
    { method, id: '-9223372036854775809', status: 400 },
    { method, id: '-9223372036854775808', status: 404 },
    { method, id: '9'.repeat(1000), status: 400 },
  ]);
  it.each(pathCases)(
    'checks signed storage bounds on $method (expected $status)',
    async ({ method, id, status }) => {
      const response = await rejected(
        () =>
          method === 'GET'
            ? read(id)
            : method === 'PUT'
              ? update(id, { name: `${marker} Bound target` })
              : remove(id),
        status,
      );
      if (status === 400)
        expect(response.body.message).toBe(
          'id must be between -9223372036854775808 and 9223372036854775807',
        );
    },
  );

  it('documents normalized fields, non-null updates, department ID bounds and 400 errors', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const schemas = document.components!.schemas!;
    expect(schemas.CreateDepartmentDto).toMatchObject({
      required: expect.arrayContaining(['code', 'name']),
      properties: {
        code: { minLength: 1, maxLength: 30 },
        name: { minLength: 1, maxLength: 150 },
        status: { nullable: true, default: 'ACTIVE' },
      },
    });
    expect(schemas.UpdateDepartmentDto).toMatchObject({
      properties: { status: { nullable: false } },
    });
    const updateSchema = schemas.UpdateDepartmentDto;
    if (!('properties' in updateSchema))
      throw new Error('Expected update schema properties');
    expect(updateSchema.required ?? []).toEqual([]);
    for (const method of ['get', 'put', 'delete'] as const) {
      const operation = document.paths['/api/departments/{id}'][method]!;
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
    expect(document.paths['/api/departments'].post!.responses).toHaveProperty(
      '400',
    );
  });
});
