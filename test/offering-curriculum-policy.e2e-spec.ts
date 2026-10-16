import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CourseOfferingsService } from '../src/course-offerings/course-offerings.service';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Curriculum-approved new teaching contexts (owned HTTP)', () => {
  const fixture = new CohortImportFixture();
  let db: PrismaClient, app: INestApplication;
  const tokens: Record<string, string> = {},
    users: Record<string, bigint> = {};
  const departments: bigint[] = [],
    majors: bigint[] = [],
    years: bigint[] = [],
    semesters: bigint[] = [],
    courses: bigint[] = [],
    cohorts: bigint[] = [];
  const revisions: Record<string, bigint[]> = {},
    rules: Record<string, bigint> = {};
  let serial = 0,
    pinnedEdit: string,
    pinnedUsed: string,
    protectedHistory: unknown;
  // Track only this suite's transient offering rows, never its protected history.
  const transientOfferings = new Set<bigint>();
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const scope = (major = 0, year = 1, extra: object = {}) => ({
    academic_year_id: String(years[year]),
    generation_id: String(cohorts[major === 1 ? 1 : 0]),
    major_id: String(majors[major]),
    year_level: 2,
    class_groups: [' a ', 'B'],
    ...extra,
  });
  const body = (extra: object = {}) => ({
    course_id: String(courses[0]),
    lecturer_id: String(users.LECTURER),
    semester_id: String(semesters[1]),
    year_level: 2,
    class_type: 'COURSE',
    section_code: `H-${++serial}`,
    ...extra,
  });
  const post = (input: object, role = 'ADMIN') =>
    api().post('/api/course-offerings').set(auth(role)).send(input);
  const put = (id: string | bigint, input: object, role = 'ADMIN') =>
    api().put(`/api/course-offerings/${id}`).set(auth(role)).send(input);
  async function unchanged(
    operation: () => PromiseLike<request.Response>,
    status: number,
    code?: string,
  ) {
    const before = await fixture.snapshot(db);
    const response = await operation();
    expect(response.status).toBe(status);
    if (code) expect(response.body.code).toBe(code);
    expect(await fixture.snapshot(db)).toEqual(before);
    return response;
  }
  async function create(input = body(), role = 'ADMIN') {
    const result = await post(input, role);
    expect(result.status).toBe(201);
    transientOfferings.add(BigInt(result.body.id));
    return result.body;
  }
  async function approve(
    course: number,
    major: number,
    level: number,
    entries: Array<[number, boolean]>,
  ) {
    const key = `${course}:${major}:${level}`;
    const rule = await db.course_year_rules.create({
      data: {
        course_id: courses[course],
        major_id: majors[major],
        year_level: level,
      },
    });
    rules[key] = rule.id;
    revisions[key] = [];
    for (const [index, [year, enabled]] of entries.entries())
      revisions[key].push(
        (
          await db.curriculum_revisions.create({
            data: {
              rule_id: rule.id,
              revision_no: index + 1,
              effective_academic_year_id: years[year],
              effective_start_year: (
                await db.academic_years.findUniqueOrThrow({
                  where: { id: years[year] },
                })
              ).start_year!,
              enabled,
            },
          })
        ).id,
      );
  }
  async function legacy(extra: object = {}, withScope = false) {
    const now = new Date();
    const result = await db.course_offerings.create({
      data: {
        course_id: courses[1],
        lecturer_id: users.LECTURER,
        semester_id: semesters[1],
        year_level: null,
        class_type: null,
        section_code: `OLD-${++serial}`,
        created_at: now,
        updated_at: now,
        ...extra,
        ...(withScope && {
          group_scopes: {
            create: {
              academic_year_id: years[1],
              generation_id: cohorts[0],
              major_id: majors[0],
              year_level: 2,
              class_group: 'A',
            },
          },
        }),
      },
      include: { group_scopes: true },
    });
    transientOfferings.add(result.id);
    return result;
  }
  async function history() {
    return {
      tables: (await fixture.snapshot(db)).filter(
        (row) =>
          ![
            'course_offerings',
            'course_offering_group_scopes',
            'users',
          ].includes(row.name),
      ),
      used: await db.course_offerings.findUnique({
        where: { id: BigInt(pinnedUsed) },
        include: { group_scopes: true },
      }),
    };
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    const hash = await bcrypt.hash('SyntheticCurriculum123!', 4),
      now = new Date();
    for (const role of ['ADMIN', 'ADMIN2', 'LECTURER', 'LECTURER2', 'STUDENT'])
      users[role] = (
        await db.users.create({
          data: {
            role: role.startsWith('ADMIN')
              ? 'ADMIN'
              : role.startsWith('LECTURER')
                ? 'LECTURER'
                : 'STUDENT',
            email: `${role.toLowerCase()}@h.example.test`,
            full_name: `Synthetic H ${role}`,
            password_hash: hash,
            created_at: now,
            updated_at: now,
          },
        })
      ).id;
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
          identifier: `${role.toLowerCase()}@h.example.test`,
          password: 'SyntheticCurriculum123!',
        });
      expect(login.status).toBe(200);
      tokens[role] = login.body.access_token;
    }
    for (let index = 0; index < 3; index++)
      departments.push(
        (
          await db.departments.create({
            data: {
              code: `H-D${index}`,
              name: `Synthetic H dept ${index}`,
              status: index === 2 ? 'INACTIVE' : 'ACTIVE',
            },
          })
        ).id,
      );
    for (const [index, code] of ['DS', 'FE', 'INACTIVE'].entries())
      majors.push(
        (
          await db.majors.create({
            data: {
              code: `H-${code}`,
              name: `H ${code}`,
              department_id: departments[index],
            },
          })
        ).id,
      );
    for (const [index, start_year] of [
      2089,
      2090,
      2091,
      2092,
      2093,
      null,
    ].entries()) {
      years.push(
        (
          await db.academic_years.create({
            data: {
              name: `H year ${index}`,
              start_year,
              is_active: index === 4,
            },
          })
        ).id,
      );
      semesters.push(
        (
          await db.semesters.create({
            data: {
              academic_year_id: years[index],
              semester_name: 'Semester 1',
              semester_number: 1,
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    }
    semesters.push(
      (
        await db.semesters.create({
          data: {
            academic_year_id: years[1],
            semester_name: 'Semester 2',
            semester_number: 2,
            created_at: now,
            updated_at: now,
          },
        })
      ).id,
    );
    for (let index = 0; index < 7; index++)
      courses.push(
        (
          await db.courses.create({
            data: {
              course_code: `H-${index}`,
              course_name: `Synthetic H course ${index}`,
              department_id: departments[index === 4 ? 2 : 0],
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    for (let major = 0; major < 2; major++)
      cohorts.push(
        (
          await db.student_generations.create({
            data: {
              name: 'Gen 1',
              major_id: majors[major],
              generation_number: 1,
              ownership_state: 'MAJOR_SCOPED',
              entry_academic_year_id: years[0],
            },
          })
        ).id,
      );
    await approve(0, 0, 2, [
      [0, true],
      [2, false],
      [4, true],
    ]);
    await approve(0, 1, 2, [
      [0, true],
      [3, false],
    ]);
    await approve(0, 1, 3, [[1, true]]);
    await approve(1, 0, 2, []);
    await approve(2, 0, 2, [[4, true]]);
    await approve(4, 0, 2, [[0, true]]);
    await approve(5, 2, 2, [[0, true]]);
    await approve(6, 0, 2, [[0, true]]);
    pinnedEdit = (
      await create(
        body({ course_id: String(courses[6]), group_scopes: [scope(0)] }),
      )
    ).id;
    pinnedUsed = (
      await create(
        body({
          course_id: String(courses[6]),
          class_type: 'TD',
          group_scopes: [scope(0)],
        }),
      )
    ).id;
    const survey = await db.surveys.create({
      data: {
        title: 'H protected questionnaire',
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
        question_text: 'H protected rating',
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
        course_offering_id: BigInt(pinnedUsed),
        survey_version_id: version.id,
        status: 'OPEN',
        created_by: users.ADMIN,
        created_at: now,
        updated_at: now,
      },
    });
    await db.enrollments.create({
      data: {
        course_offering_id: BigInt(pinnedUsed),
        student_id: users.STUDENT,
        enrolled_at: now,
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
    revisions['6:0:2'].push(
      (
        await db.curriculum_revisions.create({
          data: {
            rule_id: rules['6:0:2'],
            revision_no: 2,
            effective_academic_year_id: years[1],
            effective_start_year: 2090,
            enabled: false,
          },
        })
      ).id,
    );
    transientOfferings.clear();
    protectedHistory = await history();
  }, 90000);
  afterEach(async () => {
    if (transientOfferings.size) {
      const ids = [...transientOfferings];
      await db.course_offering_group_scopes.deleteMany({
        where: { course_offering_id: { in: ids } },
      });
      await db.course_offerings.deleteMany({ where: { id: { in: ids } } });
      transientOfferings.clear();
    }
    await fixture.unchangedPublic();
    if (protectedHistory) expect(await history()).toEqual(protectedHistory);
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture.close();
    }
  });

  it.each([undefined, null, 0, 6, 1.5, true, [], {}])(
    'requires valid new year_level %j even with no scopes',
    async (year_level) => {
      await unchanged(() => post(body({ year_level })), 400);
    },
  );
  it('retains numeric-string year compatibility without coercing booleans', async () => {
    expect((await create(body({ year_level: '2' }))).year_level).toBe(2);
  });
  it.each([undefined, []])(
    'blocks an unversioned-rule unscoped bypass %j',
    async (group_scopes) => {
      await unchanged(
        () => post(body({ course_id: String(courses[1]), group_scopes })),
        409,
        'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
      );
    },
  );
  it('blocks an empty curriculum and an inactive-only approval', async () => {
    for (const index of [3, 5])
      await unchanged(
        () => post(body({ course_id: String(courses[index]) })),
        409,
        'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
      );
  });
  it('rejects explicit null group scopes at the DTO boundary', async () => {
    await unchanged(() => post(body({ group_scopes: null })), 400);
  });
  it('does not use a future approval for an earlier selected semester', async () => {
    await unchanged(
      () => post(body({ course_id: String(courses[2]) })),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it('uses selected-year approval rather than active-year curriculum', async () => {
    expect(
      (await create(body({ semester_id: String(semesters[2]) }))).semester_id,
    ).toBe(String(semesters[2]));
    await unchanged(
      () => post(body({ semester_id: String(semesters[3]) })),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it('accepts reapproval in its own year and retains the authoritative revision per major', async () => {
    const result = await create(
      body({ semester_id: String(semesters[4]), group_scopes: [scope(0, 4)] }),
    );
    expect(
      result.group_scopes.every(
        (row: any) =>
          row.curriculum_revision_id === String(revisions['0:0:2'][2]),
      ),
    ).toBe(true);
  });
  it('pins every approved major independently, including an explicitly approved cross-department audience', async () => {
    const result = await create(body({ group_scopes: [scope(0), scope(1)] }));
    expect(
      new Set(
        result.group_scopes.map((row: any) => row.curriculum_revision_id),
      ),
    ).toEqual(
      new Set([String(revisions['0:0:2'][0]), String(revisions['0:1:2'][0])]),
    );
  });
  it('rejects a withdrawn target major even when another major still authorizes an unscoped offering', async () => {
    await unchanged(
      () =>
        post(
          body({
            semester_id: String(semesters[2]),
            group_scopes: [scope(0, 2), scope(1, 2)],
          }),
        ),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it('rejects an unversioned target rather than borrowing another major approval', async () => {
    await unchanged(
      () =>
        post(body({ course_id: String(courses[1]), group_scopes: [scope(0)] })),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it.each([
    () => String(revisions['0:0:2'][2]),
    () => String(revisions['0:1:2'][0]),
    () => '999999',
  ])(
    'rejects a future, wrong-major or unknown revision (%#)',
    async (revision) => {
      await unchanged(
        () =>
          post(
            body({
              group_scopes: [
                scope(0, 1, { curriculum_revision_id: revision() }),
              ],
            }),
          ),
        409,
        'OFFERING_CURRICULUM_REVISION_MISMATCH',
      );
    },
  );
  it('rejects mixed scope years, levels and cohort ownership before mutation', async () => {
    for (const wrong of [
      scope(0, 2),
      scope(0, 1, { year_level: 3 }),
      scope(0, 1, { generation_id: String(cohorts[1]) }),
    ])
      await unchanged(() => post(body({ group_scopes: [wrong] })), 400);
  });
  it('accepts another approved course year and rejects an unapproved year', async () => {
    expect(
      (
        await create(
          body({
            year_level: 3,
            group_scopes: [scope(1, 1, { year_level: 3 })],
          }),
        )
      ).year_level,
    ).toBe(3);
    await unchanged(
      () => post(body({ year_level: 4 })),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it('rejects unstructured selected-semester chronology even without scopes', async () => {
    await unchanged(
      () => post(body({ semester_id: String(semesters[5]) })),
      400,
      'OFFERING_ACADEMIC_YEAR_REQUIRED',
    );
  });
  it('rejects an inactive course department for new contexts', async () => {
    await unchanged(
      () => post(body({ course_id: String(courses[4]) })),
      400,
      'OFFERING_DEPARTMENT_INACTIVE',
    );
  });
  it('preserves school-wide ADMIN authorization independently of primary departments', async () => {
    expect((await create(body(), 'ADMIN2')).id).toBeDefined();
  });
  it.each(['LECTURER', 'STUDENT'])('blocks %s writes', async (role) => {
    await unchanged(() => post(body(), role), 403);
    await unchanged(() => put(pinnedEdit, {}, role), 403);
  });
  it('blocks unauthenticated, revoked and direct non-ADMIN callers', async () => {
    await unchanged(
      () => api().post('/api/course-offerings').send(body()),
      401,
    );
    await db.users.update({
      where: { id: users.ADMIN2 },
      data: { auth_version: { increment: 1 } },
    });
    try {
      await unchanged(() => post(body(), 'ADMIN2'), 401);
    } finally {
      await db.users.update({
        where: { id: users.ADMIN2 },
        data: { auth_version: { decrement: 1 } },
      });
    }
    await expect(
      new CourseOfferingsService(db as any).create(
        body() as any,
        users.STUDENT,
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('preserves null-year legacy display and lecturer edits without inventing approval', async () => {
    const old = await legacy();
    const result = await put(old.id, {
      lecturer_id: String(users.LECTURER2),
      section_code: 'Legacy edited',
      year_level: null,
    });
    expect(result.status).toBe(200);
    expect(result.body.year_level).toBeNull();
    expect(result.body.group_scopes).toEqual([]);
  });
  it('does not block unchanged inactive-department historical lecturer edits', async () => {
    const old = await legacy({ course_id: courses[4] });
    expect(
      (await put(old.id, { lecturer_id: String(users.LECTURER2) })).status,
    ).toBe(200);
  });
  it('preserves identical legacy scope IDs and null bindings on unchanged-context echoes', async () => {
    const old = await legacy({ year_level: 2 }, true);
    const before = old.group_scopes;
    expect(
      (
        await put(old.id, {
          group_scopes: [scope(0, 1, { class_groups: [' a '] })],
          section_code: 'Legacy echo',
        })
      ).status,
    ).toBe(200);
    expect(
      await db.course_offering_group_scopes.findMany({
        where: { course_offering_id: old.id },
      }),
    ).toEqual(before);
  });
  it('allows a pinned lecturer edit and identical scope echo after current-year withdrawal', async () => {
    const before = await db.course_offering_group_scopes.findMany({
      where: { course_offering_id: BigInt(pinnedEdit) },
    });
    const result = await put(pinnedEdit, {
      lecturer_id: String(users.LECTURER2),
      group_scopes: [
        scope(0, 1, { curriculum_revision_id: String(revisions['6:0:2'][0]) }),
      ],
    });
    expect(result.status).toBe(200);
    expect(
      await db.course_offering_group_scopes.findMany({
        where: { course_offering_id: BigInt(pinnedEdit) },
      }),
    ).toEqual(before);
    await unchanged(
      () =>
        post(body({ course_id: String(courses[6]), group_scopes: [scope(0)] })),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it('keeps pinned academic identities and revision IDs immutable', async () => {
    for (const extra of [
      { year_level: 3, group_scopes: [scope(0, 1, { year_level: 3 })] },
      { group_scopes: [] },
      { semester_id: String(semesters[6]) },
      {
        group_scopes: [
          scope(0, 1, {
            curriculum_revision_id: String(revisions['6:0:2'][1]),
          }),
        ],
      },
    ])
      await unchanged(() => put(pinnedEdit, extra), 409);
  });
  it('keeps evaluated teaching ownership protected and permits display edits without touching history', async () => {
    await unchanged(
      () => put(pinnedUsed, { lecturer_id: String(users.LECTURER2) }),
      409,
      'OFFERING_HISTORY_PROTECTED',
    );
    const before = await db.course_offerings.findUniqueOrThrow({
      where: { id: BigInt(pinnedUsed) },
    });
    const response = await put(pinnedUsed, {
      section_code: 'Protected display',
    });
    expect(response.status).toBe(200);
    await db.course_offerings.update({
      where: { id: BigInt(pinnedUsed) },
      data: {
        section_code: before.section_code,
        updated_at: before.updated_at,
      },
    });
  });
  it('requires an approved year when a legacy context changes, including empty scopes', async () => {
    const old = await legacy();
    await unchanged(
      () => put(old.id, { course_id: String(courses[0]) }),
      400,
      'OFFERING_YEAR_LEVEL_REQUIRED',
    );
    await unchanged(
      () => put(old.id, { year_level: 2, group_scopes: [] }),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
  });
  it('does not silently pin preserved legacy groups during a course-context change', async () => {
    const old = await legacy({ year_level: 2 }, true);
    await unchanged(
      () => put(old.id, { course_id: String(courses[0]) }),
      409,
      'OFFERING_GROUP_SCOPES_REQUIRED',
    );
    const result = await put(old.id, {
      course_id: String(courses[0]),
      group_scopes: [scope(0, 1, { class_groups: ['A'] })],
    });
    expect(result.status).toBe(200);
    expect(result.body.group_scopes[0].curriculum_revision_id).toBe(
      String(revisions['0:0:2'][0]),
    );
  });
  it('revalidates changed unscoped semesters instead of skipping the empty group loop', async () => {
    const old = await legacy({ course_id: courses[0], year_level: 2 });
    await unchanged(
      () => put(old.id, { semester_id: String(semesters[3]) }),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
    expect(
      (await put(old.id, { semester_id: String(semesters[4]) })).status,
    ).toBe(200);
  });
  it('rejects clearing a resolved year or explicit null group replacements', async () => {
    const old = await legacy({ course_id: courses[0], year_level: 2 });
    await unchanged(
      () => put(old.id, { year_level: null }),
      400,
      'OFFERING_YEAR_LEVEL_REQUIRED',
    );
    await unchanged(() => put(old.id, { group_scopes: null }), 400);
  });
  it('retains revision history/applicable endpoints with legacy enabled:null', async () => {
    const id = rules['1:0:2'];
    const result = await unchanged(
      () =>
        api()
          .get(`/api/course-year-rules/${id}/applicable`)
          .query({ academic_year_id: String(years[1]) })
          .set(auth()),
      200,
    );
    expect(result.body).toMatchObject({
      policy: 'LEGACY_UNVERSIONED',
      enabled: null,
      revision: null,
    });
    const revisionsResult = await unchanged(
      () =>
        api()
          .get(`/api/course-year-rules/${rules['0:0:2']}/revisions`)
          .set(auth()),
      200,
    );
    expect(revisionsResult.body).toHaveLength(3);
  });
  it('validates mixed-semester rows independently and does not claim J batch atomicity', async () => {
    const good = await create(body({ semester_id: String(semesters[1]) }));
    await unchanged(
      () => post(body({ semester_id: String(semesters[3]) })),
      409,
      'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
    );
    expect(
      await db.course_offerings.findUnique({ where: { id: BigInt(good.id) } }),
    ).not.toBeNull();
  });
  it('rolls back offering and scope writes together when a scope insert fails', async () => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION fail_h_scope() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RAISE EXCEPTION 'Synthetic H scope failure'; END $f$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER synthetic_h_scope_failure BEFORE INSERT ON course_offering_group_scopes FOR EACH ROW EXECUTE FUNCTION fail_h_scope()',
    );
    try {
      await unchanged(() => post(body({ group_scopes: [scope(0)] })), 500);
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER synthetic_h_scope_failure ON course_offering_group_scopes',
      );
      await db.$executeRawUnsafe('DROP FUNCTION fail_h_scope()');
    }
  });
  it('documents required new years, scoped/unscoped approvals and historical compatibility', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(
      (document.components!.schemas!.CreateCourseOfferingDto as any).required,
    ).toContain('year_level');
    expect(document.paths['/api/course-offerings'].post!.description).toContain(
      'Even without group_scopes',
    );
    expect(
      document.paths['/api/course-offerings/{id}'].put!.description,
    ).toContain('legacy null');
    expect(
      document.paths['/api/course-year-rules/{id}/applicable'].get!.description,
    ).toContain('not the active year');
  });
});
