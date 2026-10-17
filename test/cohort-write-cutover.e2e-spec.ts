import { backendCapabilities } from '../src/auth/backend-capabilities';
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

describe('Controlled cohort write cutover (owned schema HTTP)', () => {
  const fixture = new CohortImportFixture();
  const original = process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
  let app: INestApplication, db: PrismaClient;
  const tokens: Record<string, string> = {};
  const majors: bigint[] = [],
    years: bigint[] = [],
    cohorts: bigint[] = [];
  let legacy: bigint, legacyStudent: bigint, legacyRecord: bigint;
  let serial = 0;
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const strict = () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
  };
  const post = (path: string, body: object, role = 'ADMIN') =>
    api().post(`/api/${path}`).set(auth(role)).send(body);
  const me = (role = 'ADMIN') => api().get('/api/auth/me').set(auth(role));
  const studentBody = (extra: object = {}) => ({
    student_code: `CUT-${++serial}`,
    full_name: 'Synthetic cutover student',
    password: 'SyntheticCutover123!',
    generation_id: String(cohorts[0]),
    academic_year_id: String(years[0]),
    major_id: String(majors[0]),
    year_level: 1,
    class_group: 'A',
    ...extra,
  });
  const importBody = (extra: object = {}) => ({
    major_id: String(majors[0]),
    generation_number: 1,
    academic_year_id: String(years[0]),
    year_level: 1,
    class_group: 'A',
    initial_password: 'SyntheticCutover123!',
    students: [
      {
        student_code: `CUT-I-${++serial}`,
        full_name: 'Synthetic imported student',
        major: 'CUT-DS',
      },
    ],
    ...extra,
  });
  const placementBody = (id: string | bigint, extra: object = {}) => ({
    student_id: String(id),
    academic_year_id: String(years[1]),
    major_id: String(majors[0]),
    year_level: 2,
    class_group: 'B',
    progression_action: 'NORMAL',
    ...extra,
  });
  async function unchanged(
    operation: () => PromiseLike<request.Response>,
    status: number,
    code?: string,
  ) {
    const before = await fixture.snapshot(db);
    const result = await operation();
    expect(result.status).toBe(status);
    if (code) expect(result.body.code).toBe(code);
    expect(await fixture.snapshot(db)).toEqual(before);
    return result;
  }
  beforeAll(async () => {
    delete process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
    await fixture.open();
    db = fixture.db;
    const password_hash = await bcrypt.hash('SyntheticCutover123!', 4);
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT'] as const)
      await db.users.create({
        data: {
          role,
          email: `${role.toLowerCase()}@cutover.example.test`,
          full_name: `Synthetic ${role}`,
          password_hash,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
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
      const response = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${role.toLowerCase()}@cutover.example.test`,
          password: 'SyntheticCutover123!',
        });
      expect(response.status).toBe(200);
      tokens[role] = response.body.access_token;
    }
  }, 90000);
  beforeEach(() => {
    delete process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
  });
  afterEach(async () => {
    await fixture.unchangedPublic();
  });
  afterAll(async () => {
    if (original === undefined) delete process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
    else process.env.REQUIRE_MAJOR_SCOPED_COHORTS = original;
    try {
      await app?.close();
    } finally {
      await fixture.close();
    }
  });

  it.each(['ADMIN', 'LECTURER', 'STUDENT'])(
    'advertises write support for %s on an empty migrated installation',
    async (role) => {
      strict();
      expect(await db.student_generations.count()).toBe(0);
      const response = await unchanged(() => me(role), 200);
      expect(response.body.capabilities).toEqual({
        ...backendCapabilities,
        change_password: true,
        automatic_course_codes_v1: true,
        reviewed_assignment_enrollment_v1: true,
        major_scoped_generations: true,
      });
      if (role === 'STUDENT') expect(response.body.student).toBeNull();
      expect(response.body).not.toHaveProperty('password_hash');
    },
  );

  describe('populated legacy and major-owned histories', () => {
    beforeAll(async () => {
      const department = await db.departments.create({
        data: { code: 'CUT', name: 'Synthetic cutover', status: 'ACTIVE' },
      });
      for (const code of ['CUT-DS', 'CUT-FE'])
        majors.push(
          (
            await db.majors.create({
              data: { code, name: code, department_id: department.id },
            })
          ).id,
        );
      for (const start_year of [2090, 2091, 2092])
        years.push(
          (
            await db.academic_years.create({
              data: { name: `Cutover ${start_year}`, start_year },
            })
          ).id,
        );
      for (const major_id of majors)
        cohorts.push(
          (
            await db.student_generations.create({
              data: {
                name: 'Gen 1',
                major_id,
                generation_number: 1,
                ownership_state: 'MAJOR_SCOPED',
                entry_academic_year_id: years[0],
              },
            })
          ).id,
        );
      legacy = (
        await db.student_generations.create({
          data: {
            name: 'Unresolved cutover',
            entry_academic_year_id: years[0],
          },
        })
      ).id;
      const user = await db.users.create({
        data: {
          role: 'STUDENT',
          full_name: 'Synthetic unresolved history',
          password_hash: 'not-a-login-hash',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      legacyStudent = (
        await db.students.create({
          data: {
            user_id: user.id,
            generation_id: legacy,
            student_code: 'CUT-OLD',
          },
        })
      ).id;
      legacyRecord = (
        await db.student_academic_records.create({
          data: {
            student_id: legacyStudent,
            academic_year_id: years[0],
            major_id: majors[0],
            year_level: 1,
            class_group: 'OLD',
          },
        })
      ).id;
    });
    it.each([undefined, 'false', 'TRUE', '1'])(
      'keeps capability absent under compatibility mode %s',
      async (value) => {
        if (value !== undefined)
          process.env.REQUIRE_MAJOR_SCOPED_COHORTS = value;
        const response = await unchanged(() => me(), 200);
        expect(response.body.capabilities).toEqual({
          ...backendCapabilities,
          change_password: true,
          automatic_course_codes_v1: true,
          reviewed_assignment_enrollment_v1: true,
        });
      },
    );
    it('can opt in and return to compatibility without rewriting records', async () => {
      strict();
      expect(
        (await unchanged(() => me(), 200)).body.capabilities
          .major_scoped_generations,
      ).toBe(true);
      process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'false';
      expect(
        (await unchanged(() => me(), 200)).body.capabilities,
      ).not.toHaveProperty('major_scoped_generations');
    });
    it('preserves the disabled test-only mapping switch independently of strict write mode', async () => {
      strict();
      await unchanged(
        () =>
          api().get('/api/student-generations/mapping/inventory').set(auth()),
        503,
        'COHORT_MAPPING_DISABLED',
      );
    });
    it('keeps existing legacy student creation compatible before cutover', async () => {
      const result = await post(
        'students',
        studentBody({ generation_id: String(legacy) }),
      );
      expect(result.status).toBe(201);
      expect(result.body.student_academic_records[0].generation_id).toBeNull();
      expect(
        await db.student_cohort_assignment_events.count({
          where: { student_id: BigInt(result.body.id) },
        }),
      ).toBe(0);
    });
    it('keeps legacy import compatible before cutover', async () => {
      const body = importBody({
        major_id: undefined,
        generation_number: undefined,
        generation: 'Unresolved cutover',
      });
      const result = await post('students/import', body);
      expect(result.status).toBe(201);
      expect(result.body.summary.created).toBe(1);
    });
    it('keeps new unresolved yearly placements compatible before cutover', async () => {
      const response = await post(
        'student-academic-records',
        placementBody(legacyStudent),
      );
      expect(response.status).toBe(201);
      expect(response.body.generation_id).toBeNull();
    });
    it('rejects new legacy student creation before account/profile/history writes', async () => {
      strict();
      await unchanged(
        () => post('students', studentBody({ generation_id: String(legacy) })),
        400,
        'MAJOR_SCOPED_COHORT_REQUIRED',
      );
    });
    it.each(['Unresolved cutover', 'Never create this legacy label', 'Gen 1'])(
      'rejects unscoped import %s without guessing ownership or creating a label',
      async (generation) => {
        strict();
        await unchanged(
          () =>
            post(
              'students/import',
              importBody({
                major_id: undefined,
                generation_number: undefined,
                generation,
              }),
            ),
          400,
          'MAJOR_SCOPED_COHORT_REQUIRED',
        );
      },
    );
    it('rejects skip-only unscoped retry instead of reporting a successful legacy import', async () => {
      strict();
      await unchanged(
        () =>
          post(
            'students/import',
            importBody({
              major_id: undefined,
              generation_number: undefined,
              generation: 'Unresolved cutover',
              students: [
                {
                  student_code: 'CUT-OLD',
                  full_name: 'Do not change',
                  major: 'CUT-DS',
                },
              ],
            }),
          ),
        400,
        'MAJOR_SCOPED_COHORT_REQUIRED',
      );
    });
    it('rejects a new omitted-cohort yearly legacy placement without mutation', async () => {
      strict();
      await unchanged(
        () =>
          post(
            'student-academic-records',
            placementBody(legacyStudent, {
              academic_year_id: String(years[2]),
            }),
          ),
        400,
        'MAJOR_SCOPED_COHORT_REQUIRED',
      );
    });
    it('requires reviewed mapping instead of using strict mode to attach a canonical cohort to legacy history', async () => {
      strict();
      await unchanged(
        () =>
          post(
            'student-academic-records',
            placementBody(legacyStudent, {
              generation_id: String(cohorts[0]),
              academic_year_id: String(years[2]),
            }),
          ),
        409,
        'COHORT_MAPPING_REQUIRED',
      );
    });
    it.each([
      () => ({ major_id: String(majors[1]) }),
      () => ({ academic_year_id: String(years[2]) }),
      () => ({ progression_action: 'TRANSFER' }),
    ])(
      'blocks unresolved identity changes or transfer relabeling (%#)',
      async (body) => {
        strict();
        await unchanged(
          () =>
            api()
              .put(`/api/student-academic-records/${legacyRecord}`)
              .set(auth())
              .send(body()),
          400,
          'MAJOR_SCOPED_COHORT_REQUIRED',
        );
      },
    );
    it('allows same-identity echoes, group corrections and persistent pause with explicit RESUME', async () => {
      strict();
      const path = `/api/student-academic-records/${legacyRecord}`;
      for (const progression_action of ['PAUSE', 'RESUME']) {
        const result = await api()
          .put(path)
          .set(auth())
          .send({
            major_id: String(majors[0]),
            academic_year_id: String(years[0]),
            student_id: String(legacyStudent),
            class_group: ' revised ',
            progression_action,
          });
        expect(result.status).toBe(200);
        expect(result.body.generation_id).toBeNull();
        expect(result.body.class_group).toBe('REVISED');
      }
      expect(
        await db.student_cohort_assignment_events.count({
          where: { student_id: legacyStudent },
        }),
      ).toBe(0);
    });
    it('allows personal edits while retaining unresolved cohort and yearly links', async () => {
      strict();
      const before = await db.student_academic_records.findMany({
        where: { student_id: legacyStudent },
      });
      const result = await api()
        .put(`/api/students/${legacyStudent}`)
        .set(auth())
        .send({
          full_name: 'Synthetic updated name',
          generation_id: String(legacy),
          notes: null,
        });
      expect(result.status).toBe(200);
      expect(result.body.generation_id).toBe(String(legacy));
      expect(
        await db.student_academic_records.findMany({
          where: { student_id: legacyStudent },
        }),
      ).toEqual(before);
    });
    it('keeps legacy catalog, detail, student, yearly history and export readable without backfill', async () => {
      strict();
      for (const path of [
        'student-generations',
        `student-generations/${legacy}`,
        `students/${legacyStudent}`,
        'student-academic-records',
        'students/export',
      ])
        await unchanged(() => api().get(`/api/${path}`).set(auth()), 200);
      expect(
        (await db.student_academic_records.findUnique({
          where: { id: legacyRecord },
        }))!.generation_id,
      ).toBeNull();
    });
    it.each([0, 1])(
      'creates major %s Gen 1 with exact initial ownership and evidence in strict mode',
      async (major) => {
        strict();
        const result = await post(
          'students',
          studentBody({
            major_id: String(majors[major]),
            generation_id: String(cohorts[major]),
          }),
        );
        expect(result.status).toBe(201);
        const events = await db.student_cohort_assignment_events.findMany({
          where: { student_id: BigInt(result.body.id) },
        });
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({
          action: 'INITIAL',
          major_id: majors[major],
          generation_id: cohorts[major],
        });
      },
    );
    it('rejects wrong-major individual creation in strict mode', async () => {
      strict();
      await unchanged(
        () => post('students', studentBody({ major_id: String(majors[1]) })),
        400,
      );
    });
    it('supports explicit major numeric aliases and unchanged skip-on-retry semantics', async () => {
      strict();
      const body = importBody({
        generation_number: undefined,
        generation: 'Gen 01',
      });
      const first = await post('students/import', body);
      expect(first.status).toBe(201);
      expect(first.body.summary.created).toBe(1);
      const retry = await unchanged(() => post('students/import', body), 201);
      expect(retry.body.summary.skipped).toBe(1);
    });
    it('prevalidates mixed-major imports before any new cohort or account', async () => {
      strict();
      await unchanged(
        () =>
          post(
            'students/import',
            importBody({
              generation_number: 9,
              entry_academic_year_id: String(years[0]),
              students: [
                { student_code: 'CUT-MIX-A', full_name: 'A', major: 'CUT-DS' },
                { student_code: 'CUT-MIX-B', full_name: 'B', major: 'CUT-FE' },
              ],
            }),
          ),
        400,
      );
    });
    it('creates an independent same-number cohort for each major through the explicit catalog', async () => {
      strict();
      for (const major_id of majors) {
        const result = await post('student-generations', {
          major_id: String(major_id),
          generation_number: 2,
          entry_academic_year_id: String(years[1]),
          starting_year_level: 2,
        });
        expect(result.status).toBe(201);
        expect(result.body.generation_number).toBe(2);
        expect(result.body.major_id).toBe(String(major_id));
      }
    });
    it('continues a canonical placement and transfers only to an explicit destination, preserving history', async () => {
      strict();
      const created = await post('students', studentBody());
      expect(created.status).toBe(201);
      const id = created.body.id;
      await unchanged(
        () => post('student-academic-records', placementBody(id)),
        400,
      );
      const continued = await post(
        'student-academic-records',
        placementBody(id, { generation_id: String(cohorts[0]) }),
      );
      expect(continued.status).toBe(201);
      const transferred = await post(
        'student-academic-records',
        placementBody(id, {
          academic_year_id: String(years[2]),
          generation_id: String(cohorts[1]),
          major_id: String(majors[1]),
          progression_action: 'TRANSFER',
        }),
      );
      expect(transferred.status).toBe(201);
      const events = await db.student_cohort_assignment_events.findMany({
        where: { student_id: BigInt(id) },
        orderBy: { id: 'asc' },
      });
      expect(events.map((event) => event.action)).toEqual([
        'INITIAL',
        'INITIAL',
        'TRANSFER',
      ]);
      expect(events[2].previous_generation_id).toBe(cohorts[0]);
      expect(events[0].generation_id).toBe(cohorts[0]);
      expect(
        (await db.students.findUnique({ where: { id: BigInt(id) } }))!
          .generation_id,
      ).toBe(cohorts[1]);
    });
    it.each(['LECTURER', 'STUDENT'])(
      'preserves ADMIN-only write permission for %s',
      async (role) => {
        strict();
        await unchanged(() => post('students', studentBody(), role), 403);
        await unchanged(() => post('students/import', importBody(), role), 403);
        await unchanged(
          () =>
            post(
              'student-academic-records',
              placementBody(legacyStudent),
              role,
            ),
          403,
        );
      },
    );
    it('keeps unauthenticated profile and mutations protected', async () => {
      strict();
      await unchanged(() => api().get('/api/auth/me'), 401);
      await unchanged(
        () => api().post('/api/students').send(studentBody()),
        401,
      );
    });
    it('omits capability and rejects strict new writes when actual catalog prerequisites are missing', async () => {
      strict();
      await db.$executeRawUnsafe(
        'ALTER TABLE student_generations RENAME CONSTRAINT cohort_major_number_unique TO cutover_temporarily_renamed_unique',
      );
      try {
        expect(
          (await unchanged(() => me(), 200)).body.capabilities,
        ).not.toHaveProperty('major_scoped_generations');
        await unchanged(
          () => post('students', studentBody()),
          503,
          'COHORT_SCHEMA_NOT_READY',
        );
        await unchanged(
          () => post('students/import', importBody()),
          503,
          'COHORT_SCHEMA_NOT_READY',
        );
        await unchanged(
          () =>
            post('student-generations', {
              major_id: String(majors[0]),
              generation_number: 99,
              entry_academic_year_id: String(years[0]),
            }),
          503,
          'COHORT_SCHEMA_NOT_READY',
        );
        await unchanged(
          () => post('student-academic-records', placementBody(legacyStudent)),
          503,
          'COHORT_SCHEMA_NOT_READY',
        );
      } finally {
        await db.$executeRawUnsafe(
          'ALTER TABLE student_generations RENAME CONSTRAINT cutover_temporarily_renamed_unique TO cohort_major_number_unique',
        );
      }
      expect((await me()).body.capabilities.major_scoped_generations).toBe(
        true,
      );
    });
    it('does not trust a migration ledger over an enabled identity guard', async () => {
      strict();
      await db.$executeRawUnsafe(
        'ALTER TABLE student_generations DISABLE TRIGGER cohort_identity_guard',
      );
      try {
        expect(
          (await unchanged(() => me(), 200)).body.capabilities,
        ).not.toHaveProperty('major_scoped_generations');
      } finally {
        await db.$executeRawUnsafe(
          'ALTER TABLE student_generations ENABLE TRIGGER cohort_identity_guard',
        );
      }
      expect((await me()).body.capabilities.major_scoped_generations).toBe(
        true,
      );
    });
    it('does not advertise when a checksum is wrong even if the catalog looks ready', async () => {
      strict();
      const migration = await db.$queryRaw<
        Array<{ id: string; checksum: string }>
      >`SELECT id,checksum FROM _prisma_migrations WHERE migration_name='20261016010000_expand_major_scoped_cohorts'`;
      await db.$executeRaw`UPDATE _prisma_migrations SET checksum=${'0'.repeat(64)} WHERE id=${migration[0].id}`;
      try {
        expect(
          (await unchanged(() => me(), 200)).body.capabilities,
        ).not.toHaveProperty('major_scoped_generations');
        await unchanged(
          () => post('students', studentBody()),
          503,
          'COHORT_SCHEMA_NOT_READY',
        );
      } finally {
        await db.$executeRaw`UPDATE _prisma_migrations SET checksum=${migration[0].checksum} WHERE id=${migration[0].id}`;
      }
    });
    it('requires the installed review-kind constraint rather than trusting only its migration record', async () => {
      strict();
      await db.$executeRawUnsafe(
        'ALTER TABLE reviewed_operations RENAME CONSTRAINT reviewed_operations_kind_check TO cutover_temporarily_renamed_review_kind',
      );
      try {
        expect(
          (await unchanged(() => me(), 200)).body.capabilities,
        ).not.toHaveProperty('major_scoped_generations');
        await unchanged(
          () => post('students', studentBody()),
          503,
          'COHORT_SCHEMA_NOT_READY',
        );
      } finally {
        await db.$executeRawUnsafe(
          'ALTER TABLE reviewed_operations RENAME CONSTRAINT cutover_temporarily_renamed_review_kind TO reviewed_operations_kind_check',
        );
      }
    });
    it('omits capability when the connected migration is rolled back', async () => {
      strict();
      const name = '20261016020000_add_reviewed_cohort_mapping_kind';
      await db.$executeRaw`UPDATE _prisma_migrations SET rolled_back_at=CURRENT_TIMESTAMP WHERE migration_name=${name}`;
      try {
        expect(
          (await unchanged(() => me(), 200)).body.capabilities,
        ).not.toHaveProperty('major_scoped_generations');
      } finally {
        await db.$executeRaw`UPDATE _prisma_migrations SET rolled_back_at=NULL WHERE migration_name=${name}`;
      }
    });
    it('creates a new major-owned cohort during strict import and retains partial-result/retry behavior', async () => {
      strict();
      const body = importBody({
        generation_number: 7,
        entry_academic_year_id: String(years[0]),
      });
      const result = await post('students/import', body);
      expect(result.status).toBe(201);
      expect(result.body.summary).toMatchObject({
        created: 1,
        skipped: 0,
        failed: 0,
      });
      const cohort = await db.student_generations.findFirst({
        where: { major_id: majors[0], generation_number: 7 },
      });
      expect(cohort?.ownership_state).toBe('MAJOR_SCOPED');
      const retry = await unchanged(() => post('students/import', body), 201);
      expect(retry.body.summary).toMatchObject({
        created: 0,
        skipped: 1,
        failed: 0,
      });
    });
    it('rejects duplicate canonical student retries without duplicate account, record or evidence', async () => {
      strict();
      const body = studentBody();
      expect((await post('students', body)).status).toBe(201);
      await unchanged(() => post('students', body), 409);
    });
    it('documents the switch, capability and actionable prerequisite errors in Swagger', () => {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().addBearerAuth().build(),
      );
      expect(document.paths['/api/auth/me'].get!.description).toContain(
        'REQUIRE_MAJOR_SCOPED_COHORTS',
      );
      expect(document.paths['/api/students'].post!.description).toContain(
        'COHORT_SCHEMA_NOT_READY',
      );
      expect(
        document.paths['/api/student-academic-records'].post!.description,
      ).toContain('MAJOR_SCOPED_COHORT_REQUIRED');
      expect(
        document.paths['/api/student-generations'].post!.description,
      ).toContain('empty catalog');
    });
  });
});
