import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CourseOfferingsService } from '../src/course-offerings/course-offerings.service';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

const { auditOfferingIdentities } = createRequire(
  `${process.cwd()}/package.json`,
)('./scripts/offering-identity-preflight.cjs') as {
  auditOfferingIdentities: (db: PrismaClient) => Promise<{
    duplicate_groups: number;
    duplicates: Array<{
      offering_ids: string[];
      original_labels: Array<string | null>;
      year_level: number | null;
      class_type: string | null;
    }>;
    legacy_incomplete_offerings: number;
  }>;
};

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Teaching-assignment identity without display labels (owned HTTP)', () => {
  const fixture = new CohortImportFixture();
  let db: PrismaClient,
    app: INestApplication,
    department: bigint,
    major: bigint,
    cohort: bigint,
    course: bigint,
    serial = 0,
    protectedState: unknown;
  const years: bigint[] = [],
    semesters: bigint[] = [],
    users: Record<string, bigint> = {},
    tokens: Record<string, string> = {};
  const now = () => new Date();
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const body = (extra: object = {}) => ({
    course_id: String(course),
    lecturer_id: String(users.LECTURER),
    semester_id: String(semesters[0]),
    year_level: 2,
    class_type: 'COURSE',
    section_code: 'Original label',
    ...extra,
  });
  const post = (input: object, role = 'ADMIN') =>
    api().post('/api/course-offerings').set(auth(role)).send(input);
  const put = (id: string | bigint, input: object, role = 'ADMIN') =>
    api().put(`/api/course-offerings/${id}`).set(auth(role)).send(input);
  const scope = (group = 'A') => ({
    academic_year_id: String(years[0]),
    generation_id: String(cohort),
    major_id: String(major),
    year_level: 2,
    class_groups: [group],
  });
  async function create(input = body()) {
    const result = await post(input);
    expect(result.status).toBe(201);
    return result.body;
  }
  async function reject(
    operation: () => PromiseLike<request.Response>,
    status: number,
    existing?: string,
  ) {
    const before = await fixture.snapshot(db),
      result = await operation();
    expect(result.status).toBe(status);
    if (existing)
      expect(result.body).toMatchObject({
        code: 'OFFERING_ALREADY_EXISTS',
        existing_course_offering_id: existing,
      });
    expect(await fixture.snapshot(db)).toEqual(before);
    return result;
  }
  async function raw(extra: object = {}) {
    return db.course_offerings.create({
      data: {
        course_id: course,
        lecturer_id: users.LECTURER,
        semester_id: semesters[0],
        year_level: 2,
        class_type: 'COURSE',
        section_code: `Raw-${++serial}`,
        created_at: now(),
        updated_at: now(),
        ...extra,
      },
    });
  }
  async function newCourse() {
    const row = await db.courses.create({
      data: {
        course_code: `J-${++serial}`,
        course_name: `Synthetic J ${serial}`,
        department_id: department,
        created_at: now(),
        updated_at: now(),
      },
    });
    for (const year_level of [2, 3])
      await db.course_year_rules.create({
        data: {
          course_id: row.id,
          major_id: major,
          year_level,
          revisions: {
            create: {
              revision_no: 1,
              effective_academic_year_id: years[0],
              effective_start_year: 2096,
              enabled: true,
            },
          },
        },
      });
    return row.id;
  }
  async function history() {
    return (await fixture.snapshot(db)).filter((row) =>
      [
        'enrollments',
        'evaluations',
        'evaluation_participants',
        'assessment_drafts',
        'responses',
        'answers',
        'surveys',
        'survey_versions',
        'questions',
        'evaluation_group_targets',
      ].includes(row.name),
    );
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    const hash = await bcrypt.hash('SyntheticIdentity123!', 4);
    for (const role of [
      'ADMIN',
      'ADMIN2',
      'LECTURER',
      'LECTURER2',
      'LECTURER3',
      'STUDENT',
    ])
      users[role] = (
        await db.users.create({
          data: {
            role: role.startsWith('ADMIN')
              ? 'ADMIN'
              : role.startsWith('LECTURER')
                ? 'LECTURER'
                : 'STUDENT',
            email: `${role.toLowerCase()}@identity.example.test`,
            full_name: `Synthetic identity ${role}`,
            password_hash: hash,
            created_at: now(),
            updated_at: now(),
          },
        })
      ).id;
    department = (
      await db.departments.create({
        data: { code: 'J-ID', name: 'Synthetic identity department' },
      })
    ).id;
    major = (
      await db.majors.create({
        data: {
          code: 'J-M',
          name: 'Synthetic identity major',
          department_id: department,
        },
      })
    ).id;
    for (const start_year of [2096, 2097])
      years.push(
        (
          await db.academic_years.create({
            data: {
              name: `J ${start_year}`,
              start_year,
              is_active: start_year === 2096,
            },
          })
        ).id,
      );
    for (const [year, number] of [
      [0, 1],
      [0, 2],
      [1, 1],
    ])
      semesters.push(
        (
          await db.semesters.create({
            data: {
              academic_year_id: years[year],
              semester_name: `Semester ${number}`,
              semester_number: number,
              created_at: now(),
              updated_at: now(),
            },
          })
        ).id,
      );
    cohort = (
      await db.student_generations.create({
        data: {
          name: 'Gen 1',
          major_id: major,
          generation_number: 1,
          ownership_state: 'MAJOR_SCOPED',
          entry_academic_year_id: years[0],
          starting_year_level: 2,
        },
      })
    ).id;
    course = await newCourse();
    const original = await raw({
        section_code: 'Historical A',
        year_level: null,
      }),
      second = await raw({ section_code: 'Historical B', year_level: null });
    const survey = await db.surveys.create({
      data: {
        title: 'Identity protected survey',
        created_by: users.ADMIN,
        created_at: now(),
        updated_at: now(),
      },
    });
    const version = await db.survey_versions.create({
      data: {
        survey_id: survey.id,
        version_no: 1,
        created_by: users.ADMIN,
        created_at: now(),
      },
    });
    const question = await db.questions.create({
      data: {
        survey_version_id: version.id,
        question_text: 'Identity protected rating',
        question_type: 'RATING',
        min_rating: 1,
        max_rating: 5,
        display_order: 1,
        created_at: now(),
        updated_at: now(),
      },
    });
    await db.survey_versions.update({
      where: { id: version.id },
      data: { status: 'LOCKED', locked_at: now() },
    });
    const evaluation = await db.evaluations.create({
      data: {
        course_offering_id: original.id,
        survey_version_id: version.id,
        status: 'OPEN',
        created_by: users.ADMIN,
        created_at: now(),
        updated_at: now(),
      },
    });
    await db.enrollments.create({
      data: {
        course_offering_id: original.id,
        student_id: users.STUDENT,
        enrolled_at: now(),
      },
    });
    const participant = await db.evaluation_participants.create({
      data: {
        evaluation_id: evaluation.id,
        student_id: users.STUDENT,
        survey_version_id: version.id,
        created_at: now(),
      },
    });
    await db.$transaction(async (tx) => {
      const response = await tx.responses.create({
        data: {
          evaluation_id: evaluation.id,
          survey_version_id: version.id,
          submitted_at: now(),
          created_at: now(),
        },
      });
      await tx.answers.create({
        data: {
          response_id: response.id,
          question_id: question.id,
          rating_value: 5,
          created_at: now(),
        },
      });
      await tx.evaluation_participants.update({
        where: { id: participant.id },
        data: { has_submitted: true, submitted_at: now() },
      });
    });
    await db.evaluations.update({
      where: { id: evaluation.id },
      data: { status: 'CLOSED', updated_at: now() },
    });
    protectedState = {
      history: await history(),
      offerings: await db.course_offerings.findMany({
        where: { id: { in: [original.id, second.id] } },
        include: { group_scopes: true },
        orderBy: { id: 'asc' },
      }),
    };
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
          identifier: `${role.toLowerCase()}@identity.example.test`,
          password: 'SyntheticIdentity123!',
        });
      expect(login.status).toBe(200);
      tokens[role] = login.body.access_token;
    }
  }, 90000);
  beforeEach(async () => {
    course = await newCourse();
  });
  afterEach(async () => {
    await fixture.unchangedPublic();
    if (protectedState) {
      const saved = protectedState as {
        history: unknown;
        offerings: Array<{ id: bigint }>;
      };
      expect(await history()).toEqual(saved.history);
      expect(
        await db.course_offerings.findMany({
          where: { id: { in: saved.offerings.map((row) => row.id) } },
          include: { group_scopes: true },
          orderBy: { id: 'asc' },
        }),
      ).toEqual(saved.offerings);
    }
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture.close();
    }
  });

  it.each(['Another label', '   ', undefined])(
    'rejects same identity with class label %j',
    async (section_code) => {
      const existing = await create();
      await reject(() => post(body({ section_code })), 409, existing.id);
    },
  );
  it.each(['', null])(
    'rejects invalid optional label %j without writes',
    async (section_code) => {
      await reject(() => post(body({ section_code })), 400);
    },
  );
  it('keeps label-free assignment identity on first creation and repeat', async () => {
    const existing = await create(body({ section_code: undefined }));
    expect(existing.section_code).toBeNull();
    await reject(
      () => post(body({ section_code: 'Now named' })),
      409,
      existing.id,
    );
  });
  it('does not let different groups distinguish an occupied identity', async () => {
    const existing = await create(body({ group_scopes: [scope('A')] }));
    await reject(
      () => post(body({ section_code: 'Group B', group_scopes: [scope('B')] })),
      409,
      existing.id,
    );
  });
  it.each(['course', 'lecturer', 'semester', 'year', 'class_type'])(
    'permits a genuinely different %s identity',
    async (field) => {
      const original = await create();
      const changes: Record<string, object> = {
        course: { course_id: String(await newCourse()) },
        lecturer: { lecturer_id: String(users.LECTURER2) },
        semester: { semester_id: String(semesters[1]) },
        year: { year_level: 3 },
        class_type: { class_type: 'TD' },
      };
      const other = await create(
        body({ ...changes[field], section_code: original.section_code }),
      );
      expect(other.id).not.toBe(original.id);
    },
  );
  it('keeps two semesters of different academic years independent', async () => {
    const original = await create();
    const other = await create(body({ semester_id: String(semesters[2]) }));
    expect(other.id).not.toBe(original.id);
  });
  it('rejects an identity-changing update with another label and preserves both assignments', async () => {
    const existing = await create(),
      other = await create(body({ lecturer_id: String(users.LECTURER2) }));
    await reject(
      () =>
        put(other.id, {
          lecturer_id: String(users.LECTURER),
          section_code: 'Another',
        }),
      409,
      existing.id,
    );
  });
  it('allows display edits on a unique assignment without creating another row', async () => {
    const original = await create(),
      result = await put(original.id, { section_code: 'Corrected label' });
    expect(result.status).toBe(200);
    expect(result.body.id).toBe(original.id);
    expect(result.body.section_code).toBe('Corrected label');
    expect(
      await db.course_offerings.count({ where: { course_id: course } }),
    ).toBe(1);
  });
  it('rejects invalid label update "" without a trim crash', async () => {
    const original = await create();
    await reject(() => put(original.id, { section_code: '' }), 400);
  });
  it('clears the label on update null without a trim crash or another row', async () => {
    const original = await create(),
      result = await put(original.id, { section_code: null });
    expect(result.status).toBe(200);
    expect(result.body.id).toBe(original.id);
    expect(result.body.section_code).toBeNull();
    expect(
      await db.course_offerings.count({ where: { course_id: course } }),
    ).toBe(1);
  });
  it('preserves a unique legacy null year/type on a display-only edit', async () => {
    const original = await raw({ year_level: null, class_type: null }),
      result = await put(original.id, { section_code: 'Legacy corrected' });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: String(original.id),
      year_level: null,
      class_type: null,
    });
  });
  it('reports a pre-existing null identity conflict without merging history', async () => {
    const a = await raw({ year_level: null, class_type: null }),
      b = await raw({ year_level: null, class_type: null });
    await reject(
      () => put(b.id, { section_code: 'Do not merge' }),
      409,
      String(a.id),
    );
  });
  it('does not equate a legacy null year with an explicitly approved year', async () => {
    const old = await raw({ year_level: null });
    expect((await create()).id).not.toBe(String(old.id));
  });
  it('does not equate a legacy null class type with COURSE', async () => {
    const old = await raw({ class_type: null });
    expect((await create()).id).not.toBe(String(old.id));
  });
  it('returns the existing reference and rejects new complete label-only duplicates at the SQL boundary', async () => {
    const first = await raw();
    await expect(raw()).rejects.toMatchObject({ code: 'P2002' });
    await reject(
      () => post(body({ section_code: 'Third label' })),
      409,
      String(first.id),
    );
  });
  it('serializes simultaneous label-only creates and resolves the winner on retry', async () => {
    const results = await Promise.all(
      ['Race A', 'Race B'].map((section_code) => post(body({ section_code }))),
    );
    expect(results.map((row) => row.status).sort()).toEqual([201, 409]);
    const saved = await db.course_offerings.findMany({
      where: { course_id: course },
    });
    expect(saved).toHaveLength(1);
    expect(['OFFERING_ALREADY_EXISTS', 'OFFERING_WRITE_CONFLICT']).toContain(
      results.find((row) => row.status === 409)!.body.code,
    );
    await reject(
      () => post(body({ section_code: 'Retry same identity' })),
      409,
      String(saved[0].id),
    );
  });
  it('prevents simultaneous updates from converging on one identity', async () => {
    const a = await create(),
      b = await create(body({ lecturer_id: String(users.LECTURER2) }));
    const results = await Promise.all([
      put(a.id, { lecturer_id: String(users.LECTURER3), section_code: 'A' }),
      put(b.id, { lecturer_id: String(users.LECTURER3), section_code: 'B' }),
    ]);
    expect(results.map((row) => row.status).sort()).toEqual([200, 409]);
    expect(
      await db.course_offerings.count({
        where: { course_id: course, lecturer_id: users.LECTURER3 },
      }),
    ).toBe(1);
    expect(
      await db.course_offerings.count({ where: { course_id: course } }),
    ).toBe(2);
  });
  it('prevents a simultaneous create/update collision without removing the other identity', async () => {
    const original = await create(
      body({ lecturer_id: String(users.LECTURER2) }),
    );
    const results = await Promise.all([
      post(body({ section_code: 'Create' })),
      put(original.id, {
        lecturer_id: String(users.LECTURER),
        section_code: 'Update',
      }),
    ]);
    expect(results.filter((row) => row.status === 409)).toHaveLength(1);
    expect(
      results.filter((row) => [200, 201].includes(row.status)),
    ).toHaveLength(1);
    expect(
      await db.course_offerings.count({
        where: { course_id: course, lecturer_id: users.LECTURER },
      }),
    ).toBe(1);
    expect(
      await db.course_offerings.findUnique({
        where: { id: BigInt(original.id) },
      }),
    ).not.toBeNull();
  });
  it('audits preserved null legacy duplicates while complete duplicates are rejected', async () => {
    await raw();
    await expect(raw()).rejects.toMatchObject({ code: 'P2002' });
    await raw({ year_level: null, class_type: null });
    await raw({ year_level: null, class_type: null });
    const before = await fixture.snapshot(db),
      report = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return auditOfferingIdentities(tx as unknown as PrismaClient);
      });
    expect(report.duplicate_groups).toBeGreaterThanOrEqual(2);
    expect(report.legacy_incomplete_offerings).toBeGreaterThanOrEqual(4);
    expect(
      report.duplicates.some(
        (row) =>
          row.year_level === null &&
          row.class_type === null &&
          row.offering_ids.length === 2,
      ),
    ).toBe(true);
    expect(await fixture.snapshot(db)).toEqual(before);
  });
  it.each(['STUDENT', 'LECTURER'])(
    'does not disclose duplicate references to %s',
    async (role) => {
      const existing = await create();
      const createResult = await reject(() => post(body(), role), 403);
      expect(createResult.body.existing_course_offering_id).toBeUndefined();
      await reject(
        () => put(existing.id, { section_code: 'Denied' }, role),
        403,
      );
    },
  );
  it('requires authentication before disclosing duplicate references', async () => {
    await create();
    await reject(() => api().post('/api/course-offerings').send(body()), 401);
  });
  it('keeps active ADMIN school-wide and returns an authorized existing reference', async () => {
    const existing = await create();
    await reject(
      () => post(body({ section_code: 'Admin2' }), 'ADMIN2'),
      409,
      existing.id,
    );
  });
  it('rejects direct non-ADMIN service calls before duplicate lookup', async () => {
    await expect(
      new CourseOfferingsService(db as unknown as PrismaService).create(
        body() as any,
        users.STUDENT,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('preserves CLOSED teaching ownership before attempting a conflicting update', async () => {
    const saved = (protectedState as { offerings: Array<{ id: bigint }> })
      .offerings[0];
    const result = await reject(
      () => put(saved.id, { lecturer_id: String(users.LECTURER2) }),
      409,
    );
    expect(result.body.code).toBe('OFFERING_HISTORY_PROTECTED');
  });
  it('documents label-free identity, authorized conflict references and compatibility limits', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    const create409 = JSON.stringify(
      document.paths['/api/course-offerings'].post?.responses['409'],
    );
    expect(create409).toContain('OFFERING_ALREADY_EXISTS');
    expect(create409).toContain('existing_course_offering_id');
    expect(create409).toContain('OFFERING_WRITE_CONFLICT');
    expect(create409).toContain('excluding section_code');
  });
});
