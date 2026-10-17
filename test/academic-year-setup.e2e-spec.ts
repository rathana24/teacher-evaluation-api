import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AcademicYearSetupService } from '../src/academic-years/academic-year-setup.service';
import { yearSetupSchemaReady } from '../src/academic-years/academic-year-setup.util';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Atomic academic year and semester setup (owned PostgreSQL)', () => {
  const fixture = new CohortImportFixture(),
    path = '/api/academic-years';
  let db: PrismaClient,
    app: INestApplication,
    oldYear: bigint,
    oldSemester: bigint,
    readyOnEmpty = false,
    serial = 0;
  const tokens: Record<string, string> = {},
    users: Record<string, bigint> = {};
  const api = () => request(app.getHttpServer()),
    auth = (role = 'ADMIN') => ({ Authorization: `Bearer ${tokens[role]}` });
  const semesters = () => [
    {
      semester_number: 1,
      semester_name: 'Semester 1',
      start_date: '2098-10-01',
      end_date: '2099-02-01',
    },
    {
      semester_number: 2,
      semester_name: 'Semester 2',
      start_date: '2099-02-02',
      end_date: '2099-07-31',
    },
  ];
  const body = (extra: object = {}) => ({
    academic_year: {
      name: `SETUP-${++serial}`,
      start_year: 2098,
      is_active: false,
    },
    semesters: semesters(),
    ...extra,
  });
  const create = (input = body(), key: string = randomUUID(), role = 'ADMIN') =>
    api()
      .post(`${path}/setup`)
      .set(auth(role))
      .set('Idempotency-Key', key)
      .send(input);
  const complete = (
    id: string,
    input: object = { semesters: semesters() },
    key: string = randomUUID(),
    role = 'ADMIN',
  ) =>
    api()
      .post(`${path}/${id}/complete-setup`)
      .set(auth(role))
      .set('Idempotency-Key', key)
      .send(input);
  const receipt = (key: string, role = 'ADMIN') =>
    api().get(`${path}/setup/receipts/${key}`).set(auth(role));
  async function unchanged(
    action: () => PromiseLike<request.Response>,
    status: number,
    code?: string,
  ) {
    const before = await fixture.snapshot(db),
      result = await action();
    expect(result.status).toBe(status);
    if (code) expect(result.body.code).toBe(code);
    expect(await fixture.snapshot(db)).toEqual(before);
    return result;
  }
  async function history() {
    return {
      tables: (await fixture.snapshot(db)).filter(
        (t) =>
          ![
            'academic_years',
            'semesters',
            'reviewed_operations',
            'setup_audit',
          ].includes(t.name),
      ),
      semester: await db.semesters.findUnique({ where: { id: oldSemester } }),
    };
  }
  let protectedHistory: unknown;
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    readyOnEmpty = await yearSetupSchemaReady(db);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    const hash = await bcrypt.hash('SyntheticSetup123!', 10);
    for (const [label, role] of [
      ['ADMIN', 'ADMIN'],
      ['OTHER', 'ADMIN'],
      ['LECTURER', 'LECTURER'],
      ['STUDENT', 'STUDENT'],
    ] as const) {
      users[label] = (
        await db.users.create({
          data: {
            full_name: `Setup ${label}`,
            email: `${label.toLowerCase()}@setup.test`,
            password_hash: hash,
            role,
            status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date(),
          },
        })
      ).id;
      const result = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${label.toLowerCase()}@setup.test`,
          password: 'SyntheticSetup123!',
        });
      expect(result.status).toBe(200);
      tokens[label] = result.body.access_token;
    }
    oldYear = (
      await db.academic_years.create({
        data: { name: 'Existing year', start_year: 2097, is_active: true },
      })
    ).id;
    oldSemester = (
      await db.semesters.create({
        data: {
          academic_year_id: oldYear,
          semester_number: 1,
          semester_name: 'Original semester',
          start_date: new Date('2097-10-01Z'),
          end_date: new Date('2098-02-01Z'),
          created_at: new Date(),
          updated_at: new Date(),
        },
      })
    ).id;
    const dept = await db.departments.create({
      data: { code: 'SETUP', name: 'Setup protected department' },
    });
    const course = await db.courses.create({
      data: {
        course_code: 'SETUP-OLD',
        course_name: 'Protected course',
        department_id: dept.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const offering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: users.LECTURER,
        semester_id: oldSemester,
        year_level: 1,
        class_type: 'COURSE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await db.enrollments.create({
      data: {
        course_offering_id: offering.id,
        student_id: users.STUDENT,
        enrolled_at: new Date(),
      },
    });
    const survey = await db.surveys.create({
      data: {
        title: 'Protected setup questionnaire',
        created_by: users.ADMIN,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const version = await db.survey_versions.create({
      data: {
        survey_id: survey.id,
        version_no: 1,
        created_by: users.ADMIN,
        created_at: new Date(),
      },
    });
    const question = await db.questions.create({
      data: {
        survey_version_id: version.id,
        question_text: 'Protected rating',
        question_type: 'RATING',
        display_order: 1,
        is_required: true,
        min_rating: 1,
        max_rating: 5,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const evaluation = await db.evaluations.create({
      data: {
        course_offering_id: offering.id,
        survey_version_id: version.id,
        status: 'CLOSED',
        created_by: users.ADMIN,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await db.evaluation_participants.create({
      data: {
        evaluation_id: evaluation.id,
        student_id: users.STUDENT,
        survey_version_id: version.id,
        has_submitted: true,
        created_at: new Date(),
      },
    });
    const response = await db.responses.create({
      data: {
        evaluation_id: evaluation.id,
        survey_version_id: version.id,
        submitted_at: new Date(),
        created_at: new Date(),
      },
    });
    await db.answers.create({
      data: {
        response_id: response.id,
        question_id: question.id,
        rating_value: 4,
        created_at: new Date(),
      },
    });
    protectedHistory = await history();
  }, 90000);
  afterEach(async () => {
    if (db && protectedHistory) {
      expect(await history()).toEqual(protectedHistory);
      await fixture.unchangedPublic();
    }
  });
  afterAll(async () => {
    await app?.close();
    await fixture.close();
  });

  it('recognizes migrated receipt support and integrated rollover in an empty catalog', async () => {
    expect(readyOnEmpty).toBe(true);
    expect(
      (await api().get('/api/auth/me').set(auth())).body.capabilities,
    ).toHaveProperty('integrated_academic_year_rollover_v1', true);
  });
  it('atomically creates exactly one year, Semester 1 and Semester 2 and a completed receipt', async () => {
    const input = body(),
      result = await create(input);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      status: 'COMPLETE',
      created_semester_count: 2,
      preserved_semester_count: 0,
      already_applied: false,
    });
    expect(result.body.semesters.map((s: any) => s.semester_number)).toEqual([
      1, 2,
    ]);
    expect(
      result.body.semesters.every(
        (s: any) => s.academic_year_id === result.body.academic_year.id,
      ),
    ).toBe(true);
    expect(
      await db.reviewed_operations.count({
        where: {
          id: result.body.idempotency_key,
          operation_kind: 'SETUP_ACADEMIC_YEAR',
          completed_at: { not: null },
        },
      }),
    ).toBe(1);
  });
  it('switches active years inside the same transaction', async () => {
    const result = await create(
      body({ academic_year: { name: `ACTIVE-${++serial}`, is_active: true } }),
    );
    expect(result.status).toBe(201);
    expect(
      await db.academic_years.findMany({
        where: { is_active: true },
        select: { id: true },
      }),
    ).toEqual([{ id: BigInt(result.body.academic_year.id) }]);
    expect(
      (await db.academic_years.findUniqueOrThrow({ where: { id: oldYear } }))
        .is_active,
    ).toBe(false);
  });
  it('retains original IDs/counts through uppercase keys and reordered semesters', async () => {
    const key = randomUUID(),
      input = body(),
      first = await create(input, key);
    expect(first.status).toBe(201);
    const retry = await unchanged(
      () =>
        create(
          { ...input, semesters: [...input.semesters].reverse() },
          key.toUpperCase(),
        ),
      201,
    );
    expect(retry.body).toEqual({ ...first.body, already_applied: true });
  });
  it('recovers the original result after subsequent year/semester edits and preview-style expiry', async () => {
    const key = randomUUID(),
      input = body(),
      first = await create(input, key);
    expect(first.status).toBe(201);
    await db.academic_years.update({
      where: { id: BigInt(first.body.academic_year.id) },
      data: { name: `EDIT-${++serial}` },
    });
    await db.semesters.update({
      where: { id: BigInt(first.body.semesters[0].id) },
      data: { semester_name: 'Changed after setup' },
    });
    await db.reviewed_operations.update({
      where: { id: key },
      data: { expires_at: new Date(0) },
    });
    expect((await unchanged(() => receipt(key), 200)).body).toEqual({
      ...first.body,
      already_applied: true,
    });
    expect((await unchanged(() => create(input, key), 201)).body).toEqual({
      ...first.body,
      already_applied: true,
    });
  });
  it('does not recreate deleted unused setup records on retry', async () => {
    const key = randomUUID(),
      input = body(),
      first = await create(input, key);
    expect(first.status).toBe(201);
    await db.semesters.deleteMany({
      where: { academic_year_id: BigInt(first.body.academic_year.id) },
    });
    await db.academic_years.delete({
      where: { id: BigInt(first.body.academic_year.id) },
    });
    expect((await unchanged(() => create(input, key), 201)).body).toEqual({
      ...first.body,
      already_applied: true,
    });
  });
  it('rejects changed input under a completed key without writes', async () => {
    const key = randomUUID(),
      input = body();
    expect((await create(input, key)).status).toBe(201);
    await unchanged(
      () =>
        create(
          {
            ...input,
            academic_year: { ...input.academic_year, name: 'Different' },
          },
          key,
        ),
      409,
      'YEAR_SETUP_INPUT_MISMATCH',
    );
  });
  it('does not treat a duplicate year with a new key as a completed retry', async () => {
    const input = body();
    expect((await create(input)).status).toBe(201);
    await unchanged(() => create(input), 409, 'YEAR_SETUP_RETRY_OR_CONFLICT');
  });
  it('creates only missing Semester 2 while preserving existing names/dates, year and history', async () => {
    const before = await db.academic_years.findUnique({
        where: { id: oldYear },
      }),
      key = randomUUID();
    const result = await complete(
      String(oldYear),
      { semesters: semesters() },
      key,
    );
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      created_semester_count: 1,
      preserved_semester_count: 1,
      preserved_semester_ids: [String(oldSemester)],
    });
    expect(
      await db.academic_years.findUnique({ where: { id: oldYear } }),
    ).toEqual(before);
    expect(result.body.semesters[0].semester_name).toBe('Original semester');
    expect(
      (
        await unchanged(
          () => complete(String(oldYear), { semesters: semesters() }, key),
          200,
        )
      ).body,
    ).toEqual({ ...result.body, already_applied: true });
  });
  it('preserves both existing semesters and creates only a receipt on a separate intentional completion', async () => {
    const result = await complete(String(oldYear));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      created_semester_count: 0,
      preserved_semester_count: 2,
    });
  });
  it('completes a year with no semesters without changing its blank dates or active state', async () => {
    const year = await db.academic_years.create({
      data: { name: `PARTIAL-${++serial}`, is_active: false },
    });
    const result = await complete(String(year.id));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      created_semester_count: 2,
      academic_year: {
        name: year.name,
        start_date: null,
        end_date: null,
        is_active: false,
      },
    });
  });
  it('preserves a legacy null-number semester instead of repurposing it', async () => {
    const year = await db.academic_years.create({
      data: { name: `LEGACY-${++serial}` },
    });
    const legacy = await db.semesters.create({
      data: {
        academic_year_id: year.id,
        semester_number: null,
        semester_name: 'Historical unnamed number',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    expect((await complete(String(year.id))).status).toBe(200);
    expect(await db.semesters.findUnique({ where: { id: legacy.id } })).toEqual(
      legacy,
    );
    expect(
      await db.semesters.count({ where: { academic_year_id: year.id } }),
    ).toBe(3);
  });
  it('refuses a legacy name collision without partial completion', async () => {
    const year = await db.academic_years.create({
      data: { name: `COLLIDE-${++serial}` },
    });
    await db.semesters.create({
      data: {
        academic_year_id: year.id,
        semester_number: null,
        semester_name: 'Semester 2',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await unchanged(() => complete(String(year.id)), 409);
  });
  it.each(['2098-02-30', 'garbage'])(
    'rejects impossible/malformed year dates %s',
    async (date) => {
      await unchanged(
        () =>
          create(
            body({
              academic_year: {
                name: `BAD-${++serial}`,
                start_date: date,
                is_active: true,
              },
            }),
          ),
        400,
      );
    },
  );
  it.each([
    {},
    { semesters: [] },
    { semesters: [semesters()[0]] },
    { semesters: [semesters()[0], semesters()[0]] },
    { semesters: semesters().map((s) => ({ ...s, semester_name: 'same' })) },
    { academic_year: { name: ' ' } },
    { extra: true },
    { semesters: null },
    { academic_year: null },
  ])('rejects invalid nested input %# before writing', async (extra) => {
    const input: any = Object.keys(extra).length ? body(extra) : {};
    await unchanged(() => create(input), 400);
  });
  it.each(['year', 'first', 'second'])(
    'rejects reversed %s dates before activation or writes',
    async (which) => {
      const input: any = body();
      const target =
        which === 'year'
          ? input.academic_year
          : input.semesters[which === 'first' ? 0 : 1];
      target.start_date = '2098-04-02';
      target.end_date = '2098-04-01';
      await unchanged(() => create(input), 400);
    },
  );
  it.each(['', 'invalid', '00000000-0000-1000-8000-000000000000'])(
    'rejects invalid key %s without writes',
    async (key) => {
      await unchanged(() => create(body(), key), 400);
    },
  );
  it('requires a key rather than allocating one on the server', async () => {
    await unchanged(
      () => api().post(`${path}/setup`).set(auth()).send(body()),
      400,
      'IDEMPOTENCY_KEY_REQUIRED',
    );
  });
  it.each(['0', '-1', '9223372036854775808', '1e2'])(
    'rejects invalid completion ID %s',
    async (id) => {
      await unchanged(() => complete(id), 400);
    },
  );
  it('returns 404 for an unknown completion year without writing', async () => {
    await unchanged(() => complete('9223372036854775807'), 404);
  });
  it('rejects changing year fields during missing-only completion', async () => {
    await unchanged(
      () =>
        complete(String(oldYear), {
          semesters: semesters(),
          academic_year: { name: 'Overwrite' },
        }),
      400,
    );
  });
  it('does not disclose another admin receipt or let them reuse its key', async () => {
    const key = randomUUID(),
      input = body();
    expect((await create(input, key)).status).toBe(201);
    await unchanged(() => receipt(key, 'OTHER'), 404);
    await unchanged(() => create(input, key, 'OTHER'), 404);
  });
  it.each(['LECTURER', 'STUDENT'])(
    'forbids %s on all setup routes',
    async (role) => {
      await unchanged(() => create(body(), randomUUID(), role), 403);
      await unchanged(
        () =>
          complete(
            String(oldYear),
            { semesters: semesters() },
            randomUUID(),
            role,
          ),
        403,
      );
      await unchanged(() => receipt(randomUUID(), role), 403);
    },
  );
  it('rejects unauthenticated setup', async () => {
    await unchanged(() => api().post(`${path}/setup`).send(body()), 401);
  });
  it('rechecks current ACTIVE ADMIN permission even for a completed receipt', async () => {
    const key = randomUUID(),
      input = body();
    expect((await create(input, key, 'OTHER')).status).toBe(201);
    await db.users.update({
      where: { id: users.OTHER },
      data: { status: 'INACTIVE' },
    });
    try {
      await unchanged(() => receipt(key, 'OTHER'), 401);
    } finally {
      await db.users.update({
        where: { id: users.OTHER },
        data: { status: 'ACTIVE' },
      });
    }
  });
  it('protects direct service calls with the same administrator rule', async () => {
    const before = await fixture.snapshot(db);
    await expect(
      new AcademicYearSetupService(db as any).setup(
        body(),
        users.STUDENT,
        randomUUID(),
      ),
    ).rejects.toThrow();
    expect(await fixture.snapshot(db)).toEqual(before);
  });
  it.each(['semester2', 'receipt'])(
    'rolls back the complete setup and active-year changes on injected %s failure, then permits the same-key retry',
    async (failure) => {
      const key = randomUUID(),
        input = body({
          academic_year: { name: `ROLLBACK-${++serial}`, is_active: true },
        });
      const table =
        failure === 'semester2' ? 'semesters' : 'reviewed_operations';
      const condition =
        failure === 'semester2'
          ? 'NEW.semester_number = 2'
          : "NEW.operation_kind = 'SETUP_ACADEMIC_YEAR'";
      await db.$executeRawUnsafe(
        `CREATE FUNCTION setup_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'Synthetic setup failure'; END IF; RETURN NEW; END $$`,
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER setup_fail BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION setup_fail()`,
      );
      try {
        await unchanged(
          () => create(input, key),
          500,
          'YEAR_SETUP_RESULT_UNCERTAIN',
        );
      } finally {
        await db.$executeRawUnsafe(`DROP TRIGGER setup_fail ON ${table}`);
        await db.$executeRawUnsafe('DROP FUNCTION setup_fail()');
      }
      expect((await create(input, key)).status).toBe(201);
    },
  );
  it('rolls back Semester 1 if Semester 2 fails during completion', async () => {
    const year = await db.academic_years.create({
      data: { name: `FINISH-FAIL-${++serial}` },
    });
    await db.$executeRawUnsafe(
      "CREATE FUNCTION setup_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.semester_number=2 THEN RAISE EXCEPTION 'Synthetic setup failure'; END IF; RETURN NEW; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER setup_fail BEFORE INSERT ON semesters FOR EACH ROW EXECUTE FUNCTION setup_fail()',
    );
    try {
      await unchanged(() => complete(String(year.id)), 500);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER setup_fail ON semesters');
      await db.$executeRawUnsafe('DROP FUNCTION setup_fail()');
    }
  });
  it('gates new operations on installed schema but retains completed receipt recovery', async () => {
    const key = randomUUID(),
      input = body(),
      first = await create(input, key);
    expect(first.status).toBe(201);
    const [constraint] = await db.$queryRaw<
      Array<{ definition: string }>
    >`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='reviewed_operations'::regclass AND conname='reviewed_operations_kind_check'`;
    await db.$executeRawUnsafe(
      'ALTER TABLE reviewed_operations DROP CONSTRAINT reviewed_operations_kind_check',
    );
    try {
      await unchanged(() => create(body()), 503, 'YEAR_SETUP_SCHEMA_NOT_READY');
      expect((await unchanged(() => receipt(key), 200)).body).toEqual({
        ...first.body,
        already_applied: true,
      });
      expect((await unchanged(() => create(input, key), 201)).body).toEqual({
        ...first.body,
        already_applied: true,
      });
    } finally {
      await db.$executeRawUnsafe(
        `ALTER TABLE reviewed_operations ADD CONSTRAINT reviewed_operations_kind_check ${constraint.definition}`,
      );
    }
  });
  it('does not reuse a key from another administrative operation', async () => {
    const key = randomUUID(),
      now = new Date();
    await db.reviewed_operations.create({
      data: {
        id: key,
        operation_kind: 'CREATE_COURSE',
        resource_key: 'courses:create:v1',
        actor_id: users.ADMIN,
        request_json: {},
        request_fingerprint: 'a'.repeat(64),
        snapshot_fingerprint: 'b'.repeat(64),
        expires_at: now,
        completed_at: now,
        result_json: {},
      },
    });
    await unchanged(() => create(body(), key), 409, 'IDEMPOTENCY_KEY_IN_USE');
  });
  it('reports an incomplete receipt without rerunning writes', async () => {
    const key = randomUUID();
    await db.reviewed_operations.create({
      data: {
        id: key,
        operation_kind: 'SETUP_ACADEMIC_YEAR',
        resource_key: 'academic-years:setup:v1',
        actor_id: users.ADMIN,
        request_json: {},
        request_fingerprint: 'a'.repeat(64),
        snapshot_fingerprint: 'b'.repeat(64),
        expires_at: new Date(),
      },
    });
    await unchanged(() => receipt(key), 409, 'YEAR_SETUP_NOT_COMMITTED');
  });
  it('returns 404 for an unknown receipt without claiming the in-flight operation rolled back', async () => {
    await unchanged(() => receipt(randomUUID()), 404);
  });
  it('preserves one result under concurrent same-key setup and supports safe recovery of a retry conflict', async () => {
    const key = randomUUID(),
      input = body(),
      results = await Promise.all([create(input, key), create(input, key)]);
    expect(results.some((r) => r.status === 201)).toBe(true);
    expect(results.every((r) => [201, 409].includes(r.status))).toBe(true);
    const retry = await create(input, key);
    expect(retry.status).toBe(201);
    expect(retry.body.already_applied).toBe(true);
    expect(
      await db.academic_years.count({
        where: { name: input.academic_year.name },
      }),
    ).toBe(1);
    expect(
      await db.semesters.count({
        where: { academic_year_id: BigInt(retry.body.academic_year.id) },
      }),
    ).toBe(2);
  });
  it('cannot create duplicate years under competing different keys', async () => {
    const input = body(),
      results = await Promise.all([create(input), create(input)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await db.academic_years.count({
        where: { name: input.academic_year.name },
      }),
    ).toBe(1);
  });
  it('preserves one semester per number under concurrent different completion keys', async () => {
    const year = await db.academic_years.create({
      data: { name: `RACE-${++serial}` },
    });
    const results = await Promise.all([
      complete(String(year.id)),
      complete(String(year.id)),
    ]);
    expect(results.some((r) => r.status === 200)).toBe(true);
    expect(results.every((r) => [200, 409].includes(r.status))).toBe(true);
    expect(
      await db.semesters.count({ where: { academic_year_id: year.id } }),
    ).toBe(2);
  });
  it('documents setup, missing-only completion, recovery and integrated rollover in Swagger', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(document.paths[`${path}/setup`].post!.description).toContain(
      'integrated_academic_year_rollover_v1',
    );
    expect(
      document.paths[`${path}/{id}/complete-setup`].post!.description,
    ).toContain('preserved verbatim');
    expect(
      document.paths[`${path}/setup/receipts/{key}`].get!.description,
    ).toContain('no TTL');
    expect(
      (document.components!.schemas!.SetupSemesterDto as any).properties,
    ).not.toHaveProperty('academic_year_id');
  });
  it('keeps legacy standalone year creation free of unexpected semesters', async () => {
    const result = await api()
      .post(path)
      .set(auth())
      .send({ name: `CRUD-${++serial}`, start_year: 2198 });
    expect(result.status).toBe(201);
    expect(
      await db.semesters.count({
        where: { academic_year_id: BigInt(result.body.id) },
      }),
    ).toBe(0);
  });
  it('retains all earlier receipt kinds and leaves migration SQL unchanged after rehearsal', async () => {
    const sql = readFileSync(
      'prisma/migrations/20261016050000_academic_year_setup_receipts/migration.sql',
      'utf8',
    );
    for (const kind of [
      'ENROLL_GROUP',
      'CREATE_EVALUATION',
      'REASSIGN_ENROLLMENT',
      'BULK_GROUP_PLACEMENT',
      'OPEN_ASSIGNED_VERSION',
      'APPLY_LATEST_VERSION',
      'COHORT_MAPPING',
      'CREATE_COURSE',
      'CREATE_ASSIGNMENTS',
      'SETUP_ACADEMIC_YEAR',
    ])
      expect(sql).toContain(`'${kind}'`);
    expect(await yearSetupSchemaReady(db)).toBe(true);
  });
});
