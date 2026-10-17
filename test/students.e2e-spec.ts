import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Students CRUD and permissions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testDatabaseConfirmed = false;
  let adminToken: string;
  let studentToken: string;
  let lecturerToken: string;
  let fixturePasswordHash: string;
  let serial = 0;
  const stamp = Date.now();
  const marker = `E2E-CRUD-${stamp}`;
  const codePrefix = `${marker.toLowerCase()}-`;
  const emailPrefix = `crud-${stamp}-`;
  const missingId = '9000000000000000000'; // Valid signed BigInt, absent fixture ID.
  let fixtures:
    | {
        department: bigint;
        year: bigint;
        laterYear: bigint;
        major: bigint;
        laterMajor: bigint;
        generation: bigint;
        otherGeneration: bigint;
        profiles: bigint[];
        accounts: bigint[];
      }
    | undefined;

  const scope = () => {
    if (!fixtures) throw new Error('Owned CRUD fixtures were not initialized');
    return fixtures;
  };
  const api = () => request(app.getHttpServer());
  const admin = () => ({ Authorization: `Bearer ${adminToken}` });
  const ownedUsersWhere = (): Prisma.usersWhereInput => ({
    OR: [
      { full_name: { startsWith: marker } },
      { email: { startsWith: emailPrefix } },
    ],
  });

  const body = (overrides: Record<string, unknown> = {}) => {
    serial++;
    const f = scope();
    return {
      student_code: `${codePrefix}${serial}`,
      full_name: `${marker} Synthetic ${serial}`,
      email: `${emailPrefix}${serial}@example.test`,
      password: 'Password123',
      gender: 'MALE',
      generation_id: f.generation.toString(),
      academic_year_id: f.year.toString(),
      year_level: 1,
      major_id: f.major.toString(),
      class_group: 'A',
      notes: 'Synthetic CRUD fixture',
      ...overrides,
    };
  };

  async function create(overrides: Record<string, unknown> = {}) {
    const res = await api()
      .post('/api/students')
      .set(admin())
      .send(body(overrides));
    expect(res.status).toBe(201);
    return res.body as { id: string; user_id: string; student_code: string };
  }

  function assertPrivateFieldsAbsent(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(assertPrivateFieldsAbsent);
    } else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'auth_version',
          'access_token',
        ]).not.toContain(key);
        assertPrivateFieldsAbsent(child);
      }
    }
  }

  async function ownedState() {
    const f = scope();
    const users = await prisma.users.findMany({
      where: ownedUsersWhere(),
      orderBy: { id: 'asc' },
      select: {
        id: true,
        email: true,
        full_name: true,
        gender: true,
        role: true,
        status: true,
        auth_version: true,
        created_at: true,
        updated_at: true,
      },
    });
    const students = await prisma.students.findMany({
      where: { generation_id: { in: [f.generation, f.otherGeneration] } },
      orderBy: { id: 'asc' },
    });
    const records = await prisma.student_academic_records.findMany({
      where: { student_id: { in: students.map((student) => student.id) } },
      orderBy: { id: 'asc' },
    });
    return { users, students, records };
  }

  async function cleanupOwnedUsers(keepBaseline: boolean) {
    if (!prisma || !testDatabaseConfirmed) return;
    const users = await prisma.users.findMany({
      where: {
        ...ownedUsersWhere(),
        ...(keepBaseline && fixtures
          ? { id: { notIn: fixtures.accounts } }
          : {}),
      },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    if (!userIds.length) return;
    await prisma.$transaction(async (tx) => {
      const students = await tx.students.findMany({
        where: { user_id: { in: userIds } },
        select: { id: true },
      });
      await tx.student_academic_records.deleteMany({
        where: { student_id: { in: students.map((student) => student.id) } },
      });
      await tx.students.deleteMany({ where: { user_id: { in: userIds } } });
      await tx.users.deleteMany({ where: { id: { in: userIds } } });
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
    testDatabaseConfirmed = true;

    const login = async (identifier: string) => {
      const res = await api()
        .post('/api/auth/login')
        .send({ identifier, password: 'Password123' });
      expect(res.status).toBe(200);
      expect(typeof res.body.access_token).toBe('string');
      return res.body.access_token as string;
    };
    adminToken = await login('admin@itc.edu.kh');
    studentToken = await login('student1@itc.edu.kh');
    lecturerToken = await login('sokdara@itc.edu.kh');
    fixturePasswordHash = (
      await prisma.users.findUniqueOrThrow({
        where: { email: 'student1@itc.edu.kh' },
      })
    ).password_hash;

    fixtures = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const department = await tx.departments.create({
        data: { code: `SC-${stamp}`, name: `${marker} Department` },
      });
      const year = await tx.academic_years.create({
        data: { name: `SC-${stamp}`, start_year: 2026, is_active: false },
      });
      const laterYear = await tx.academic_years.create({
        data: { name: `SCF-${stamp}`, start_year: 2027, is_active: false },
      });
      const major = await tx.majors.create({
        data: {
          code: `SC-${stamp}-A`,
          name: `${marker} Major A`,
          department_id: department.id,
        },
      });
      const laterMajor = await tx.majors.create({
        data: {
          code: `SC-${stamp}-B`,
          name: `${marker} Major B`,
          department_id: department.id,
        },
      });
      const generation = await tx.student_generations.create({
        data: {
          name: `${marker} Gen A`,
          entry_academic_year_id: year.id,
          starting_year_level: 1,
        },
      });
      const otherGeneration = await tx.student_generations.create({
        data: {
          name: `${marker} Gen B`,
          entry_academic_year_id: year.id,
          starting_year_level: 1,
        },
      });
      const profiles: bigint[] = [];
      const accounts: bigint[] = [];
      for (const suffix of ['a', 'b']) {
        const user = await tx.users.create({
          data: {
            email: `${emailPrefix}${suffix}@example.test`,
            full_name: `${marker} Student ${suffix.toUpperCase()}`,
            password_hash: fixturePasswordHash,
            role: 'STUDENT',
            status: 'ACTIVE',
            created_at: now,
            updated_at: now,
          },
        });
        const student = await tx.students.create({
          data: {
            user_id: user.id,
            student_code: `${codePrefix}${suffix}`,
            generation_id: generation.id,
          },
        });
        await tx.student_academic_records.createMany({
          data: [
            {
              student_id: student.id,
              academic_year_id: year.id,
              year_level: 1,
              major_id: suffix === 'a' ? major.id : laterMajor.id,
              class_group: suffix === 'a' ? 'A' : 'B',
            },
            {
              student_id: student.id,
              academic_year_id: laterYear.id,
              year_level: 2,
              major_id: suffix === 'a' ? laterMajor.id : major.id,
              class_group: suffix === 'a' ? 'B' : 'A',
            },
          ],
        });
        profiles.push(student.id);
        accounts.push(user.id);
      }
      return {
        department: department.id,
        year: year.id,
        laterYear: laterYear.id,
        major: major.id,
        laterMajor: laterMajor.id,
        generation: generation.id,
        otherGeneration: otherGeneration.id,
        profiles,
        accounts,
      };
    });
  }, 60000);

  afterEach(async () => {
    await cleanupOwnedUsers(true);
  });

  afterAll(async () => {
    try {
      await cleanupOwnedUsers(false);
      if (prisma && testDatabaseConfirmed && fixtures) {
        const f = fixtures;
        await prisma.$transaction(async (tx) => {
          await tx.student_generations.deleteMany({
            where: { id: { in: [f.generation, f.otherGeneration] } },
          });
          await tx.majors.deleteMany({
            where: { id: { in: [f.major, f.laterMajor] } },
          });
          await tx.academic_years.deleteMany({
            where: { id: { in: [f.year, f.laterYear] } },
          });
          await tx.departments.delete({ where: { id: f.department } });
        });
        expect(await prisma.users.count({ where: ownedUsersWhere() })).toBe(0);
        expect(
          await prisma.students.count({
            where: { student_code: { startsWith: codePrefix } },
          }),
        ).toBe(0);
      }
    } finally {
      if (app) await app.close();
    }
  });

  describe('ADMIN-only HTTP permissions', () => {
    const routes = [
      {
        name: 'list',
        method: 'get',
        path: () => '/api/students',
        payload: () => undefined,
      },
      {
        name: 'detail',
        method: 'get',
        path: () => `/api/students/${scope().profiles[0]}`,
        payload: () => undefined,
      },
      {
        name: 'create',
        method: 'post',
        path: () => '/api/students',
        payload: () => body(),
      },
      {
        name: 'update',
        method: 'put',
        path: () => `/api/students/${scope().profiles[0]}`,
        payload: () => ({ full_name: `${marker} Forbidden update` }),
      },
      {
        name: 'delete',
        method: 'delete',
        path: () => `/api/students/${scope().profiles[0]}`,
        payload: () => undefined,
      },
      // These cover permission wiring only; import/export business cases are a later batch.
      {
        name: 'import',
        method: 'post',
        path: () => '/api/students/import',
        payload: () => ({}),
      },
      {
        name: 'export',
        method: 'get',
        path: () => '/api/students/export',
        payload: () => undefined,
      },
    ] as const;
    const credentials = ['missing', 'invalid', 'STUDENT', 'LECTURER'] as const;
    for (const route of routes) {
      it.each(credentials)(
        `${route.name} rejects %s without exposing data or changing owned records`,
        async (credential) => {
          const before = await ownedState();
          const req = api()[route.method](route.path());
          if (credential !== 'missing')
            req.set(
              'Authorization',
              `Bearer ${
                credential === 'invalid'
                  ? 'not-a-valid-jwt'
                  : credential === 'STUDENT'
                    ? studentToken
                    : lecturerToken
              }`,
            );
          const payload = route.payload();
          if (payload) req.send(payload);
          const res = await req;
          expect(res.status).toBe(
            credential === 'missing' || credential === 'invalid' ? 401 : 403,
          );
          expect(res.body).not.toHaveProperty('data');
          expect(res.body).not.toHaveProperty('student_code');
          expect(await ownedState()).toEqual(before);
        },
      );
    }
  });

  describe('creation, validation and atomicity', () => {
    it('creates one account/profile/placement, normalizes labels and prevents injected account roles', async () => {
      const before = await ownedState();
      const payload = body();
      const res = await api()
        .post('/api/students')
        .set(admin())
        .send({
          ...payload,
          student_code: `  ${payload.student_code.toUpperCase()}  `,
          email: payload.email.toUpperCase(),
          full_name: `  ${payload.full_name}  `,
          class_group: '  A  ',
          notes: '  Synthetic note  ',
          role: 'ADMIN',
          status: 'INACTIVE',
        });
      expect(res.status).toBe(201);
      assertPrivateFieldsAbsent(res.body);
      expect(typeof res.body.id).toBe('string');
      expect(typeof res.body.user_id).toBe('string');
      expect(res.body.student_code).toBe(payload.student_code);
      expect(res.body.users).toMatchObject({
        id: res.body.user_id,
        full_name: payload.full_name,
        email: payload.email,
        role: 'STUDENT',
        status: 'ACTIVE',
      });
      const student = await prisma.students.findUniqueOrThrow({
        where: { id: BigInt(res.body.id) },
      });
      expect(student.user_id.toString()).toBe(res.body.user_id);
      const account = await prisma.users.findUniqueOrThrow({
        where: { id: student.user_id },
      });
      expect(account.password_hash).not.toBe(payload.password);
      expect(
        await bcrypt.compare(payload.password, account.password_hash),
      ).toBe(true);
      const records = await prisma.student_academic_records.findMany({
        where: { student_id: student.id },
      });
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        academic_year_id: scope().year,
        major_id: scope().major,
        year_level: 1,
        class_group: 'A',
      });
      const after = await ownedState();
      expect([
        after.users.length,
        after.students.length,
        after.records.length,
      ]).toEqual([
        before.users.length + 1,
        before.students.length + 1,
        before.records.length + 1,
      ]);
    });

    it.each([1, 5])('accepts year-level boundary %s', async (yearLevel) => {
      const created = await create({ year_level: yearLevel });
      const record = await prisma.student_academic_records.findFirstOrThrow({
        where: { student_id: BigInt(created.id) },
      });
      expect(record.year_level).toBe(yearLevel);
    });

    it('supports omitted optional fields without fabricating email, gender or group', async () => {
      const payload: Record<string, unknown> = body();
      for (const field of ['email', 'gender', 'class_group', 'notes'])
        delete payload[field];
      const res = await api().post('/api/students').set(admin()).send(payload);
      expect(res.status).toBe(201);
      expect(res.body.users.email).toBeNull();
      expect(res.body.users.gender).toBeNull();
      expect(res.body.notes).toBeNull();
      expect(res.body.student_academic_records[0].class_group).toBeNull();
      assertPrivateFieldsAbsent(res.body);
    });

    const invalidInputs = [
      { name: 'year zero', values: { year_level: 0 } },
      { name: 'year six', values: { year_level: 6 } },
      { name: 'fractional year', values: { year_level: 1.5 } },
      { name: 'string year', values: { year_level: '1' } },
      { name: 'numeric generation ID', values: { generation_id: 1 } },
      { name: 'negative generation ID', values: { generation_id: '-1' } },
      { name: 'invalid email', values: { email: 'invalid-email' } },
      { name: 'invalid gender', values: { gender: 'UNKNOWN' } },
      { name: 'empty code', values: { student_code: '' } },
      { name: 'empty name', values: { full_name: '' } },
      { name: 'short password', values: { password: 'short' } },
      { name: 'long password', values: { password: 'x'.repeat(73) } },
      { name: 'missing major', values: { major_id: undefined } },
      { name: 'missing password', values: { password: undefined } },
    ];
    it.each(invalidInputs)(
      'rejects $name with 400 and no partial records',
      async (input) => {
        const before = await ownedState();
        const res = await api()
          .post('/api/students')
          .set(admin())
          .send(body(input.values));
        expect(res.status).toBe(400);
        expect(await ownedState()).toEqual(before);
      },
    );

    it.each(['generation_id', 'academic_year_id', 'major_id'])(
      'missing %s dependency gives 404 without writes',
      async (field) => {
        const before = await ownedState();
        const res = await api()
          .post('/api/students')
          .set(admin())
          .send(body({ [field]: missingId }));
        expect(res.status).toBe(404);
        expect(await ownedState()).toEqual(before);
      },
    );

    it.each(['student_code', 'email'])(
      'normalized duplicate %s returns 409 and rolls back the account/profile/placement',
      async (field) => {
        const before = await ownedState();
        const value =
          field === 'student_code'
            ? `  ${codePrefix.toUpperCase()}A  `
            : `${emailPrefix}a@example.test`.toUpperCase();
        const res = await api()
          .post('/api/students')
          .set(admin())
          .send(body({ [field]: value }));
        expect(res.status).toBe(409);
        expect(await ownedState()).toEqual(before);
      },
    );

    it('concurrent duplicate-code creates yield one complete student and no orphan account', async () => {
      const before = await ownedState();
      const payload = body();
      const second = body({ student_code: payload.student_code });
      const responses = await Promise.all([
        api().post('/api/students').set(admin()).send(payload),
        api().post('/api/students').set(admin()).send(second),
      ]);
      expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
      const after = await ownedState();
      expect([
        after.users.length,
        after.students.length,
        after.records.length,
      ]).toEqual([
        before.users.length + 1,
        before.students.length + 1,
        before.records.length + 1,
      ]);
      expect(
        after.students.filter(
          (student) => student.student_code === payload.student_code,
        ),
      ).toHaveLength(1);
    });
  });

  describe('read contracts, context and pagination', () => {
    it('detail uses the profile ID and returns safe string IDs and zero progress when unassigned', async () => {
      const f = scope();
      const res = await api()
        .get(`/api/students/${f.profiles[0]}`)
        .set(admin());
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: f.profiles[0].toString(),
        user_id: f.accounts[0].toString(),
        student_code: `${codePrefix}a`,
        evaluation_progress: {
          active: { assigned: 0, completed: 0 },
          total: { assigned: 0, completed: 0 },
        },
      });
      expect(res.body).not.toHaveProperty('academic_context');
      assertPrivateFieldsAbsent(res.body);
    });

    it.each(['entry', 'later'])(
      '%s-year detail preserves its own placement and existing records',
      async (selected) => {
        const f = scope();
        const before = await ownedState();
        const year = selected === 'entry' ? f.year : f.laterYear;
        const res = await api()
          .get(`/api/students/${f.profiles[0]}`)
          .query({ academic_year_id: year.toString() })
          .set(admin());
        expect(res.status).toBe(200);
        expect(res.body.academic_context).toMatchObject({
          academic_year: { id: year.toString() },
          effective_year_level: selected === 'entry' ? 1 : 2,
          placement_eligible: true,
          placement: {
            major_id: (selected === 'entry'
              ? f.major
              : f.laterMajor
            ).toString(),
            class_group: selected === 'entry' ? 'A' : 'B',
          },
        });
        expect(res.body.student_academic_records).toHaveLength(2);
        assertPrivateFieldsAbsent(res.body);
        expect(await ownedState()).toEqual(before);
      },
    );

    it('year/major/group filters use the selected placement rather than the other year', async () => {
      const f = scope();
      for (const [year, major, level, group] of [
        [f.year, f.major, 1, 'a'],
        [f.laterYear, f.laterMajor, 2, 'b'],
      ] as const) {
        const res = await api()
          .get('/api/students')
          .set(admin())
          .query({
            generation_id: f.generation.toString(),
            academic_year_id: year.toString(),
            major_id: major.toString(),
            year_level: level,
            class_group: ` ${group} `,
          });
        expect(res.status).toBe(200);
        expect(res.body.data.map((student: any) => student.id)).toEqual([
          f.profiles[0].toString(),
        ]);
        expect(res.body.pagination.total).toBe(1);
        expect(res.body.filters).toMatchObject({
          academic_year_id: year.toString(),
          major_id: major.toString(),
          year_level: level,
          class_group: group,
        });
        assertPrivateFieldsAbsent(res.body);
      }
    });

    it('pagination is stable and totals reflect the owned filtered population', async () => {
      const f = scope();
      for (const page of [1, 2, 3]) {
        const res = await api()
          .get('/api/students')
          .set(admin())
          .query({ generation_id: f.generation.toString(), limit: 1, page });
        expect(res.status).toBe(200);
        expect(res.body.pagination).toEqual({
          page,
          limit: 1,
          total: 2,
          total_pages: 2,
        });
        expect(res.body.data.map((student: any) => student.id)).toEqual(
          page < 3 ? [f.profiles[page - 1].toString()] : [],
        );
        assertPrivateFieldsAbsent(res.body);
      }
    });

    it('trimmed case-insensitive search finds only the intended code', async () => {
      const res = await api()
        .get('/api/students')
        .set(admin())
        .query({
          generation_id: scope().generation.toString(),
          search: `  ${codePrefix.toUpperCase()}A  `,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.map((student: any) => student.id)).toEqual([
        scope().profiles[0].toString(),
      ]);
    });

    it('empty scoped populations return zero totals and no fabricated progress rows', async () => {
      const res = await api()
        .get('/api/students')
        .set(admin())
        .query({ generation_id: scope().otherGeneration.toString() });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toMatchObject({ total: 0, total_pages: 0 });
    });

    it.each([
      { name: 'group without year', query: { class_group: 'A' } },
      { name: 'level without year', query: { year_level: 1 } },
      {
        name: 'major without year',
        query: () => ({ major_id: scope().major.toString() }),
      },
      { name: 'zero page', query: { page: 0 } },
      { name: 'zero limit', query: { limit: 0 } },
      { name: 'zero generation ID', query: { generation_id: '0' } },
      { name: 'malformed year ID', query: { academic_year_id: 'bad' } },
    ])('rejects $name list query with 400', async (item) => {
      const query =
        typeof item.query === 'function' ? item.query() : item.query;
      const res = await api().get('/api/students').set(admin()).query(query);
      expect(res.status).toBe(400);
    });

    it.each(['generation_id', 'academic_year_id', 'major_id'])(
      'unknown %s list context returns 404',
      async (field) => {
        const res = await api()
          .get('/api/students')
          .set(admin())
          .query({
            academic_year_id: scope().year.toString(),
            [field]: missingId,
          });
        expect(res.status).toBe(404);
      },
    );

    it.each(['0', 'bad'])(
      'invalid detail year %s is rejected with 400',
      async (year) => {
        const res = await api()
          .get(`/api/students/${scope().profiles[0]}`)
          .set(admin())
          .query({ academic_year_id: year });
        expect(res.status).toBe(400);
      },
    );

    it('unknown detail year returns 404', async () => {
      const res = await api()
        .get(`/api/students/${scope().profiles[0]}`)
        .set(admin())
        .query({ academic_year_id: missingId });
      expect(res.status).toBe(404);
    });

    it.each(['get', 'put', 'delete'] as const)(
      '%s missing profile returns 404 without writes',
      async (method) => {
        const before = await ownedState();
        const req = api()[method](`/api/students/${missingId}`).set(admin());
        if (method === 'put') req.send({ full_name: `${marker} Missing` });
        expect((await req).status).toBe(404);
        expect(await ownedState()).toEqual(before);
      },
    );

    it.each(['get', 'put', 'delete'] as const)(
      '%s malformed profile ID returns 400 without writes',
      async (method) => {
        const before = await ownedState();
        const req = api()[method]('/api/students/not-an-integer').set(admin());
        if (method === 'put') req.send({ full_name: `${marker} Invalid` });
        expect((await req).status).toBe(400);
        expect(await ownedState()).toEqual(before);
      },
    );
  });

  describe('updates, rollback and protected deletion', () => {
    it('updates account/profile fields with unchanged generation without rewriting academic records or password', async () => {
      const created = await create();
      const recordBefore = await prisma.student_academic_records.findMany({
        where: { student_id: BigInt(created.id) },
      });
      const userBefore = await prisma.users.findUniqueOrThrow({
        where: { id: BigInt(created.user_id) },
      });
      const updatedCode = `${codePrefix}updated`;
      const res = await api()
        .put(`/api/students/${created.id}`)
        .set(admin())
        .send({
          full_name: ` ${marker} Renamed `,
          email: `${emailPrefix}RENAMED@EXAMPLE.TEST`,
          student_code: updatedCode.toUpperCase(),
          generation_id: scope().generation.toString(),
          gender: 'FEMALE',
          notes: ' Updated note ',
          role: 'ADMIN',
          password: 'OtherPassword123',
        });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: created.id,
        user_id: created.user_id,
        student_code: updatedCode,
        generation_id: scope().generation.toString(),
        notes: 'Updated note',
        users: {
          full_name: `${marker} Renamed`,
          email: `${emailPrefix}renamed@example.test`,
          gender: 'FEMALE',
          role: 'STUDENT',
        },
      });
      assertPrivateFieldsAbsent(res.body);
      expect(
        await prisma.student_academic_records.findMany({
          where: { student_id: BigInt(created.id) },
        }),
      ).toEqual(recordBefore);
      expect(
        (
          await prisma.users.findUniqueOrThrow({
            where: { id: BigInt(created.user_id) },
          })
        ).password_hash,
      ).toBe(userBefore.password_hash);
    });

    it('clears nullable email, gender and notes with null', async () => {
      const created = await create();
      const res = await api()
        .put(`/api/students/${created.id}`)
        .set(admin())
        .send({ email: null, gender: null, notes: null });
      expect(res.status).toBe(200);
      expect(res.body.users.email).toBeNull();
      expect(res.body.users.gender).toBeNull();
      expect(res.body.notes).toBeNull();
      assertPrivateFieldsAbsent(res.body);
    });

    it.each([
      { name: 'gender', values: { gender: 'UNKNOWN' } },
      { name: 'numeric generation ID', values: { generation_id: 1 } },
      { name: 'status', values: { status: 'DELETED' } },
      { name: 'email', values: { email: 'invalid' } },
    ])(
      'invalid update $name returns 400 and changes no records',
      async (item) => {
        const before = await ownedState();
        const res = await api()
          .put(`/api/students/${scope().profiles[0]}`)
          .set(admin())
          .send(item.values);
        expect(res.status).toBe(400);
        expect(await ownedState()).toEqual(before);
      },
    );

    it.each(['student_code', 'email'])(
      'duplicate update %s rolls back all accompanying changes',
      async (field) => {
        const before = await ownedState();
        const conflict =
          field === 'student_code'
            ? `${codePrefix}B`.toUpperCase()
            : `${emailPrefix}b@example.test`.toUpperCase();
        const res = await api()
          .put(`/api/students/${scope().profiles[0]}`)
          .set(admin())
          .send({
            full_name: `${marker} Must roll back`,
            notes: 'Must roll back',
            [field]: conflict,
          });
        expect(res.status).toBe(409);
        expect(await ownedState()).toEqual(before);
      },
    );

    it('disabling a student rejects its existing JWT without deleting placement history', async () => {
      const created = await create();
      const login = await api()
        .post('/api/auth/login')
        .send({ identifier: created.student_code, password: 'Password123' });
      expect(login.status).toBe(200);
      expect(login.body.user.id).toBe(created.user_id);
      const records = await prisma.student_academic_records.findMany({
        where: { student_id: BigInt(created.id) },
      });
      const disabled = await api()
        .put(`/api/students/${created.id}`)
        .set(admin())
        .send({ status: 'INACTIVE' });
      expect(disabled.status).toBe(200);
      expect(disabled.body.users.status).toBe('INACTIVE');
      expect(
        (
          await api()
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${login.body.access_token}`)
        ).status,
      ).toBe(401);
      expect(
        await prisma.student_academic_records.findMany({
          where: { student_id: BigInt(created.id) },
        }),
      ).toEqual(records);
    });

    it('historical academic records block permanent deletion with 409 and no changes', async () => {
      const before = await ownedState();
      const res = await api()
        .delete(`/api/students/${scope().profiles[0]}`)
        .set(admin());
      expect(res.status).toBe(409);
      expect(res.body.message).toContain('Disable the student account instead');
      expect(await ownedState()).toEqual(before);
    });

    it('deletes an owned legacy profile with no placement, enrollment or participant history', async () => {
      const now = new Date();
      const account = await prisma.users.create({
        data: {
          email: `${emailPrefix}legacy@example.test`,
          full_name: `${marker} Legacy`,
          password_hash: fixturePasswordHash,
          role: 'STUDENT',
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        },
      });
      const profile = await prisma.students.create({
        data: {
          user_id: account.id,
          student_code: `${codePrefix}legacy`,
          generation_id: scope().generation,
        },
      });
      const res = await api()
        .delete(`/api/students/${profile.id}`)
        .set(admin());
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Student deleted successfully');
      expect(
        await prisma.students.findUnique({ where: { id: profile.id } }),
      ).toBeNull();
      expect(
        await prisma.users.findUnique({ where: { id: account.id } }),
      ).toBeNull();
    });
  });
});
