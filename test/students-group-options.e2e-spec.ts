import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { user_role, user_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Student export group options (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let passwordHash: string;
  let serial = 0;
  const marker = `E2E-GO-${Date.now()}`;
  const endpoint = '/api/students/group-options';
  const fields = ['academic_year_id', 'generation_id', 'major_id'] as const;
  type Field = (typeof fields)[number];
  type Scope = Record<Field, string>;
  let adminToken: string;
  let studentToken: string;
  let lecturerToken: string;
  let fixtures:
    | {
        department: bigint;
        years: bigint[];
        majors: bigint[];
        generations: bigint[];
      }
    | undefined;
  let originalState: unknown;
  const api = () => request(app.getHttpServer());
  const mainScope = (): Scope => ({
    academic_year_id: fixtures!.years[1].toString(),
    generation_id: fixtures!.generations[0].toString(),
    major_id: fixtures!.majors[0].toString(),
  });
  const get = (
    query: Record<string, unknown> = mainScope(),
    token = adminToken,
  ) => api().get(endpoint).set('Authorization', `Bearer ${token}`).query(query);
  const expected = (scope: Scope, groups: string[]) => ({
    ...scope,
    groups,
    total: groups.length,
  });

  async function account(role: user_role, status: user_status = 'ACTIVE') {
    serial++;
    return prisma.users.create({
      data: {
        email: `go-${marker.toLowerCase()}-${serial}@example.test`,
        full_name: `${marker} ${serial}`,
        role,
        status,
        password_hash: passwordHash,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  async function actor(role: user_role) {
    const user = await account(role);
    const response = await api().post('/api/auth/login').send({
      identifier: user.email,
      password: 'Password123',
    });
    expect(response.status).toBe(200);
    return response.body.access_token as string;
  }

  async function student(
    classGroup: string | null,
    options: {
      year?: number;
      generation?: number;
      major?: number;
      status?: user_status;
      paused?: boolean;
    } = {},
  ) {
    const f = fixtures!;
    const user = await account('STUDENT', options.status);
    return prisma.students.create({
      data: {
        user_id: user.id,
        student_code: `${marker.toLowerCase()}-${serial}`,
        generation_id: f.generations[options.generation ?? 0],
        student_academic_records: {
          create: {
            academic_year_id: f.years[options.year ?? 1],
            major_id: f.majors[options.major ?? 0],
            year_level: 2,
            class_group: classGroup,
            progression_action: options.paused ? 'PAUSE' : 'NORMAL',
          },
        },
      },
    });
  }

  async function snapshot() {
    const f = fixtures!;
    const users = await prisma.users.findMany({
      where: { full_name: { startsWith: marker } },
      orderBy: { id: 'asc' },
    });
    const students = await prisma.students.findMany({
      where: { user_id: { in: users.map((user) => user.id) } },
      orderBy: { id: 'asc' },
    });
    return {
      users,
      students,
      placements: await prisma.student_academic_records.findMany({
        where: { student_id: { in: students.map((item) => item.id) } },
        orderBy: { id: 'asc' },
      }),
      years: await prisma.academic_years.findMany({
        where: { id: { in: f.years } },
        orderBy: { id: 'asc' },
      }),
      majors: await prisma.majors.findMany({
        where: { id: { in: f.majors } },
        orderBy: { id: 'asc' },
      }),
      generations: await prisma.student_generations.findMany({
        where: { id: { in: f.generations } },
        orderBy: { id: 'asc' },
      }),
      department: await prisma.departments.findUnique({
        where: { id: f.department },
      }),
    };
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
    const [database] = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;
    expect(database.name).toBe('teacher_evaluation_test');
    confirmed = true;
    passwordHash = await bcrypt.hash('Password123', 10);
    fixtures = await prisma.$transaction(async (tx) => {
      const department = await tx.departments.create({
        data: { code: marker, name: marker },
      });
      const years: bigint[] = [];
      for (let index = 0; index < 3; index++) {
        const year = await tx.academic_years.create({
          data: {
            name: `GO-${Date.now()}-${index}`,
            start_year: 2089 + index,
            is_active: false,
          },
        });
        years.push(year.id);
      }
      const majors: bigint[] = [];
      const generations: bigint[] = [];
      for (let index = 0; index < 2; index++) {
        const major = await tx.majors.create({
          data: {
            code: `${marker}-${index}`,
            name: `${marker}-${index}`,
            department_id: department.id,
          },
        });
        majors.push(major.id);
        const generation = await tx.student_generations.create({
          data: {
            name: `${marker}-${index}`,
            entry_academic_year_id: years[0],
          },
        });
        generations.push(generation.id);
      }
      return { department: department.id, years, majors, generations };
    });
    adminToken = await actor('ADMIN');
    studentToken = await actor('STUDENT');
    lecturerToken = await actor('LECTURER');
    for (const group of [
      ' a ',
      'A',
      ' b ',
      'lab   1',
      '\tlab\t1 ',
      '\u1780\u17d2\u179a\u17bb\u1798 \u1780',
      null,
      ' \t ',
    ]) {
      await student(group);
    }
    await student('ONLY-INACTIVE', { status: 'INACTIVE' });
    await student('ONLY-PAUSED', { paused: true });
    await student('OTHER-YEAR', { year: 2 });
    await student('OTHER-GENERATION', { generation: 1 });
    await student('OTHER-MAJOR', { major: 1 });
    await student('DO-NOT-CARRY', { year: 0 });
    originalState = await snapshot();
  }, 30000);

  afterEach(async () => {
    if (originalState) expect(await snapshot()).toEqual(originalState);
  });

  afterAll(async () => {
    try {
      if (confirmed) {
        const users = await prisma.users.findMany({
          where: { full_name: { startsWith: marker } },
          select: { id: true },
        });
        const ids = users.map((user) => user.id);
        await prisma.$transaction(async (tx) => {
          const students = await tx.students.findMany({
            where: { user_id: { in: ids } },
            select: { id: true },
          });
          await tx.student_academic_records.deleteMany({
            where: { student_id: { in: students.map((item) => item.id) } },
          });
          await tx.students.deleteMany({ where: { user_id: { in: ids } } });
          await tx.users.deleteMany({ where: { id: { in: ids } } });
          if (fixtures) {
            await tx.student_generations.deleteMany({
              where: { id: { in: fixtures.generations } },
            });
            await tx.majors.deleteMany({
              where: { id: { in: fixtures.majors } },
            });
            await tx.academic_years.deleteMany({
              where: { id: { in: fixtures.years } },
            });
            await tx.departments.delete({ where: { id: fixtures.department } });
          }
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('matches the frontend response contract with normalized, unique, sorted groups', async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expected(mainScope(), [
        'A',
        'B',
        'LAB 1',
        'ONLY-INACTIVE',
        'ONLY-PAUSED',
        '\u1780\u17d2\u179a\u17bb\u1798 \u1780',
      ]),
    );
    // Exact response equality also excludes student/account IDs, names and answers.
    expect(response.body.groups).not.toContain('DO-NOT-CARRY');
  });

  it.each([
    ['academic_year_id', 'OTHER-YEAR'],
    ['generation_id', 'OTHER-GENERATION'],
    ['major_id', 'OTHER-MAJOR'],
  ] as Array<[Field, string]>)(
    'isolates the selected %s',
    async (field, label) => {
      const f = fixtures!;
      const alternate = {
        academic_year_id: f.years[2].toString(),
        generation_id: f.generations[1].toString(),
        major_id: f.majors[1].toString(),
      };
      const query = { ...mainScope(), [field]: alternate[field] };
      const response = await get(query);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expected(query, [label]));
    },
  );

  it('does not invent a group from generation-based year progression', async () => {
    const query = {
      ...mainScope(),
      academic_year_id: fixtures!.years[2].toString(),
      major_id: fixtures!.majors[1].toString(),
    };
    const response = await get(query);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expected(query, []));
  });

  it.each(fields)(
    'returns an empty list for a well-formed nonexistent %s',
    async (field) => {
      const query = { ...mainScope(), [field]: '9000000000000000000' };
      const response = await get(query);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expected(query, []));
    },
  );

  it.each(['9007199254740993', '9223372036854775807'])(
    'preserves the exact string ID %s within signed BigInt storage range',
    async (id) => {
      const query = { academic_year_id: id, generation_id: id, major_id: id };
      const response = await get(query);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(expected(query, []));
    },
  );

  it('does not widen scope for unrelated extra query fields or pagination', async () => {
    const response = await get({
      ...mainScope(),
      year_level: '5',
      class_group: 'B',
      page: '1',
      limit: '1',
      status: 'ACTIVE',
    });
    expect(response.status).toBe(200);
    const ordinary = await get();
    expect(ordinary.status).toBe(200);
    expect(response.body).toEqual(ordinary.body);
  });

  it.each(['missing JWT', 'invalid JWT', 'STUDENT', 'LECTURER'])(
    'denies %s',
    async (kind) => {
      const response =
        kind === 'missing JWT'
          ? await api().get(endpoint).query(mainScope())
          : await get(
              mainScope(),
              kind === 'invalid JWT'
                ? 'not-a-token'
                : kind === 'STUDENT'
                  ? studentToken
                  : lecturerToken,
            );
      expect(response.status).toBe(kind.endsWith('JWT') ? 401 : 403);
      expect(response.body).not.toHaveProperty('groups');
    },
  );

  it.each(fields)('requires %s', async (field) => {
    const query: Partial<Scope> = mainScope();
    delete query[field];
    const response = await get(query);
    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining(field)]),
    );
  });

  const invalidCases = fields.flatMap((field) =>
    ['', '0', '-1', '1.5', '1e2', 'abc', ' 1', '01', '1,2'].map((value) => ({
      field,
      value,
    })),
  );
  it.each(invalidCases)('rejects $field=$value', async ({ field, value }) => {
    const response = await get({ ...mainScope(), [field]: value });
    expect(response.status).toBe(400);
    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining(field)]),
    );
  });

  it.each(fields)('rejects repeated %s query parameters', async (field) => {
    const params = new URLSearchParams(mainScope());
    params.append(field, mainScope()[field]);
    const response = await api()
      .get(`${endpoint}?${params}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(400);
  });

  it.each(fields)(
    'rejects out-of-storage-range %s with a client error',
    async (field) => {
      const response = await get({
        ...mainScope(),
        [field]: '9223372036854775808',
      });
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          `${field} must not exceed 9223372036854775807`,
        ]),
      );
    },
  );

  it.each(fields)(
    'rejects excessively long %s before database encoding',
    async (field) => {
      const response = await get({ ...mainScope(), [field]: '9'.repeat(1000) });
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          `${field} must not exceed 9223372036854775807`,
        ]),
      );
    },
  );

  it('documents required decimal-string IDs and the storage maximum in OpenAPI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const parameters = document.paths[endpoint].get!.parameters!;
    for (const field of fields) {
      const parameter = parameters.find(
        (value) => 'name' in value && value.name === field,
      );
      expect(parameter).toMatchObject({
        name: field,
        in: 'query',
        required: true,
        description: expect.stringContaining('9223372036854775807'),
        schema: {
          type: 'string',
          minLength: 1,
          maxLength: 19,
          pattern: '^[1-9]\\d*$',
        },
      });
    }
  });
});
