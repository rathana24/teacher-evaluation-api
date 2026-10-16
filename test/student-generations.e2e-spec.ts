import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma, user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Major-scoped cohort catalog (real HTTP)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const marker = `GC${Date.now()}`;
  const tokens: Record<string, string> = {};
  let original: Awaited<ReturnType<typeof hashes>>;
  let f: {
    users: bigint[];
    departments: bigint[];
    majors: bigint[];
    years: bigint[];
    legacy: bigint;
    profile: bigint;
  };
  const tables = Prisma.dmmf.datamodel.models
    .map((row) => row.dbName || row.name)
    .sort();
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const payload = (extra: Record<string, unknown> = {}) => ({
    major_id: String(f.majors[0]),
    generation_number: 1,
    entry_academic_year_id: String(f.years[0]),
    ...extra,
  });
  async function hashes() {
    const result = [];
    for (const table of [...tables, '_prisma_migrations'])
      result.push({
        table,
        rows: await db.$queryRaw<Array<{ hash: string }>>(
          Prisma.sql`SELECT md5(to_jsonb(t)::text) AS hash FROM ${Prisma.raw(`public."${table}"`)} t ORDER BY 1`,
        ),
      });
    return result;
  }
  async function unchanged(operation: () => PromiseLike<request.Response>) {
    const before = await hashes();
    const result = await operation();
    expect(await hashes()).toEqual(before);
    return result;
  }
  async function retained() {
    const current = await hashes();
    for (const table of original) {
      const actual = new Set(
        current
          .find((row) => row.table === table.table)!
          .rows.map((row) => row.hash),
      );
      expect(table.rows.filter((row) => !actual.has(row.hash))).toEqual([]);
    }
  }
  async function create(extra: Record<string, unknown> = {}) {
    const result = await api()
      .post('/api/student-generations')
      .set(auth())
      .send(payload(extra));
    expect(result.status).toBe(201);
    return result.body as {
      id: string;
      generation_number: number;
      major_id: string;
      entry_academic_year_id: string;
      starting_year_level: number;
      name: string;
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
    db = app.get(PrismaService);
    const [context] = await db.$queryRaw<
      Array<{ database: string; schema: string }>
    >`SELECT current_database() AS database,current_schema() AS schema`;
    expect(context).toEqual({
      database: 'teacher_evaluation_test',
      schema: 'public',
    });
    original = await hashes();
    const now = new Date();
    const password = await bcrypt.hash('SyntheticCatalog123!', 10);
    const users = [];
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT'] as const)
      users.push(
        (
          await db.users.create({
            data: {
              email: `${marker.toLowerCase()}-${role.toLowerCase()}@example.test`,
              full_name: `${marker} ${role}`,
              password_hash: password,
              role: role as user_role,
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    const departments = [];
    for (const [index, status] of ['ACTIVE', 'INACTIVE'].entries())
      departments.push(
        (
          await db.departments.create({
            data: {
              code: `${marker}-${index}`,
              name: `${marker} ${index}`,
              status: status as 'ACTIVE' | 'INACTIVE',
            },
          })
        ).id,
      );
    const majors = [];
    for (const [index, code] of ['DS', 'FE', 'EMPTY', 'INACTIVE'].entries())
      majors.push(
        (
          await db.majors.create({
            data: {
              code: `${marker}-${code}`,
              name: `${marker} ${code}`,
              department_id: departments[index === 3 ? 1 : 0],
            },
          })
        ).id,
      );
    const years = [];
    for (const [index, start] of [2090, 2091, null].entries())
      years.push(
        (
          await db.academic_years.create({
            data: { name: `${marker}-${index}`, start_year: start },
          })
        ).id,
      );
    const legacy = await db.student_generations.create({
      data: { name: `${marker} legacy`, entry_academic_year_id: years[0] },
    });
    const profile = await db.students.create({
      data: {
        user_id: users[2],
        student_code: marker,
        generation_id: legacy.id,
        created_at: now,
        updated_at: now,
      },
    });
    f = {
      users,
      departments,
      majors,
      years,
      legacy: legacy.id,
      profile: profile.id,
    };
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT']) {
      const login = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${marker.toLowerCase()}-${role.toLowerCase()}@example.test`,
          password: 'SyntheticCatalog123!',
        });
      expect(login.status).toBe(200);
      tokens[role] = login.body.access_token;
    }
  }, 30000);
  afterEach(async () => {
    await retained();
  });
  afterAll(async () => {
    try {
      if (f) {
        await db.students.delete({ where: { id: f.profile } });
        await db.student_generations.deleteMany({
          where: { OR: [{ id: f.legacy }, { major_id: { in: f.majors } }] },
        });
        await db.majors.deleteMany({ where: { id: { in: f.majors } } });
        await db.academic_years.deleteMany({ where: { id: { in: f.years } } });
        await db.departments.deleteMany({
          where: { id: { in: f.departments } },
        });
        await db.users.deleteMany({ where: { id: { in: f.users } } });
        expect(await hashes()).toEqual(original);
      }
    } finally {
      await app?.close();
    }
  });
  it('creates independent DS/FE number 1 cohorts and reports integer metadata with string IDs', async () => {
    const ds = await create();
    const fe = await create({
      major_id: String(f.majors[1]),
      entry_academic_year_id: String(f.years[1]),
      starting_year_level: 3,
    });
    expect(ds.id).not.toBe(fe.id);
    expect(ds.generation_number).toBe(1);
    expect(fe.generation_number).toBe(1);
    expect(ds.entry_academic_year_id).not.toBe(fe.entry_academic_year_id);
    expect(fe.starting_year_level).toBe(3);
    for (const row of [ds, fe]) {
      const detail = await unchanged(() =>
        api().get(`/api/student-generations/${row.id}`).set(auth()),
      );
      expect(detail.status).toBe(200);
      expect(detail.body).toMatchObject({
        id: row.id,
        ownership_state: 'MAJOR_SCOPED',
        generation_number: 1,
        major_id: row.major_id,
        majors: { id: row.major_id },
      });
      expect(detail.body).not.toHaveProperty('mapping_operation_id');
    }
  });
  it('rejects an existing major/number pair with COHORT_EXISTS and no writes', async () => {
    const result = await unchanged(() =>
      api().post('/api/student-generations').set(auth()).send(payload()),
    );
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('COHORT_EXISTS');
  });
  it('normalizes numeric compatibility aliases only inside an explicit major', async () => {
    for (const [index, name] of ['05', 'Gen 6', '  007  '].entries()) {
      const result = await create({ generation_number: undefined, name });
      expect(result.generation_number).toBe(index + 5);
      expect(result.name).toBe(`Gen ${index + 5}`);
    }
  });
  it('accepts matching alias/number and defaults starting level to one', async () => {
    const result = await create({ generation_number: 8, name: 'Gen 08' });
    expect(result.starting_year_level).toBe(1);
    expect(result.generation_number).toBe(8);
  });
  it('sorts 2 before 10 inside a major and filters by stored major ownership', async () => {
    await create({ generation_number: 10 });
    await create({ generation_number: 2 });
    const result = await unchanged(() =>
      api()
        .get('/api/student-generations')
        .query({ major_id: String(f.majors[0]) })
        .set(auth()),
    );
    expect(result.status).toBe(200);
    expect(
      result.body.map(
        (row: { generation_number: number }) => row.generation_number,
      ),
    ).toEqual([1, 2, 5, 6, 7, 8, 10]);
    expect(
      result.body.every(
        (row: { major_id: string }) => row.major_id === String(f.majors[0]),
      ),
    ).toBe(true);
  });
  it('returns an explicit empty major catalog without advertising the unfinished capability', async () => {
    const list = await unchanged(() =>
      api()
        .get('/api/student-generations')
        .query({ major_id: String(f.majors[2]) })
        .set(auth()),
    );
    expect(list.body).toEqual([]);
    const me = await unchanged(() => api().get('/api/auth/me').set(auth()));
    expect(me.body.capabilities.major_scoped_generations).not.toBe(true);
  });
  const invalid: Array<[string, Record<string, unknown>]> = [
    ['missing major', { major_id: undefined }],
    ['null major', { major_id: null }],
    ['numeric major', { major_id: 1 }],
    ['unsafe major', { major_id: 9007199254740992 }],
    ['overflow major', { major_id: '9223372036854775808' }],
    ['zero major', { major_id: '0' }],
    ['negative major', { major_id: '-1' }],
    ['missing number', { generation_number: undefined }],
    ['null number', { generation_number: null }],
    ['string number', { generation_number: '1' }],
    ['zero number', { generation_number: 0 }],
    ['negative number', { generation_number: -1 }],
    ['fractional number', { generation_number: 1.5 }],
    ['overflow number', { generation_number: 2147483648 }],
    ['arbitrary alias', { generation_number: undefined, name: 'Cohort Alpha' }],
    ['empty alias', { generation_number: undefined, name: ' ' }],
    ['mismatched alias', { generation_number: 20, name: 'Gen 21' }],
    ['null alias', { name: null }],
    ['long alias', { generation_number: undefined, name: '1'.repeat(101) }],
    ['null entry year', { entry_academic_year_id: null }],
    ['numeric entry year', { entry_academic_year_id: 1 }],
    ['overflow entry year', { entry_academic_year_id: '9223372036854775808' }],
    ['zero starting level', { starting_year_level: 0 }],
    ['overflow starting level', { starting_year_level: 6 }],
    ['null starting level', { starting_year_level: null }],
    ['string starting level', { starting_year_level: '1' }],
  ];
  for (const [name, extra] of invalid)
    it(`rejects ${name} before writes`, async () => {
      const result = await unchanged(() =>
        api().post('/api/student-generations').set(auth()).send(payload(extra)),
      );
      expect(result.status).toBe(400);
    });
  it('rejects missing major/year and an unstructured or inactive parent', async () => {
    for (const [extra, status] of [
      [{ major_id: '9223372036854775807' }, 404],
      [{ entry_academic_year_id: '9223372036854775807' }, 404],
      [{ entry_academic_year_id: String(f.years[2]) }, 400],
      [{ major_id: String(f.majors[3]) }, 400],
    ] as const) {
      const result = await unchanged(() =>
        api()
          .post('/api/student-generations')
          .set(auth())
          .send(payload({ ...extra, generation_number: 30 })),
      );
      expect(result.status).toBe(status);
    }
  });
  it('accepts maximum INTEGER without confusing it with the database primary key', async () => {
    const result = await create({ generation_number: 2147483647 });
    expect(result.generation_number).toBe(2147483647);
    expect(result.id).not.toBe('2147483647');
  });
  it('serializes concurrent duplicate POSTs with one success and one conflict', async () => {
    const results = await Promise.all([
      api()
        .post('/api/student-generations')
        .set(auth())
        .send(payload({ generation_number: 40 })),
      api()
        .post('/api/student-generations')
        .set(auth())
        .send(payload({ generation_number: 40 })),
    ]);
    expect(results.map((row) => row.status).sort()).toEqual([201, 409]);
    expect(
      await db.student_generations.count({
        where: { major_id: f.majors[0], generation_number: 40 },
      }),
    ).toBe(1);
  });
  it('preserves canonical identity on no-op updates and rejects relabeling without writes', async () => {
    const row = await create({ generation_number: 50 });
    const same = await unchanged(() =>
      api()
        .put(`/api/student-generations/${row.id}`)
        .set(auth())
        .send(payload({ generation_number: 50 })),
    );
    expect(same.status).toBe(200);
    for (const extra of [
      { major_id: String(f.majors[1]) },
      { generation_number: 51 },
      { entry_academic_year_id: String(f.years[1]) },
      { starting_year_level: 2 },
    ]) {
      const result = await unchanged(() =>
        api().put(`/api/student-generations/${row.id}`).set(auth()).send(extra),
      );
      expect(result.status).toBe(409);
      expect(result.body.code).toBe('COHORT_IDENTITY_IMMUTABLE');
    }
  });
  it('keeps legacy ownership unknown, preserves label edits and refuses unreviewed conversion', async () => {
    const detail = await unchanged(() =>
      api().get(`/api/student-generations/${f.legacy}`).set(auth()),
    );
    expect(detail.body).toMatchObject({
      major_id: null,
      generation_number: null,
      ownership_state: 'LEGACY_READ_ONLY',
      majors: null,
    });
    expect(
      (
        await api()
          .put(`/api/student-generations/${f.legacy}`)
          .set(auth())
          .send({ name: `${marker} renamed` })
      ).status,
    ).toBe(200);
    const result = await unchanged(() =>
      api()
        .put(`/api/student-generations/${f.legacy}`)
        .set(auth())
        .send({ major_id: String(f.majors[0]), generation_number: 99 }),
    );
    expect(result.status).toBe(409);
    expect(result.body.code).toBe('COHORT_MAPPING_REQUIRED');
  });
  for (const field of [
    'name',
    'major_id',
    'generation_number',
    'entry_academic_year_id',
    'starting_year_level',
  ])
    it(`rejects explicit null ${field} on update`, async () => {
      const result = await unchanged(() =>
        api()
          .put(`/api/student-generations/${f.legacy}`)
          .set(auth())
          .send({ [field]: null }),
      );
      expect(result.status).toBe(400);
    });
  it('deletes an unused canonical cohort and protects a referenced legacy cohort', async () => {
    const row = await create({ generation_number: 60 });
    expect(
      (await api().delete(`/api/student-generations/${row.id}`).set(auth()))
        .status,
    ).toBe(200);
    const result = await unchanged(() =>
      api().delete(`/api/student-generations/${f.legacy}`).set(auth()),
    );
    expect(result.status).toBe(409);
  });
  for (const role of ['LECTURER', 'STUDENT'])
    it(`allows ${role} catalog reads and denies writes`, async () => {
      expect(
        (
          await unchanged(() =>
            api().get('/api/student-generations').set(auth(role)),
          )
        ).status,
      ).toBe(200);
      for (const method of ['post', 'put', 'delete'] as const) {
        const path =
          method === 'post'
            ? '/api/student-generations'
            : `/api/student-generations/${f.legacy}`;
        const result = await unchanged(() =>
          api()
            [method](path)
            .set(auth(role))
            .send(payload({ generation_number: 70 })),
        );
        expect(result.status).toBe(403);
      }
    });
  it('rejects unauthenticated reads and writes without changes', async () => {
    expect(
      (await unchanged(() => api().get('/api/student-generations'))).status,
    ).toBe(401);
    expect(
      (
        await unchanged(() =>
          api()
            .post('/api/student-generations')
            .send(payload({ generation_number: 71 })),
        )
      ).status,
    ).toBe(401);
  });
  for (const value of [
    '0',
    '-1',
    '1.5',
    '9223372036854775808',
    '1'.repeat(200),
  ])
    it(`rejects invalid catalog path/filter ${value.slice(0, 22)}`, async () => {
      for (const path of [
        `/api/student-generations/${value}`,
        `/api/student-generations?major_id=${value}`,
      ])
        expect(
          (await unchanged(() => api().get(path).set(auth()))).status,
        ).toBe(400);
    });
  it('never resolves a canonical display name through the legacy import path', async () => {
    const cohort = await create({ generation_number: 2147483001 });
    const result = await unchanged(() =>
      api()
        .post('/api/students/import')
        .set(auth())
        .send({
          generation: cohort.name,
          academic_year_id: String(f.years[0]),
          year_level: 1,
          class_group: 'A',
          students: [
            { student_code: `${marker}-IMPORT`, major: `${marker}-DS` },
          ],
        }),
    );
    expect(result.status).toBe(400);
    expect(result.body.message).toBe(
      'entry_academic_year_id is required when creating a new student generation',
    );
  });
  it('documents explicit major, integer number, bounds and unchanged identity in OpenAPI', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const dto = document.components!.schemas!.CreateStudentGenerationDto as {
      required: string[];
      properties: Record<string, { type: string; maximum?: number }>;
    };
    expect(dto.required).toEqual(
      expect.arrayContaining(['major_id', 'entry_academic_year_id']),
    );
    expect(dto.properties.generation_number).toMatchObject({
      type: 'number',
      maximum: 2147483647,
    });
    expect(
      document.paths['/api/student-generations'].post?.description,
    ).toContain('explicit major');
  });
});
