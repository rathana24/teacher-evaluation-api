import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CourseCreationService } from '../src/courses/course-creation.service';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Atomic automatic course codes and durable retries (owned HTTP)', () => {
  const fixture = new CohortImportFixture();
  let app: INestApplication, db: PrismaClient;
  const tokens: Record<string, string> = {},
    users: Record<string, bigint> = {};
  const departments: bigint[] = [];
  let serial = 0,
    first: any,
    historical: unknown,
    historicalIds: bigint[] = [];
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const body = (extra: object = {}) => ({
    course_name: `Synthetic course ${++serial}`,
    department_id: Number(departments[0]),
    ...extra,
  });
  const post = (
    input: object,
    key: string | undefined = randomUUID(),
    role = 'ADMIN',
  ) => {
    const call = api().post('/api/courses').set(auth(role));
    if (key !== undefined) call.set('Idempotency-Key', key);
    return call.send(input);
  };
  const unkeyed = (input: object) =>
    api().post('/api/courses').set(auth()).send(input);
  const recovery = (key: string, role = 'ADMIN') =>
    api().get(`/api/courses/creation-receipts/${key}`).set(auth(role));
  async function unchanged(
    operation: () => PromiseLike<request.Response>,
    status: number,
    code?: string,
  ) {
    const before = await fixture.snapshot(db),
      result = await operation();
    expect(result.status).toBe(status);
    if (code) expect(result.body.code).toBe(code);
    expect(await fixture.snapshot(db)).toEqual(before);
    return result;
  }
  async function create(input = body(), key = randomUUID(), role = 'ADMIN') {
    const response = await post(input, key, role);
    expect(response.status).toBe(201);
    return response.body;
  }
  async function stableHistory() {
    return {
      rows: (await fixture.snapshot(db)).filter(
        (row) =>
          !['courses', 'reviewed_operations', 'departments', 'users'].includes(
            row.name,
          ),
      ),
      courses: await db.courses.findMany({
        where: { id: { in: historicalIds } },
        orderBy: { id: 'asc' },
      }),
    };
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    const hash = await bcrypt.hash('SyntheticCodes123!', 4);
    for (const role of ['ADMIN', 'ADMIN2', 'LECTURER', 'STUDENT']) {
      const user = await db.users.create({
        data: {
          full_name: `Synthetic code ${role}`,
          email: `${role.toLowerCase()}@codes.example.test`,
          role:
            role === 'ADMIN2'
              ? 'ADMIN'
              : (role as 'ADMIN' | 'LECTURER' | 'STUDENT'),
          password_hash: hash,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      users[role] = user.id;
    }
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
    for (const role of Object.keys(users)) {
      const login = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${role.toLowerCase()}@codes.example.test`,
          password: 'SyntheticCodes123!',
        });
      expect(login.status).toBe(200);
      tokens[role] = login.body.access_token;
    }
    for (const [index, code] of [
      'GIC',
      'DS',
      'GîC',
      '---',
      'A'.repeat(30),
      'OFF',
    ].entries())
      departments.push(
        (
          await db.departments.create({
            data: {
              code,
              name: `Synthetic code department ${index}`,
              status: index === 5 ? 'INACTIVE' : 'ACTIVE',
            },
          })
        ).id,
      );
  }, 90000);
  afterEach(async () => {
    await fixture.unchangedPublic();
    if (historical) expect(await stableHistory()).toEqual(historical);
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture.close();
    }
  });

  it.each(['ADMIN', 'LECTURER', 'STUDENT'])(
    'advertises allocation to %s with an empty migrated catalog',
    async (role) => {
      expect(await db.courses.count()).toBe(0);
      const me = await unchanged(
        () => api().get('/api/auth/me').set(auth(role)),
        200,
      );
      expect(me.body.capabilities.automatic_course_codes_v1).toBe(true);
    },
  );
  it('starts the empty GIC catalog at GIC-001 and preserves the existing course response shape', async () => {
    const key = randomUUID(),
      input = body();
    first = await create(input, key);
    expect(first.course_code).toBe('GIC-001');
    expect(first.department_id).toBe(String(departments[0]));
    expect(Object.keys(first).sort()).toEqual(
      [
        'id',
        'course_code',
        'course_name',
        'department_id',
        'description',
        'departments',
        'created_at',
        'updated_at',
      ].sort(),
    );
    const replay = await unchanged(() => post(input, key), 201);
    expect(replay.body).toEqual(first);
    const receipt = await unchanged(() => recovery(key), 200);
    expect(receipt.body).toEqual({
      idempotency_key: key,
      course: first,
      already_applied: true,
    });
  });
  describe('occupied codes and protected history', () => {
    beforeAll(async () => {
      const now = new Date();
      for (const code of ['HIST-OLD', 'Case-Old', 'case-old'])
        historicalIds.push(
          (
            await db.courses.create({
              data: {
                course_code: code,
                course_name: `Historical ${code}`,
                department_id: departments[0],
                created_at: now,
                updated_at: now,
              },
            })
          ).id,
        );
      const year = await db.academic_years.create({
        data: { name: 'Codes history', start_year: 2090 },
      });
      const semester = await db.semesters.create({
        data: {
          semester_name: 'S1',
          semester_number: 1,
          academic_year_id: year.id,
          created_at: now,
          updated_at: now,
        },
      });
      const major = await db.majors.create({
        data: {
          code: 'CODES',
          name: 'Synthetic history major',
          department_id: departments[0],
        },
      });
      const rule = await db.course_year_rules.create({
        data: {
          course_id: historicalIds[0],
          major_id: major.id,
          year_level: 1,
        },
      });
      await db.curriculum_revisions.create({
        data: {
          rule_id: rule.id,
          revision_no: 1,
          effective_academic_year_id: year.id,
          effective_start_year: 2090,
          enabled: true,
        },
      });
      const offering = await db.course_offerings.create({
        data: {
          course_id: historicalIds[0],
          semester_id: semester.id,
          lecturer_id: users.LECTURER,
          year_level: 1,
          class_type: 'COURSE',
          created_at: now,
          updated_at: now,
        },
      });
      await db.enrollments.create({
        data: {
          course_offering_id: offering.id,
          student_id: users.STUDENT,
          enrolled_at: now,
        },
      });
      const survey = await db.surveys.create({
        data: {
          title: 'Synthetic protected course codes',
          created_by: users.ADMIN,
          created_at: now,
          updated_at: now,
        },
      });
      const version = await db.survey_versions.create({
        data: {
          survey_id: survey.id,
          version_no: 1,
          created_by: users.ADMIN,
          created_at: now,
        },
      });
      const question = await db.questions.create({
        data: {
          survey_version_id: version.id,
          question_text: 'Synthetic rating',
          question_type: 'RATING',
          min_rating: 1,
          max_rating: 5,
          display_order: 1,
          created_at: now,
          updated_at: now,
        },
      });
      await db.survey_versions.update({
        where: { id: version.id },
        data: { status: 'LOCKED', locked_at: now },
      });
      const evaluation = await db.evaluations.create({
        data: {
          course_offering_id: offering.id,
          survey_version_id: version.id,
          status: 'OPEN',
          created_by: users.ADMIN,
          created_at: now,
          updated_at: now,
        },
      });
      const participant = await db.evaluation_participants.create({
        data: {
          evaluation_id: evaluation.id,
          student_id: users.STUDENT,
          survey_version_id: version.id,
          created_at: now,
        },
      });
      await db.$transaction(async (tx) => {
        const response = await tx.responses.create({
          data: {
            evaluation_id: evaluation.id,
            survey_version_id: version.id,
            submitted_at: now,
            created_at: now,
          },
        });
        await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: question.id,
            rating_value: 5,
            created_at: now,
          },
        });
        await tx.evaluation_participants.update({
          where: { id: participant.id },
          data: { has_submitted: true, submitted_at: now },
        });
      });
      await db.evaluations.update({
        where: { id: evaluation.id },
        data: { status: 'CLOSED' },
      });
      historical = await stableHistory();
    });
    it('advances subsequent codes and uses an independent department prefix', async () => {
      expect((await create()).course_code).toBe('GIC-002');
      expect(
        (await create(body({ department_id: Number(departments[1]) })))
          .course_code,
      ).toBe('DS-001');
    });
    it('skips manually occupied lower-case numeric suffixes without changing the official code', async () => {
      const manual = await create(body({ course_code: 'gic-009' }));
      expect(manual.course_code).toBe('gic-009');
      expect((await create()).course_code).toBe('GIC-010');
    });
    it('supports numbering beyond 999', async () => {
      await create(body({ course_code: 'GIC-999' }));
      expect((await create()).course_code).toBe('GIC-1000');
    });
    it('normalizes shared department prefixes without colliding across departments', async () => {
      const course = await create(
        body({ department_id: Number(departments[2]) }),
      );
      expect(course.course_code).toBe('GIC-1001');
      expect(course.department_id).toBe(String(departments[2]));
      expect(
        (await db.departments.findUnique({ where: { id: departments[2] } }))!
          .code,
      ).toBe('GîC');
    });
    it('caps the sanitized prefix while respecting the final 30-character code limit', async () => {
      const course = await create(
        body({ department_id: Number(departments[4]) }),
      );
      expect(course.course_code).toBe('A'.repeat(20) + '-001');
      expect(course.course_code.length).toBeLessThanOrEqual(30);
    });
    it('rejects an unusable generated prefix but accepts a supplied official code', async () => {
      await unchanged(
        () => post(body({ department_id: Number(departments[3]) })),
        400,
        'COURSE_CODE_PREFIX_REQUIRED',
      );
      const result = await create(
        body({
          department_id: Number(departments[3]),
          course_code: 'Official Khmer dept',
        }),
      );
      expect(result.course_code).toBe('Official Khmer dept');
    });
    it('never truncates/wraps an exhausted suffix or creates a receipt on failure', async () => {
      await create(
        body({
          department_id: Number(departments[4]),
          course_code: 'A'.repeat(20) + '-999999999',
        }),
      );
      await unchanged(
        () => post(body({ department_id: Number(departments[4]) })),
        409,
        'COURSE_CODE_EXHAUSTED',
      );
    });
    it('preserves trimmed official code case and internal characters', async () => {
      const course = await create(
        body({ course_code: '  X.y / Z-Official  ' }),
      );
      expect(course.course_code).toBe('X.y / Z-Official');
    });
    it('treats official percent and underscore characters literally during collision checks', async () => {
      for (const course_code of ['LITxCODE', 'LIT%CODE', 'LIT_CODE']) {
        const course = await create(body({ course_code }));
        expect(course.course_code).toBe(course_code);
      }
    });
    it('keeps unkeyed official creation compatible and rejects its duplicates clearly', async () => {
      const input = body({ course_code: 'LEGACY-EXPLICIT' }),
        response = await unkeyed(input);
      expect(response.status).toBe(201);
      const duplicate = await unchanged(() => unkeyed(input), 409);
      expect(duplicate.body.message).toBe('course_code already exists');
    });
    it('preserves case-sensitive official identities without normalizing pre-existing variants', async () => {
      expect(
        (await create(body({ course_code: 'CASE-OLD' }))).course_code,
      ).toBe('CASE-OLD');
      expect(
        await db.courses.count({
          where: { course_code: { equals: 'case-old', mode: 'insensitive' } },
        }),
      ).toBe(3);
    });
    it.each(['course_name', 'department_id', 'course_code', 'description'])(
      'binds keyed retries to original %s',
      async (field) => {
        const key = randomUUID(),
          input = body({
            course_code: `BIND-${++serial}`,
            description: 'Original',
          });
        await create(input, key);
        const changed = {
          ...input,
          [field]:
            field === 'department_id'
              ? Number(departments[1])
              : field === 'course_code'
                ? `CHANGED-${serial}`
                : 'Changed',
        };
        await unchanged(
          () => post(changed, key),
          409,
          'COURSE_CREATE_INPUT_MISMATCH',
        );
      },
    );
    it('binds automatic versus explicit mode even when the supplied code matches the result', async () => {
      const key = randomUUID(),
        input = body(),
        course = await create(input, key);
      await unchanged(
        () => post({ ...input, course_code: course.course_code }, key),
        409,
        'COURSE_CREATE_INPUT_MISMATCH',
      );
    });
    it('normalizes key casing and input trimming for identical retries', async () => {
      const key = randomUUID(),
        input = body({ course_code: `TRIM-${++serial}` }),
        first = await create(input, key);
      const retry = await unchanged(
        () =>
          post(
            { ...input, course_name: ` ${input.course_name} ` },
            key.toUpperCase(),
          ),
        201,
      );
      expect(retry.body).toEqual(first);
    });
    it('does not let another administrator claim or inspect a receipt', async () => {
      const key = randomUUID(),
        input = body();
      await create(input, key);
      await unchanged(() => post(input, key, 'ADMIN2'), 404);
      await unchanged(() => recovery(key, 'ADMIN2'), 404);
    });
    it('rejects a key already owned by another administrative operation', async () => {
      const key = randomUUID();
      await db.reviewed_operations.create({
        data: {
          id: key,
          actor_id: users.ADMIN,
          operation_kind: 'ENROLL_GROUP',
          resource_key: 'other',
          request_json: {},
          request_fingerprint: '0'.repeat(64),
          snapshot_fingerprint: '0'.repeat(64),
          expires_at: new Date(),
        },
      });
      await unchanged(() => post(body(), key), 409, 'IDEMPOTENCY_KEY_IN_USE');
    });
    it('returns the saved result after edits, department deactivation and elapsed receipt expiry', async () => {
      const key = randomUUID(),
        input = body(),
        course = await create(input, key);
      const edited = await api()
        .put(`/api/courses/${course.id}`)
        .set(auth())
        .send({
          course_name: 'Renamed later',
          department_id: Number(departments[1]),
        });
      expect(edited.status).toBe(200);
      expect(edited.body.course_code).toBe(course.course_code);
      await db.departments.update({
        where: { id: departments[0] },
        data: { status: 'INACTIVE' },
      });
      try {
        expect((await unchanged(() => post(input, key), 201)).body).toEqual(
          course,
        );
        expect((await unchanged(() => recovery(key), 200)).body.course).toEqual(
          course,
        );
      } finally {
        await db.departments.update({
          where: { id: departments[0] },
          data: { status: 'ACTIVE' },
        });
      }
      expect(
        (await db.reviewed_operations.findUnique({
          where: { id: key },
        }))!.expires_at.getTime(),
      ).toBeLessThanOrEqual(Date.now());
    });
    it('recovers a deleted course result without creating again or reusing its reserved automatic code', async () => {
      const key = randomUUID(),
        input = body(),
        course = await create(input, key);
      expect(
        (await api().delete(`/api/courses/${course.id}`).set(auth())).status,
      ).toBe(204);
      expect((await unchanged(() => post(input, key), 201)).body).toEqual(
        course,
      );
      expect((await create()).course_code).not.toBe(course.course_code);
    });
    it('keeps stored codes on name/department edits and applies uniqueness to explicit code changes', async () => {
      const course = await create(),
        other = await create(body({ course_code: `EDIT-${++serial}` }));
      const changed = await api()
        .put(`/api/courses/${course.id}`)
        .set(auth())
        .send({
          course_name: 'Edited only',
          department_id: Number(departments[1]),
        });
      expect(changed.status).toBe(200);
      expect(changed.body.course_code).toBe(course.course_code);
      await unchanged(
        () =>
          api()
            .put(`/api/courses/${course.id}`)
            .set(auth())
            .send({ course_code: other.course_code }),
        409,
      );
    });
    it('serializes two administrators allocating from the same prefix', async () => {
      const results = await Promise.all([
        post(body(), randomUUID()),
        post(body(), randomUUID(), 'ADMIN2'),
      ]);
      expect(results.map((r) => r.status)).toEqual([201, 201]);
      expect(new Set(results.map((r) => r.body.course_code)).size).toBe(2);
    });
    it('commits once for concurrent identical automatic requests', async () => {
      const key = randomUUID(),
        input = body(),
        before = await db.courses.count();
      const results = await Promise.all([post(input, key), post(input, key)]);
      expect(results.map((r) => r.status)).toEqual([201, 201]);
      expect(results[0].body).toEqual(results[1].body);
      expect(await db.courses.count()).toBe(before + 1);
    });
    it('serializes a manual collision with automatic allocation without altering the supplied code', async () => {
      const isolated = await db.departments.create({
        data: { code: 'RACE', name: 'Synthetic race department' },
      });
      const [manual, automatic] = await Promise.all([
        post(
          body({ department_id: Number(isolated.id), course_code: 'RACE-001' }),
        ),
        post(
          body({ department_id: Number(isolated.id) }),
          randomUUID(),
          'ADMIN2',
        ),
      ]);
      expect(automatic.status).toBe(201);
      expect([201, 409]).toContain(manual.status);
      if (manual.status === 201) {
        expect(manual.body.course_code).toBe('RACE-001');
        expect(automatic.body.course_code).toBe('RACE-002');
      } else expect(automatic.body.course_code).toBe('RACE-001');
    });
    it('rolls back the course when the receipt insert fails, then safely retries the same key', async () => {
      const key = randomUUID(),
        input = body({ department_id: Number(departments[1]) });
      await db.$executeRawUnsafe(
        "CREATE FUNCTION fail_course_receipt() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF NEW.operation_kind='CREATE_COURSE' THEN RAISE EXCEPTION 'Synthetic receipt failure'; END IF; RETURN NEW; END $f$",
      );
      await db.$executeRawUnsafe(
        'CREATE TRIGGER synthetic_course_receipt_failure BEFORE INSERT ON reviewed_operations FOR EACH ROW EXECUTE FUNCTION fail_course_receipt()',
      );
      try {
        await unchanged(
          () => post(input, key),
          500,
          'COURSE_CREATE_RESULT_UNCERTAIN',
        );
        await unchanged(() => recovery(key), 404);
      } finally {
        await db.$executeRawUnsafe(
          'DROP TRIGGER synthetic_course_receipt_failure ON reviewed_operations',
        );
        await db.$executeRawUnsafe('DROP FUNCTION fail_course_receipt()');
      }
      const course = await create(input, key);
      expect((await unchanged(() => post(input, key), 201)).body).toEqual(
        course,
      );
    });
    it('returns a bounded lock conflict and preserves the original retry key', async () => {
      let acquired!: () => void, release!: () => void;
      const ready = new Promise<void>((resolve) => {
        acquired = resolve;
      });
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      const held = db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('course-code-allocation:v1',0))::text`;
          acquired();
          await released;
        },
        { timeout: 15000 },
      );
      const key = randomUUID(),
        input = body();
      await ready;
      try {
        await unchanged(
          () => post(input, key),
          409,
          'COURSE_CREATE_RETRY_REQUIRED',
        );
      } finally {
        release();
        await held;
      }
      const course = await create(input, key);
      expect((await unchanged(() => post(input, key), 201)).body).toEqual(
        course,
      );
    }, 20000);
    it.each([
      {},
      { course_code: null },
      { course_code: '' },
      { course_code: 12 },
      { course_name: '' },
      { department_id: '1' },
      { department_id: 9007199254740992 },
    ])(
      'rejects missing-key or invalid input without writes (%#)',
      async (extra) => {
        await unchanged(() => unkeyed(body(extra)), 400);
      },
    );
    it.each(['', 'not-a-uuid', 'a1234567-1234-1567-8123-123456789abc'])(
      'rejects malformed idempotency key %s',
      async (key) => {
        await unchanged(
          () => post(body(), key),
          400,
          'IDEMPOTENCY_KEY_INVALID',
        );
      },
    );
    it.each([999999, 5])(
      'rejects missing/inactive department %s',
      async (index) => {
        await unchanged(
          () =>
            post(
              body({
                department_id: index === 5 ? Number(departments[5]) : index,
              }),
            ),
          400,
        );
      },
    );
    it.each(['LECTURER', 'STUDENT'])(
      'preserves ADMIN-only creation/receipt access for %s',
      async (role) => {
        await unchanged(() => post(body(), randomUUID(), role), 403);
        await unchanged(() => recovery(randomUUID(), role), 403);
      },
    );
    it('rejects unauthenticated and revoked sessions', async () => {
      await unchanged(() => api().post('/api/courses').send(body()), 401);
      await db.users.update({
        where: { id: users.ADMIN2 },
        data: { auth_version: { increment: 1 } },
      });
      try {
        await unchanged(() => post(body(), randomUUID(), 'ADMIN2'), 401);
      } finally {
        await db.users.update({
          where: { id: users.ADMIN2 },
          data: { auth_version: { decrement: 1 } },
        });
      }
    });
    it('rechecks current ADMIN status in the write transaction for direct backend callers', async () => {
      const before = await fixture.snapshot(db);
      const service = new CourseCreationService(db as any);
      await expect(
        service.create(body(), users.LECTURER, randomUUID()),
      ).rejects.toMatchObject({ status: 403 });
      expect(await fixture.snapshot(db)).toEqual(before);
    });
    it('suppresses capability and rejects keyed creation if actual receipt prerequisites are absent', async () => {
      await db.$executeRawUnsafe(
        'ALTER TABLE reviewed_operations RENAME CONSTRAINT reviewed_operations_kind_check TO codes_temporarily_renamed_kind',
      );
      try {
        expect(
          (await unchanged(() => api().get('/api/auth/me').set(auth()), 200))
            .body.capabilities,
        ).not.toHaveProperty('automatic_course_codes_v1');
        await unchanged(
          () => post(body()),
          503,
          'COURSE_CODE_SCHEMA_NOT_READY',
        );
        const manual = await unkeyed(
          body({ course_code: `COMPAT-${++serial}` }),
        );
        expect(manual.status).toBe(201);
      } finally {
        await db.$executeRawUnsafe(
          'ALTER TABLE reviewed_operations RENAME CONSTRAINT codes_temporarily_renamed_kind TO reviewed_operations_kind_check',
        );
      }
      expect(
        (await api().get('/api/auth/me').set(auth())).body.capabilities
          .automatic_course_codes_v1,
      ).toBe(true);
    });
    it('preserves original courses, approved curriculum, teaching assignment, completion and anonymous answer rows', async () => {
      expect(await db.responses.count()).toBe(1);
      expect(await db.answers.count()).toBe(1);
      expect(await db.evaluations.count({ where: { status: 'CLOSED' } })).toBe(
        1,
      );
      expect(await stableHistory()).toEqual(historical);
    });
    it('documents optional course_code, the UUID header, original response, recovery and capability', () => {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().addBearerAuth().build(),
      );
      expect(
        (
          document.components!.schemas!.CreateCourseDto as {
            required?: string[];
          }
        ).required,
      ).not.toContain('course_code');
      expect(document.paths['/api/courses'].post!.description).toContain(
        'automatic_course_codes_v1',
      );
      expect(document.paths['/api/courses'].post!.parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
          }),
        ]),
      );
      expect(
        document.paths['/api/courses/creation-receipts/{key}'].get,
      ).toBeDefined();
    });
  });
});
