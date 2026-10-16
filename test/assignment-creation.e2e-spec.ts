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
import { AssignmentCreationService } from '../src/course-offerings/assignment-creation.service';
import { CourseOfferingsService } from '../src/course-offerings/course-offerings.service';
import { assignmentCreationSchemaReady } from '../src/course-offerings/assignment-creation.util';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Reviewed assignment creation and exact enrollment (owned PostgreSQL)', () => {
  const fixture = new CohortImportFixture(),
    path = '/api/course-offerings/create-with-enrollments';
  let db: PrismaClient,
    app: INestApplication,
    hash: string,
    course: bigint,
    serial = 0,
    emptyReady = false;
  let protectedOffering: bigint, protectedHistory: unknown;
  const users: Record<string, bigint> = {},
    tokens: Record<string, string> = {},
    departments: bigint[] = [],
    majors: bigint[] = [],
    cohorts: bigint[] = [],
    years: bigint[] = [],
    semesters: bigint[] = [],
    roster: Record<
      string,
      { id: bigint; user_id: bigint; record: bigint | null }
    > = {};
  const now = () => new Date(),
    api = () => request(app.getHttpServer()),
    auth = (role = 'ADMIN') => ({ Authorization: `Bearer ${tokens[role]}` });
  const scope = (major = 0, groups = ['A'], extra: object = {}) => ({
    academic_year_id: String(years[1]),
    generation_id: String(cohorts[major]),
    major_id: String(majors[major]),
    year_level: 3,
    class_groups: groups,
    ...extra,
  });
  const row = (extra: object = {}) => ({
    row_key: 'shared',
    lecturer_id: String(users.LECTURER),
    semester_id: String(semesters[0]),
    class_type: 'COURSE',
    section_code: 'Shared DS and FE',
    group_scopes: [scope(0, ['A', 'B']), scope(1, ['A'])],
    ...extra,
  });
  const body = (extra: object = {}) => ({
    course_id: String(course),
    academic_year_id: String(years[1]),
    year_level: 3,
    assignments: [row()],
    ...extra,
  });
  const preview = (input = body(), role = 'ADMIN') =>
    api().post(`${path}/preview`).set(auth(role)).send(input);
  const confirm = (input: object, role = 'ADMIN') =>
    api().post(`${path}/confirm`).set(auth(role)).send(input);
  const receipt = (id: string, role = 'ADMIN') =>
    api().get(`${path}/receipts/${id}`).set(auth(role));
  function confirmation(input: ReturnType<typeof body>, review: any) {
    return {
      ...input,
      review_id: review.review_id,
      confirmations: review.items.map((item: any) => ({
        row_key: item.row_key,
        confirmed_student_ids: item.confirmed_student_ids,
      })),
    };
  }
  async function reviewed(input = body()) {
    const result = await preview(input);
    expect(result.status).toBe(200);
    return {
      input,
      review: result.body,
      confirmation: confirmation(input, result.body),
    };
  }
  async function noWrites(
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
  async function history() {
    return {
      tables: (await fixture.snapshot(db)).filter((table) =>
        [
          'evaluations',
          'evaluation_participants',
          'assessment_drafts',
          'responses',
          'answers',
          'surveys',
          'survey_versions',
          'questions',
          'evaluation_group_targets',
        ].includes(table.name),
      ),
      offering: await db.course_offerings.findUnique({
        where: { id: protectedOffering },
        include: { group_scopes: true, enrollments: true },
      }),
    };
  }
  async function seedHistory() {
    const protectedCourse = await db.courses.create({
      data: {
        course_code: 'J-PROTECTED',
        course_name: 'Protected historical J course',
        department_id: departments[0],
        created_at: now(),
        updated_at: now(),
      },
    });
    const rule = await db.course_year_rules.create({
      data: {
        course_id: protectedCourse.id,
        major_id: majors[0],
        year_level: 3,
        revisions: {
          create: {
            revision_no: 1,
            effective_academic_year_id: years[0],
            effective_start_year: 2095,
            enabled: true,
          },
        },
      },
      include: { revisions: true },
    });
    protectedOffering = (
      await db.course_offerings.create({
        data: {
          course_id: protectedCourse.id,
          lecturer_id: users.LECTURER,
          semester_id: semesters[0],
          year_level: 3,
          class_type: 'COURSE',
          section_code: 'Historical J',
          created_at: now(),
          updated_at: now(),
          group_scopes: {
            create: {
              academic_year_id: years[1],
              generation_id: cohorts[0],
              major_id: majors[0],
              year_level: 3,
              class_group: 'A',
              curriculum_revision_id: rule.revisions[0].id,
            },
          },
        },
      })
    ).id;
    const survey = await db.surveys.create({
        data: {
          title: 'J protected questionnaire',
          created_by: users.ADMIN,
          created_at: now(),
          updated_at: now(),
        },
      }),
      version = await db.survey_versions.create({
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
        question_text: 'J protected rating',
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
        course_offering_id: protectedOffering,
        survey_version_id: version.id,
        status: 'OPEN',
        created_by: users.ADMIN,
        created_at: now(),
        updated_at: now(),
      },
    });
    await db.enrollments.create({
      data: {
        course_offering_id: protectedOffering,
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
    protectedHistory = await history();
  }
  async function student(
    name: string,
    major = 0,
    group: string | null = 'A',
    level = 3,
    action: 'NORMAL' | 'REPEAT' | 'TRANSFER' = 'NORMAL',
    paused = false,
    disabled = false,
    missing = false,
  ) {
    return db.$transaction(async (tx) => {
      const priorMajor = action === 'TRANSFER' ? 0 : major;
      const user = await tx.users.create({
        data: {
          full_name: `Synthetic ${name}`,
          email: `${name}-${serial}@assign.example.test`,
          role: 'STUDENT',
          status: disabled ? 'INACTIVE' : 'ACTIVE',
          password_hash: hash,
          created_at: now(),
          updated_at: now(),
        },
      });
      const profile = await tx.students.create({
        data: {
          user_id: user.id,
          student_code: `J-${name}-${serial}`,
          generation_id: cohorts[priorMajor],
        },
      });
      const initial = await tx.student_academic_records.create({
        data: {
          student_id: profile.id,
          academic_year_id: years[0],
          generation_id: cohorts[priorMajor],
          major_id: majors[priorMajor],
          year_level: 2,
          class_group: 'OLD',
          progression_action: paused ? 'PAUSE' : 'NORMAL',
        },
      });
      await tx.student_cohort_assignment_events.create({
        data: {
          academic_record_id: initial.id,
          student_id: profile.id,
          academic_year_id: years[0],
          major_id: majors[priorMajor],
          generation_id: cohorts[priorMajor],
          action: 'INITIAL',
        },
      });
      const placement = missing
        ? null
        : await tx.student_academic_records.create({
            data: {
              student_id: profile.id,
              academic_year_id: years[1],
              generation_id: cohorts[major],
              major_id: majors[major],
              year_level: level,
              class_group: group,
              progression_action: action,
            },
          });
      if (placement)
        await tx.student_cohort_assignment_events.create({
          data: {
            academic_record_id: placement.id,
            student_id: profile.id,
            academic_year_id: years[1],
            major_id: majors[major],
            generation_id: cohorts[major],
            action: action === 'TRANSFER' ? 'TRANSFER' : 'INITIAL',
            ...(action === 'TRANSFER'
              ? { previous_generation_id: cohorts[priorMajor] }
              : {}),
          },
        });
      if (action === 'TRANSFER')
        await tx.students.update({
          where: { id: profile.id },
          data: { generation_id: cohorts[major] },
        });
      return {
        id: profile.id,
        user_id: user.id,
        record: placement?.id ?? null,
      };
    });
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    emptyReady = await assignmentCreationSchemaReady(db);
    hash = await bcrypt.hash('SyntheticAssignment123!', 4);
    for (const role of ['ADMIN', 'ADMIN2', 'LECTURER', 'LECTURER2', 'STUDENT'])
      users[role] = (
        await db.users.create({
          data: {
            email: `${role.toLowerCase()}@assign.example.test`,
            full_name: `Synthetic J ${role}`,
            role: role.startsWith('ADMIN')
              ? 'ADMIN'
              : role.startsWith('LECTURER')
                ? 'LECTURER'
                : 'STUDENT',
            password_hash: hash,
            created_at: now(),
            updated_at: now(),
          },
        })
      ).id;
    for (let index = 0; index < 2; index++) {
      departments.push(
        (
          await db.departments.create({
            data: { code: `J-D${index}`, name: `J department ${index}` },
          })
        ).id,
      );
      majors.push(
        (
          await db.majors.create({
            data: {
              code: `J-M${index}`,
              name: index ? 'FE' : 'DS',
              department_id: departments[index],
            },
          })
        ).id,
      );
    }
    for (const start_year of [2095, 2096, 2097])
      years.push(
        (
          await db.academic_years.create({
            data: {
              name: `J year ${start_year}`,
              start_year,
              is_active: start_year === 2097,
            },
          })
        ).id,
      );
    for (const [year, number] of [
      [1, 1],
      [1, 2],
      [2, 1],
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
              starting_year_level: 2,
            },
          })
        ).id,
      );
    await seedHistory();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    for (const role of Object.keys(users)) {
      const login = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${role.toLowerCase()}@assign.example.test`,
          password: 'SyntheticAssignment123!',
        });
      expect(login.status).toBe(200);
      tokens[role] = login.body.access_token;
    }
  }, 90000);
  beforeEach(async () => {
    const previous = Object.values(roster).map((student) => student.user_id);
    if (previous.length)
      await db.users.updateMany({
        where: { id: { in: previous } },
        data: { status: 'INACTIVE' },
      });
    serial++;
    course = (
      await db.courses.create({
        data: {
          course_code: `J-${serial}`,
          course_name: `J course ${serial}`,
          department_id: departments[0],
          created_at: now(),
          updated_at: now(),
        },
      })
    ).id;
    for (let major = 0; major < 2; major++)
      for (const level of [2, 3])
        await db.course_year_rules.create({
          data: {
            course_id: course,
            major_id: majors[major],
            year_level: level,
            revisions: {
              create: {
                revision_no: 1,
                effective_academic_year_id: years[0],
                effective_start_year: 2095,
                enabled: true,
              },
            },
          },
        });
    roster.DS_A = await student('DS_A');
    roster.DS_B = await student('DS_B', 0, 'B');
    roster.FE_A = await student('FE_A', 1);
    roster.TRANSFER = await student('TRANSFER', 1, 'A', 3, 'TRANSFER');
    roster.PAUSED = await student('PAUSED', 0, 'A', 3, 'NORMAL', true);
    roster.DISABLED = await student(
      'DISABLED',
      0,
      'A',
      3,
      'NORMAL',
      false,
      true,
    );
    roster.NO_GROUP = await student('NO_GROUP', 0, null);
    roster.NO_PLACEMENT = await student(
      'NO_PLACEMENT',
      0,
      'A',
      3,
      'NORMAL',
      false,
      false,
      true,
    );
    roster.REPEAT = await student('REPEAT', 0, 'R', 2, 'REPEAT');
  });
  afterEach(async () => {
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

  it('advertises only actual connected-schema capability, including a previously empty catalog', async () => {
    expect(emptyReady).toBe(true);
    const profile = await api().get('/api/auth/me').set(auth());
    expect(profile.status).toBe(200);
    expect(profile.body.capabilities.reviewed_assignment_enrollment_v1).toBe(
      true,
    );
  });
  it('previews exact shared-major rosters and breakdowns without creating offerings or enrollments', async () => {
    const before = await fixture.snapshot(db),
      result = await preview();
    expect(result.status).toBe(200);
    const item = result.body.items[0];
    // Earlier synthetic rosters are disabled; only this case's active placements qualify.
    const expected = await db.students.findMany({
      where: { user_id: { in: item.confirmed_student_ids.map(BigInt) } },
    });
    expect(item.eligible_count).toBe(item.confirmed_student_ids.length);
    expect(
      item.breakdown.reduce(
        (sum: number, group: any) => sum + group.eligible_count,
        0,
      ),
    ).toBe(item.eligible_count);
    expect(expected.length).toBe(item.eligible_count);
    expect(item.confirmed_student_ids).toEqual(
      expect.arrayContaining(
        ['DS_A', 'DS_B', 'FE_A', 'TRANSFER'].map((name) =>
          String(roster[name].user_id),
        ),
      ),
    );
    expect(item.eligible_count).toBe(4);
    for (const name of [
      'PAUSED',
      'DISABLED',
      'NO_GROUP',
      'NO_PLACEMENT',
      'REPEAT',
    ])
      expect(item.confirmed_student_ids).not.toContain(
        String(roster[name].user_id),
      );
    expect(
      item.breakdown.map((group: any) => [group.major_id, group.class_group]),
    ).toContainEqual([String(majors[0]), 'A']);
    expect(
      item.breakdown.map((group: any) => [group.major_id, group.class_group]),
    ).toContainEqual([String(majors[1]), 'A']);
    const after = await fixture.snapshot(db);
    expect(
      after.filter((table) => table.name !== 'reviewed_operations'),
    ).toEqual(before.filter((table) => table.name !== 'reviewed_operations'));
  });
  it('creates shared COURSE and separate TD/TP rows with exact memberships in one operation', async () => {
    const input = body({
      assignments: [
        row(),
        row({
          row_key: 'td',
          class_type: 'TD',
          group_scopes: [scope(0, ['A'])],
        }),
        row({
          row_key: 'tp',
          class_type: 'TP',
          semester_id: String(semesters[1]),
          group_scopes: [scope(1, ['A'])],
        }),
      ],
    });
    const review = await reviewed(input),
      result = await confirm(review.confirmation);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: 'COMPLETE',
      created_offering_count: 3,
      already_applied: false,
    });
    for (const item of result.body.items) {
      const expected = review.confirmation.confirmations.find(
        (candidate: any) => candidate.row_key === item.row_key,
      )!;
      const enrollments = await db.enrollments.findMany({
        where: { course_offering_id: BigInt(item.course_offering_id) },
      });
      expect(enrollments.map((e) => String(e.student_id)).sort()).toEqual(
        [...expected.confirmed_student_ids].sort(),
      );
      expect(item.already_enrolled_count).toBe(0);
      expect(item.enrolled_count).toBe(expected.confirmed_student_ids.length);
      expect(
        (
          await db.course_offering_group_scopes.findMany({
            where: { course_offering_id: BigInt(item.course_offering_id) },
          })
        ).every((scope) => scope.curriculum_revision_id !== null),
      ).toBe(true);
    }
    expect(
      await db.evaluations.count({
        where: { course_offerings: { course_id: course } },
      }),
    ).toBe(0);
  });
  it('keeps unchecked groups and majors out of TD rosters', async () => {
    const r = await reviewed(
      body({
        assignments: [
          row({ class_type: 'TD', group_scopes: [scope(0, ['B'])] }),
        ],
      }),
    );
    expect(
      r.review.items[0].eligible_students.every(
        (s: any) =>
          s.placement_major_id === String(majors[0]) && s.class_group === 'B',
      ),
    ).toBe(true);
  });
  it.each(['omitted', 'empty', 'null'])(
    'rejects %s audience without broadening',
    async (kind) => {
      const input = body({
        assignments: [
          row({
            group_scopes:
              kind === 'omitted' ? undefined : kind === 'empty' ? [] : null,
          }),
        ],
      });
      await noWrites(() => preview(input), 400);
    },
  );
  it('rejects a row with no eligible selected students without writing a review', async () => {
    await noWrites(
      () =>
        preview(
          body({
            assignments: [row({ group_scopes: [scope(0, ['NO_SUCH_GROUP'])] })],
          }),
        ),
      400,
      'ASSIGNMENT_AUDIENCE_EMPTY',
    );
  });
  it.each([null, 0, 6, 1.5, '3', true])(
    'rejects invalid explicit student year %j',
    async (year_level) => {
      await noWrites(() => preview(body({ year_level })), 400);
    },
  );
  it.each(['0', '-1', '9223372036854775808', '1.5', 9007199254740992])(
    'rejects invalid ID %j safely',
    async (course_id) => {
      await noWrites(() => preview(body({ course_id })), 400);
    },
  );
  it('rejects duplicate row keys', async () => {
    await noWrites(
      () => preview(body({ assignments: [row(), row({ class_type: 'TD' })] })),
      400,
      'ASSIGNMENT_ROW_DUPLICATE',
    );
  });
  it('rejects label-only and group-only duplicate identities within one request', async () => {
    await noWrites(
      () =>
        preview(
          body({
            assignments: [
              row(),
              row({
                row_key: 'other',
                section_code: 'Other label',
                group_scopes: [scope(0, ['B'])],
              }),
            ],
          }),
        ),
      400,
      'ASSIGNMENT_IDENTITY_DUPLICATE',
    );
  });
  it('rejects mixed academic-year semesters without creating a review', async () => {
    await noWrites(
      () =>
        preview(
          body({
            assignments: [
              row(),
              row({ row_key: 'future', semester_id: String(semesters[2]) }),
            ],
          }),
        ),
      400,
      'ASSIGNMENT_YEAR_MISMATCH',
    );
  });
  it('rejects missing course/lecturer and foreign-major cohorts', async () => {
    await noWrites(
      () => preview(body({ course_id: '9223372036854775807' })),
      400,
    );
    await noWrites(
      () =>
        preview(
          body({ assignments: [row({ lecturer_id: String(users.STUDENT) })] }),
        ),
      400,
    );
    await noWrites(
      () =>
        preview(
          body({
            assignments: [
              row({
                group_scopes: [
                  scope(0, ['A'], { generation_id: String(cohorts[1]) }),
                ],
              }),
            ],
          }),
        ),
      400,
    );
  });
  it('rejects unavailable legacy cohort ownership for new reviewed scopes', async () => {
    const cohort = await db.student_generations.create({
      data: { name: `Legacy J ${serial}`, entry_academic_year_id: years[0] },
    });
    await noWrites(
      () =>
        preview(
          body({
            assignments: [
              row({
                group_scopes: [
                  scope(0, ['A'], { generation_id: String(cohort.id) }),
                ],
              }),
            ],
          }),
        ),
      400,
      'ASSIGNMENT_COHORT_REQUIRED',
    );
  });
  it('rejects overlapping duplicate scopes rather than duplicating memberships', async () => {
    await noWrites(
      () =>
        preview(
          body({
            assignments: [
              row({ group_scopes: [scope(0, ['A']), scope(0, ['A', 'B'])] }),
            ],
          }),
        ),
      400,
    );
  });
  it('rejects an obsolete expected revision', async () => {
    await noWrites(
      () =>
        preview(
          body({
            assignments: [
              row({
                group_scopes: [
                  scope(0, ['A'], {
                    curriculum_revision_id: '9223372036854775807',
                  }),
                ],
              }),
            ],
          }),
        ),
      409,
      'OFFERING_CURRICULUM_REVISION_MISMATCH',
    );
  });
  it.each(['STUDENT', 'LECTURER'])(
    'denies %s preview/confirmation/recovery',
    async (role) => {
      const r = await reviewed();
      await noWrites(() => preview(r.input, role), 403);
      await noWrites(() => confirm(r.confirmation, role), 403);
      await noWrites(() => receipt(r.review.review_id, role), 403);
    },
  );
  it('denies anonymous preview and does not disclose another ADMIN review', async () => {
    const r = await reviewed();
    await noWrites(() => api().post(`${path}/preview`).send(body()), 401);
    await noWrites(() => confirm(r.confirmation, 'ADMIN2'), 404);
    await noWrites(() => receipt(r.review.review_id, 'ADMIN2'), 404);
  });
  it('allows a second ACTIVE ADMIN school-wide', async () => {
    const r = await preview(body(), 'ADMIN2');
    expect(r.status).toBe(200);
    expect((await confirm(confirmation(body(), r.body), 'ADMIN2')).status).toBe(
      200,
    );
  });
  it('requires exact confirmation rows and user IDs', async () => {
    const r = await reviewed();
    for (const confirmations of [
      [],
      [
        {
          ...r.confirmation.confirmations[0],
          confirmed_student_ids: [String(users.STUDENT)],
        },
      ],
      [{ ...r.confirmation.confirmations[0], row_key: 'other' }],
    ])
      await noWrites(
        () => confirm({ ...r.confirmation, confirmations }),
        confirmations.length ? 409 : 400,
      );
  });
  it('rejects duplicate confirmed IDs and changed labels/scopes', async () => {
    const r = await reviewed(),
      first = r.confirmation.confirmations[0];
    await noWrites(
      () =>
        confirm({
          ...r.confirmation,
          confirmations: [
            {
              ...first,
              confirmed_student_ids: [
                first.confirmed_student_ids[0],
                first.confirmed_student_ids[0],
              ],
            },
          ],
        }),
      400,
    );
    await noWrites(
      () =>
        confirm({
          ...r.confirmation,
          assignments: [row({ section_code: 'Changed after review' })],
        }),
      409,
      'REVIEW_INPUT_MISMATCH',
    );
  });
  it('expires unconfirmed previews without creating assignments', async () => {
    const r = await reviewed();
    await db.reviewed_operations.update({
      where: { id: r.review.review_id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    await noWrites(() => confirm(r.confirmation), 409, 'REVIEW_EXPIRED');
  });
  it('reports an uncommitted receipt as unavailable without claiming rollback', async () => {
    const r = await reviewed();
    await noWrites(
      () => receipt(r.review.review_id),
      409,
      'ASSIGNMENT_NOT_COMMITTED',
    );
    await noWrites(() => receipt(randomUUID()), 404);
    await noWrites(() => receipt('bad-id'), 400);
  });
  it.each([
    'group',
    'paused',
    'resume',
    'account',
    'lecturer',
    'department',
    'semester',
    'approval',
  ])('invalidates %s drift without partial writes', async (change) => {
    const r = await reviewed();
    let restore: (() => Promise<unknown>) | undefined;
    if (change === 'group')
      await db.student_academic_records.update({
        where: { id: roster.DS_A.record! },
        data: { class_group: 'C' },
      });
    if (change === 'paused')
      await db.student_academic_records.update({
        where: { id: roster.DS_A.record! },
        data: { progression_action: 'PAUSE' },
      });
    if (change === 'resume')
      await db.student_academic_records.update({
        where: { id: roster.PAUSED.record! },
        data: { progression_action: 'RESUME' },
      });
    if (change === 'account') {
      await db.users.update({
        where: { id: roster.DS_A.user_id },
        data: { status: 'INACTIVE' },
      });
    }
    if (change === 'lecturer') {
      await db.users.update({
        where: { id: users.LECTURER },
        data: { status: 'INACTIVE' },
      });
      restore = () =>
        db.users.update({
          where: { id: users.LECTURER },
          data: { status: 'ACTIVE' },
        });
    }
    if (change === 'department') {
      await db.departments.update({
        where: { id: departments[1] },
        data: { status: 'INACTIVE' },
      });
      restore = () =>
        db.departments.update({
          where: { id: departments[1] },
          data: { status: 'ACTIVE' },
        });
    }
    if (change === 'semester') {
      await db.semesters.update({
        where: { id: semesters[0] },
        data: { semester_name: 'Changed J label' },
      });
      restore = () =>
        db.semesters.update({
          where: { id: semesters[0] },
          data: { semester_name: 'Semester 1' },
        });
    }
    if (change === 'approval') {
      const rule = await db.course_year_rules.findFirstOrThrow({
        where: { course_id: course, major_id: majors[0], year_level: 3 },
      });
      await db.curriculum_revisions.create({
        data: {
          rule_id: rule.id,
          revision_no: 2,
          effective_academic_year_id: years[1],
          effective_start_year: 2096,
          enabled: false,
        },
      });
    }
    try {
      await noWrites(() => confirm(r.confirmation), 409, 'REVIEW_STALE');
    } finally {
      await restore?.();
    }
  });
  it('retains persistent PAUSE despite a normal selected-year record and selects explicit repeats correctly', async () => {
    const r = await reviewed();
    expect(r.review.items[0].confirmed_student_ids).not.toContain(
      String(roster.PAUSED.user_id),
    );
    const repeat = await reviewed(
      body({
        year_level: 2,
        assignments: [
          row({ group_scopes: [scope(0, ['R'], { year_level: 2 })] }),
        ],
      }),
    );
    expect(repeat.review.items[0].confirmed_student_ids).toContain(
      String(roster.REPEAT.user_id),
    );
  });
  it('rejects existing assignments even with another display label', async () => {
    const r = await reviewed(),
      saved = await confirm(r.confirmation);
    expect(saved.status).toBe(200);
    const result = await noWrites(
      () => preview(body({ assignments: [row({ section_code: 'Another' })] })),
      409,
      'OFFERING_ALREADY_EXISTS',
    );
    expect(result.body.existing_course_offering_id).toBe(
      saved.body.items[0].course_offering_id,
    );
  });
  it('invalidates a competing review after another operation commits', async () => {
    const a = await reviewed(),
      b = await reviewed();
    expect((await confirm(a.confirmation)).status).toBe(200);
    await noWrites(() => confirm(b.confirmation), 409, 'REVIEW_STALE');
  });
  it('returns original IDs/counts on retries and recovery after expiry and later eligibility changes', async () => {
    const r = await reviewed(),
      saved = await confirm(r.confirmation);
    expect(saved.status).toBe(200);
    await db.reviewed_operations.update({
      where: { id: r.review.review_id },
      data: { expires_at: new Date(Date.now() - 1000) },
    });
    await db.student_academic_records.update({
      where: { id: roster.DS_A.record! },
      data: { class_group: 'Changed later' },
    });
    const before = await fixture.snapshot(db),
      retried = await confirm(r.confirmation),
      recovered = await receipt(r.review.review_id);
    expect(retried.status).toBe(200);
    expect(retried.body).toEqual({ ...saved.body, already_applied: true });
    expect(recovered.body).toEqual(retried.body);
    expect(await fixture.snapshot(db)).toEqual(before);
  });
  it('recovers the original receipt after the newly created unused assignment is later deleted', async () => {
    const r = await reviewed(),
      saved = await confirm(r.confirmation);
    expect(saved.status).toBe(200);
    const id = BigInt(saved.body.items[0].course_offering_id);
    await db.enrollments.deleteMany({ where: { course_offering_id: id } });
    await new CourseOfferingsService(db as unknown as PrismaService).remove(id);
    const before = await fixture.snapshot(db),
      result = await receipt(r.review.review_id);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ...saved.body, already_applied: true });
    expect(await fixture.snapshot(db)).toEqual(before);
  });
  it('does not let a completed retry change its input', async () => {
    const r = await reviewed();
    expect((await confirm(r.confirmation)).status).toBe(200);
    await noWrites(
      () => confirm({ ...r.confirmation, year_level: 2 }),
      409,
      'REVIEW_INPUT_MISMATCH',
    );
  });
  it('concurrent identical confirmations create one result and recover the same receipt', async () => {
    const r = await reviewed(),
      results = await Promise.all([
        confirm(r.confirmation),
        confirm(r.confirmation),
      ]);
    expect(results.some((item) => item.status === 200)).toBe(true);
    expect(results.every((item) => [200, 409].includes(item.status))).toBe(
      true,
    );
    const recovered = await receipt(r.review.review_id);
    expect(recovered.status).toBe(200);
    expect(
      await db.course_offerings.count({ where: { course_id: course } }),
    ).toBe(1);
    expect((await confirm(r.confirmation)).body).toEqual(recovered.body);
  });
  it('concurrent distinct reviews cannot duplicate identity regardless of labels', async () => {
    const a = await reviewed(),
      b = await reviewed(
        body({ assignments: [row({ section_code: 'Other admin label' })] }),
      );
    const results = await Promise.all([
      confirm(a.confirmation),
      confirm(b.confirmation),
    ]);
    expect(results.map((item) => item.status).sort()).toEqual([200, 409]);
    expect(
      await db.course_offerings.count({ where: { course_id: course } }),
    ).toBe(1);
  });
  it.each(['scope', 'enrollment', 'receipt'])(
    'rolls back every row after injected %s write failure and safely retries',
    async (kind) => {
      const r = await reviewed(
        body({
          assignments: [
            row(),
            row({
              row_key: 'td',
              class_type: 'TD',
              group_scopes: [scope(0, ['B'])],
            }),
          ],
        }),
      );
      const table =
        kind === 'scope'
          ? 'course_offering_group_scopes'
          : kind === 'enrollment'
            ? 'enrollments'
            : 'reviewed_operations';
      const condition =
        kind === 'receipt'
          ? "NEW.operation_kind='CREATE_ASSIGNMENTS' AND NEW.completed_at IS NOT NULL"
          : "EXISTS(SELECT 1 FROM course_offerings WHERE id=NEW.course_offering_id AND class_type='TD')";
      await db.$executeRawUnsafe(
        `CREATE FUNCTION fail_j_write() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'Synthetic J final write failure'; END IF; RETURN NEW; END $f$`,
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER synthetic_j_failure BEFORE ${kind === 'receipt' ? 'UPDATE' : 'INSERT'} ON ${table} FOR EACH ROW EXECUTE FUNCTION fail_j_write()`,
      );
      try {
        await noWrites(
          () => confirm(r.confirmation),
          500,
          'ASSIGNMENT_RESULT_UNCERTAIN',
        );
      } finally {
        await db.$executeRawUnsafe(
          `DROP TRIGGER synthetic_j_failure ON ${table}`,
        );
        await db.$executeRawUnsafe('DROP FUNCTION fail_j_write()');
      }
      expect((await confirm(r.confirmation)).status).toBe(200);
      expect(
        await db.course_offerings.count({ where: { course_id: course } }),
      ).toBe(2);
    },
  );
  it('does not advertise or execute the workflow without its actual index, while recovery remains available', async () => {
    const r = await reviewed();
    const definition = (
      await db.$queryRaw<
        Array<{ definition: string }>
      >`SELECT pg_get_indexdef(indexrelid) AS definition FROM pg_index WHERE indexrelid='course_offerings_complete_identity_idx'::regclass`
    )[0].definition;
    await db.$executeRawUnsafe(
      'DROP INDEX course_offerings_complete_identity_idx',
    );
    try {
      expect(await assignmentCreationSchemaReady(db)).toBe(false);
      const profile = await api().get('/api/auth/me').set(auth());
      expect(
        profile.body.capabilities.reviewed_assignment_enrollment_v1,
      ).toBeUndefined();
      await noWrites(() => preview(), 503, 'ASSIGNMENT_SCHEMA_NOT_READY');
      await noWrites(
        () => confirm(r.confirmation),
        503,
        'ASSIGNMENT_SCHEMA_NOT_READY',
      );
      await noWrites(
        () => receipt(r.review.review_id),
        409,
        'ASSIGNMENT_NOT_COMMITTED',
      );
    } finally {
      await db.$executeRawUnsafe(definition);
    }
  });
  it('protects all complete identities at the SQL boundary while preserving null legacy labels', async () => {
    const r = await reviewed(),
      saved = await confirm(r.confirmation);
    expect(saved.status).toBe(200);
    const existing = await db.course_offerings.findUniqueOrThrow({
      where: { id: BigInt(saved.body.items[0].course_offering_id) },
    });
    const { id: _id, ...data } = existing;
    await expect(
      db.course_offerings.create({
        data: { ...data, section_code: 'Raw duplicate' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
    const a = await db.course_offerings.create({
        data: { ...data, year_level: null, section_code: 'Legacy A' },
      }),
      b = await db.course_offerings.create({
        data: { ...data, year_level: null, section_code: 'Legacy B' },
      });
    expect(a.id).not.toBe(b.id);
    const cleared = await api()
      .put(`/api/course-offerings/${existing.id}`)
      .set(auth())
      .send({ class_type: null });
    expect(cleared.status).toBe(400);
    expect(cleared.body.code).toBe('OFFERING_CLASS_TYPE_REQUIRED');
  });
  it('documents the complete reviewed contract and exposes no secret/answer fields', async () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    for (const suffix of ['/preview', '/confirm', '/receipts/{reviewId}'])
      expect(document.paths[`${path}${suffix}`]).toBeDefined();
    const r = await reviewed(),
      text = JSON.stringify(r.review);
    for (const field of [
      'password_hash',
      'auth_version',
      'answers',
      'responses',
      'notes',
    ])
      expect(text).not.toContain(`"${field}"`);
    expect(r.review.review_id).toMatch(/^[a-f0-9-]{36}$/);
  });
  it('denies direct non-ADMIN service calls before any review write', async () => {
    const before = await fixture.snapshot(db);
    await expect(
      new AssignmentCreationService(db as unknown as PrismaService).preview(
        body() as any,
        users.STUDENT,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(await fixture.snapshot(db)).toEqual(before);
  });

  it('rehearses migration refusal on complete conflicts and preserves nullable legacy rows without new tables/columns', async () => {
    const sql = readFileSync(
      'prisma/migrations/20261016040000_reviewed_assignment_creation/migration.sql',
      'utf8',
    );
    // Transaction-scoped shadow tables; no public/schema migration or real row changes.
    await expect(
      db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          'CREATE TEMP TABLE course_offerings(course_id bigint,lecturer_id bigint,semester_id bigint,year_level int,class_type text,section_code text)',
        );
        await tx.$executeRawUnsafe(
          "INSERT INTO course_offerings VALUES(1,1,1,3,'TD','A'),(1,1,1,3,'TD','B')",
        );
        await tx.$executeRawUnsafe(
          "CREATE TEMP TABLE reviewed_operations(operation_kind text CONSTRAINT reviewed_operations_kind_check CHECK(operation_kind IN ('CREATE_COURSE')))",
        );
        await tx.$executeRawUnsafe(sql);
      }),
    ).rejects.toThrow('require reviewed resolution');
  });
});
