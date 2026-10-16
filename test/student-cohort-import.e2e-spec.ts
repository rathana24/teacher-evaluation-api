import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Major-aware student imports (real HTTP, owned migrated schema)', () => {
  const fixture = new CohortImportFixture();
  let app: INestApplication;
  let db: PrismaClient;
  const tokens: Record<string, string> = {};
  const majors: bigint[] = [];
  const years: bigint[] = [];
  const departments: bigint[] = [];
  let serial = 0;
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const row = (extra: Record<string, unknown> = {}) => ({
    student_code: `import-${++serial}`,
    full_name: 'Synthetic import student',
    major: 'DS',
    ...extra,
  });
  const payload = (extra: Record<string, unknown> = {}) => ({
    major_id: String(majors[0]),
    generation_number: 1,
    academic_year_id: String(years[1]),
    entry_academic_year_id: String(years[0]),
    year_level: 2,
    class_group: ' a  b ',
    initial_password: 'SyntheticImport123!',
    students: [row()],
    ...extra,
  });
  const send = (body: Record<string, unknown>, role = 'ADMIN') =>
    api().post('/api/students/import').set(auth(role)).send(body);
  async function unchanged(
    body: Record<string, unknown>,
    status = 400,
    role = 'ADMIN',
  ) {
    const before = await fixture.snapshot(db);
    const result = await send(body, role);
    expect(result.status).toBe(status);
    expect(await fixture.snapshot(db)).toEqual(before);
    return result;
  }
  function privateFields(value: unknown) {
    if (Array.isArray(value)) value.forEach(privateFields);
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'initial_password',
          'auth_version',
          'notes',
          'mapping_operation_id',
          'answers',
          'responses',
        ]).not.toContain(key);
        privateFields(child);
      }
    }
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    const password = await bcrypt.hash('SyntheticImport123!', 10);
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT'] as const)
      await db.users.create({
        data: {
          email: `${role.toLowerCase()}@example.test`,
          full_name: `Synthetic ${role}`,
          role,
          password_hash: password,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    for (const [index, status] of ['ACTIVE', 'INACTIVE'].entries())
      departments.push(
        (
          await db.departments.create({
            data: {
              code: `CI-${index}`,
              name: `Synthetic ${index}`,
              status: status as 'ACTIVE' | 'INACTIVE',
            },
          })
        ).id,
      );
    for (const [index, code] of ['DS', 'FE', 'INACTIVE'].entries())
      majors.push(
        (
          await db.majors.create({
            data: {
              code,
              name: `Synthetic ${code}`,
              department_id: departments[index === 2 ? 1 : 0],
            },
          })
        ).id,
      );
    for (const [index, start] of [2080, 2081, 2082, null].entries())
      years.push(
        (
          await db.academic_years.create({
            data: { name: `Synthetic year ${index}`, start_year: start },
          })
        ).id,
      );
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT']) {
      const result = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${role.toLowerCase()}@example.test`,
          password: 'SyntheticImport123!',
        });
      expect(result.status).toBe(200);
      tokens[role] = result.body.access_token;
    }
  }, 90000);
  afterEach(async () => {
    await fixture.unchangedPublic();
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture.close();
    }
  });

  it('imports DS/FE number 1 independently with explicit entry years, levels and INITIAL evidence', async () => {
    const bodies = [
      payload(),
      payload({
        major_id: String(majors[1]),
        entry_academic_year_id: String(years[1]),
        starting_year_level: 3,
        year_level: 3,
        students: [row({ major: ' fe ' })],
      }),
    ];
    const ids = [];
    for (const [index, body] of bodies.entries()) {
      const result = await send(body);
      expect(result.status).toBe(201);
      expect(result.body.summary).toEqual({
        total: 1,
        created: 1,
        skipped: 0,
        failed: 0,
      });
      expect(result.body.generation).toMatchObject({
        major_id: String(majors[index]),
        generation_number: 1,
        ownership_state: 'MAJOR_SCOPED',
        majors: { id: String(majors[index]) },
        entry_academic_year_id: String(years[index]),
        starting_year_level: index ? 3 : 1,
      });
      privateFields(result.body);
      ids.push(result.body.generation.id);
      const student = await db.students.findUniqueOrThrow({
        where: { id: BigInt(result.body.results[0].student_id) },
        include: {
          users: true,
          student_academic_records: {
            include: { cohort_assignment_event: true },
          },
        },
      });
      expect(student.generation_id.toString()).toBe(result.body.generation.id);
      expect(student.student_academic_records).toHaveLength(1);
      expect(student.student_academic_records[0]).toMatchObject({
        generation_id: student.generation_id,
        major_id: majors[index],
        year_level: index ? 3 : 2,
        class_group: 'A B',
        progression_action: 'NORMAL',
        cohort_assignment_event: {
          action: 'INITIAL',
          generation_id: student.generation_id,
          student_id: student.id,
          academic_year_id: years[1],
          mapping_operation_id: null,
        },
      });
      expect(
        await bcrypt.compare(
          'SyntheticImport123!',
          student.users.password_hash,
        ),
      ).toBe(true);
    }
    expect(ids[0]).not.toBe(ids[1]);
  });
  it('reuses only the requested major pair and never overwrites its saved entry metadata', async () => {
    const result = await send(
      payload({
        entry_academic_year_id: String(years[2]),
        starting_year_level: 5,
      }),
    );
    expect(result.status).toBe(201);
    expect(result.body.summary.created).toBe(1);
    expect(result.body.generation).toMatchObject({
      entry_academic_year_id: String(years[0]),
      starting_year_level: 1,
      major_id: String(majors[0]),
    });
  });
  it('retries a completed import as skipped without changing any rows or password hashes', async () => {
    const body = payload({ students: [row(), row()] });
    const first = await send(body);
    expect(first.body.summary.created).toBe(2);
    const users = await db.users.findMany({
      where: {
        student: {
          student_code: {
            in: body.students.map((value) => value.student_code),
          },
        },
      },
    });
    expect(users).toHaveLength(2);
    expect(users[0].password_hash).not.toBe(users[1].password_hash);
    const result = await unchanged(body, 201);
    expect(result.body.summary).toEqual({
      total: 2,
      created: 0,
      skipped: 2,
      failed: 0,
    });
    expect(result.body.generation.id).toBe(first.body.generation.id);
  });
  it('skips an existing code from another major without transferring its profile or history', async () => {
    const body = payload();
    const first = await send(body);
    expect(first.body.summary.created).toBe(1);
    const result = await unchanged(
      payload({
        major_id: String(majors[1]),
        students: [
          {
            ...body.students[0],
            major: 'FE',
            full_name: 'Changed name',
            notes: 'Changed note',
          },
        ],
        initial_password: 'DifferentPassword123!',
      }),
      201,
    );
    expect(result.body.summary.skipped).toBe(1);
  });
  it.each(['3', '03', 'Gen 003'])(
    'resolves alias %s within an explicit major',
    async (generation) => {
      const result = await send(
        payload({ generation_number: undefined, generation }),
      );
      expect(result.status).toBe(201);
      expect(result.body.summary.created).toBe(1);
      expect(result.body.generation.generation_number).toBe(3);
      expect(
        await db.student_generations.count({
          where: { major_id: majors[0], generation_number: 3 },
        }),
      ).toBe(1);
    },
  );
  it('accepts matching number and alias and normalizes an exact major name', async () => {
    const result = await send(
      payload({
        generation_number: 4,
        generation: 'Gen 04',
        students: [row({ major: '  synthetic   ds ' })],
      }),
    );
    expect(result.status).toBe(201);
    expect(result.body.summary.created).toBe(1);
  });
  it('commits one cohort for concurrent imports with different student codes', async () => {
    const results = await Promise.all([
      send(payload({ generation_number: 20 })),
      send(payload({ generation_number: 20 })),
    ]);
    expect(results.map((value) => value.status)).toEqual([201, 201]);
    expect(results.map((value) => value.body.summary.created)).toEqual([1, 1]);
    expect(results[0].body.generation.id).toBe(results[1].body.generation.id);
    expect(
      await db.student_generations.count({
        where: { major_id: majors[0], generation_number: 20 },
      }),
    ).toBe(1);
  });
  it('creates a competing student code once and returns a safe skipped result to the other request', async () => {
    const body = payload({ generation_number: 21 });
    const results = await Promise.all([send(body), send(body)]);
    expect(results.map((value) => value.status)).toEqual([201, 201]);
    expect(
      results.reduce((sum, value) => sum + value.body.summary.created, 0),
    ).toBe(1);
    expect(
      results.reduce((sum, value) => sum + value.body.summary.skipped, 0),
    ).toBe(1);
    expect(
      results.reduce((sum, value) => sum + value.body.summary.failed, 0),
    ).toBe(0);
  });
  it('returns a safe conflict after bounded cohort-lock contention without writes', async () => {
    let release!: () => void;
    let ready!: () => void;
    const unlocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const locked = new Promise<void>((resolve) => {
      ready = resolve;
    });
    const holder = db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`cohort-import:${majors[0]}:90`}, 0))::text`;
        ready();
        await unlocked;
      },
      { timeout: 20000 },
    );
    await locked;
    try {
      const result = await unchanged(payload({ generation_number: 90 }), 409);
      expect(result.body.message).toBe(
        'Cohort import conflicted; review and retry',
      );
    } finally {
      release();
      await holder;
    }
  }, 15000);
  it('reuses a saved cohort without entry metadata and preserves the blank-password compatibility default', async () => {
    const result = await send(
      payload({ entry_academic_year_id: undefined, initial_password: '   ' }),
    );
    expect(result.status).toBe(201);
    expect(result.body.summary.created).toBe(1);
    const student = await db.students.findUniqueOrThrow({
      where: { id: BigInt(result.body.results[0].student_id) },
      include: { users: true },
    });
    expect(
      await bcrypt.compare('password@1235', student.users.password_hash),
    ).toBe(true);
    expect(result.body.generation.entry_academic_year_id).toBe(
      String(years[0]),
    );
  });
  it('accepts the maximum integer cohort number and preserves an intentionally blank yearly group', async () => {
    const result = await send(
      payload({ generation_number: 2147483647, class_group: '   ' }),
    );
    expect(result.status).toBe(201);
    expect(result.body.generation.generation_number).toBe(2147483647);
    expect(result.body.summary.created).toBe(1);
    const record = await db.student_academic_records.findFirstOrThrow({
      where: { student_id: BigInt(result.body.results[0].student_id) },
    });
    expect(record.class_group).toBeNull();
  });
  it('does not resolve or relabel a same-name legacy cohort', async () => {
    const legacy = await db.student_generations.create({
      data: { name: 'Gen 30', entry_academic_year_id: years[0] },
    });
    const result = await send(payload({ generation_number: 30 }));
    expect(result.body.summary.created).toBe(1);
    expect(result.body.generation.id).not.toBe(String(legacy.id));
    expect(
      await db.student_generations.findUnique({ where: { id: legacy.id } }),
    ).toEqual(legacy);
  });
  const invalid: Array<[string, Record<string, unknown>]> = [
    ['missing major', { major_id: undefined }],
    ['null major', { major_id: null }],
    ['numeric major', { major_id: 1 }],
    ['zero major', { major_id: '0' }],
    ['overflow major', { major_id: '9223372036854775808' }],
    ['missing number', { generation_number: undefined }],
    ['null number', { generation_number: null }],
    ['string number', { generation_number: '1' }],
    ['zero number', { generation_number: 0 }],
    ['negative number', { generation_number: -1 }],
    ['fraction number', { generation_number: 1.5 }],
    ['overflow number', { generation_number: 2147483648 }],
    [
      'arbitrary alias',
      { generation_number: undefined, generation: 'Cohort A' },
    ],
    ['disagreeing alias', { generation: 'Gen 9' }],
    ['null alias', { generation: null }],
    ['null entry year', { entry_academic_year_id: null }],
    ['overflow entry year', { entry_academic_year_id: '9223372036854775808' }],
    ['numeric placement year', { academic_year_id: 1 }],
    ['overflow placement year', { academic_year_id: '9223372036854775808' }],
    ['null starting level', { starting_year_level: null }],
    ['zero starting level', { starting_year_level: 0 }],
    ['sixth year', { year_level: 6 }],
    ['blank code', { students: [{ student_code: '  ', major: 'DS' }] }],
    ['null password', { initial_password: null }],
    ['UTF8 password overflow', { initial_password: '🎓'.repeat(19) }],
    ['empty rows', { students: [] }],
  ];
  it.each(invalid)('rejects %s before any writes', async (_label, extra) => {
    await unchanged(payload(extra));
  });
  it('rejects mixed-major batches before creating even a cohort or first student', async () => {
    await unchanged(
      payload({
        generation_number: 40,
        students: [row(), row({ major: 'FE' })],
      }),
    );
  });
  it('rejects an unknown spreadsheet major before any writes', async () => {
    await unchanged(
      payload({ generation_number: 41, students: [row({ major: 'UNKNOWN' })] }),
    );
  });
  it('rejects ambiguous spreadsheet major names before any writes', async () => {
    await db.majors.createMany({
      data: [
        { code: 'DUP-A', name: 'Ambiguous', department_id: departments[0] },
        { code: 'DUP-B', name: 'Ambiguous', department_id: departments[1] },
      ],
    });
    await unchanged(
      payload({
        generation_number: 42,
        students: [row({ major: 'Ambiguous' })],
      }),
      409,
    );
  });
  it('rejects an inactive major department before any writes', async () => {
    await unchanged(
      payload({
        major_id: String(majors[2]),
        students: [row({ major: 'INACTIVE' })],
      }),
    );
  });
  it('rejects a missing major before any writes', async () => {
    await unchanged(payload({ major_id: '9000000000000000000' }), 404);
  });
  it('rejects a missing placement year before any writes', async () => {
    await unchanged(payload({ academic_year_id: '9000000000000000000' }), 404);
  });
  it('rejects a missing entry year for a new pair before any writes', async () => {
    await unchanged(
      payload({ generation_number: 43, entry_academic_year_id: undefined }),
    );
  });
  it('rejects an absent entry year reference before any writes', async () => {
    await unchanged(
      payload({
        generation_number: 44,
        entry_academic_year_id: '9000000000000000000',
      }),
      404,
    );
  });
  it('rejects a future entry year before any writes', async () => {
    await unchanged(
      payload({
        generation_number: 45,
        entry_academic_year_id: String(years[2]),
      }),
    );
  });
  it('rejects unstructured entry years before any writes', async () => {
    await unchanged(
      payload({
        generation_number: 46,
        entry_academic_year_id: String(years[3]),
      }),
    );
  });
  it('rejects unstructured placement years before any writes', async () => {
    await unchanged(payload({ academic_year_id: String(years[3]) }));
  });
  it('rejects duplicate normalized student codes before any writes', async () => {
    await unchanged(
      payload({
        generation_number: 47,
        students: [
          row({ student_code: ' Dup ' }),
          row({ student_code: 'dup' }),
        ],
      }),
    );
  });
  it('rejects 501 rows before any writes', async () => {
    await unchanged(
      payload({ students: Array.from({ length: 501 }, () => row()) }),
    );
  });
  it('accepts exactly 500 valid skipped rows without modifying existing accounts or placements', async () => {
    const users = await db.users.createManyAndReturn({
      data: Array.from({ length: 500 }, (_, index) => ({
        full_name: `Synthetic existing ${index}`,
        role: 'STUDENT' as const,
        password_hash: 'Synthetic-not-a-login-hash',
        created_at: new Date(),
        updated_at: new Date(),
      })),
      select: { id: true },
    });
    const cohort = await db.student_generations.findUniqueOrThrow({
      where: {
        major_id_generation_number: {
          major_id: majors[0],
          generation_number: 1,
        },
      },
    });
    await db.students.createMany({
      data: users.map((user, index) => ({
        user_id: user.id,
        generation_id: cohort.id,
        student_code: `boundary-${index}`,
      })),
    });
    const result = await unchanged(
      payload({
        students: users.map((_user, index) =>
          row({ student_code: `boundary-${index}` }),
        ),
      }),
      201,
    );
    expect(result.body.summary).toEqual({
      total: 500,
      created: 0,
      skipped: 500,
      failed: 0,
    });
  });
  it('rolls back account/profile/placement when assignment evidence fails and preserves other row successes', async () => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION reject_owned_import() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS (SELECT 1 FROM students WHERE id=NEW.student_id AND student_code='audit-fail') THEN RAISE EXCEPTION 'Synthetic private failure'; END IF; RETURN NEW; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER reject_owned_import BEFORE INSERT ON student_cohort_assignment_events FOR EACH ROW EXECUTE FUNCTION reject_owned_import()',
    );
    const before = {
      users: await db.users.count(),
      profiles: await db.students.count(),
      placements: await db.student_academic_records.count(),
      events: await db.student_cohort_assignment_events.count(),
    };
    try {
      const result = await send(
        payload({ students: [row({ student_code: 'audit-fail' }), row()] }),
      );
      expect(result.status).toBe(201);
      expect(result.body.summary).toEqual({
        total: 2,
        created: 1,
        skipped: 0,
        failed: 1,
      });
      expect(result.body.results[0]).toMatchObject({
        status: 'FAILED',
        message: 'Student could not be imported',
      });
      expect(JSON.stringify(result.body)).not.toContain(
        'Synthetic private failure',
      );
      expect(
        await db.students.count({ where: { student_code: 'audit-fail' } }),
      ).toBe(0);
      expect(await db.users.count()).toBe(before.users + 1);
      expect(await db.students.count()).toBe(before.profiles + 1);
      expect(await db.student_academic_records.count()).toBe(
        before.placements + 1,
      );
      expect(await db.student_cohort_assignment_events.count()).toBe(
        before.events + 1,
      );
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER reject_owned_import ON student_cohort_assignment_events',
      );
      await db.$executeRawUnsafe('DROP FUNCTION reject_owned_import()');
    }
  });
  it('preserves major and academic-year IDs beyond JavaScript safe integer precision', async () => {
    const id = 9007199254740993n;
    await db.majors.create({
      data: {
        id,
        code: 'BIG',
        name: 'BigInt major',
        department_id: departments[0],
      },
    });
    await db.academic_years.create({
      data: { id, name: 'BigInt year', start_year: 2080 },
    });
    const result = await send(
      payload({
        major_id: String(id),
        academic_year_id: String(id),
        entry_academic_year_id: String(id),
        students: [row({ major: 'BIG' })],
      }),
    );
    expect(result.status).toBe(201);
    expect(result.body.summary.created).toBe(1);
    expect(result.body.generation.major_id).toBe(String(id));
    expect(result.body.academic_year.id).toBe(String(id));
    const record = await db.student_academic_records.findFirstOrThrow({
      where: { student_id: BigInt(result.body.results[0].student_id) },
      include: { cohort_assignment_event: true },
    });
    expect(record.major_id).toBe(id);
    expect(record.academic_year_id).toBe(id);
    expect(record.cohort_assignment_event!.major_id).toBe(id);
  });
  it.each(['LECTURER', 'STUDENT'])(
    'denies %s import writes without side effects',
    async (role) => {
      await unchanged(payload(), 403, role);
    },
  );
  it('denies anonymous imports without writes', async () => {
    const before = await fixture.snapshot(db);
    expect(
      (await api().post('/api/students/import').send(payload())).status,
    ).toBe(401);
    expect(await fixture.snapshot(db)).toEqual(before);
  });
  it('documents the major-aware contract and keeps the full capability disabled', async () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const dto = doc.components!.schemas!.ImportStudentsDto as {
      properties: Record<string, { type: string; maximum?: number }>;
    };
    expect(dto.properties.major_id.type).toBe('string');
    expect(dto.properties.generation_number).toMatchObject({
      type: 'number',
      maximum: 2147483647,
    });
    expect(doc.paths['/api/students/import'].post?.description).toContain(
      'INITIAL',
    );
    const me = await api().get('/api/auth/me').set(auth());
    expect(me.status).toBe(200);
    expect(me.body.capabilities.major_scoped_generations).not.toBe(true);
  });
});
