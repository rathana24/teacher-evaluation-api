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

describe('Active evaluation deadline extension (owned PostgreSQL)', () => {
  const fixture = new CohortImportFixture();
  let db: PrismaClient,
    app: INestApplication,
    evaluation: bigint,
    closedEvaluation: bigint,
    question: bigint;
  let protectedRows: unknown, protectedClosed: unknown;
  const users: Record<string, bigint> = {},
    tokens: Record<string, string> = {};
  const api = () => request(app.getHttpServer()),
    auth = (role = 'ADMIN') => ({ Authorization: `Bearer ${tokens[role]}` });
  const schedule = (body: object, role = 'ADMIN', id = evaluation) =>
    api().put(`/api/evaluations/${id}/schedule`).set(auth(role)).send(body);
  const later = () => new Date(Date.now() + 7200000).toISOString();
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
    return (await fixture.snapshot(db)).filter(
      (table) => table.name !== 'evaluations',
    );
  }
  async function active(patch: object = {}) {
    return db.evaluations.update({
      where: { id: evaluation },
      data: {
        status: 'OPEN',
        start_at: new Date(Date.now() - 3600000),
        end_at: new Date(Date.now() + 3600000),
        ...patch,
      },
    });
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
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
    const hash = await bcrypt.hash('SyntheticDeadline123!', 10),
      now = new Date();
    for (const [label, role] of [
      ['ADMIN', 'ADMIN'],
      ['OTHER', 'ADMIN'],
      ['LECTURER', 'LECTURER'],
      ['STUDENT', 'STUDENT'],
      ['DONE', 'STUDENT'],
      ['UNASSIGNED', 'STUDENT'],
    ] as const) {
      users[label] = (
        await db.users.create({
          data: {
            full_name: `Deadline ${label}`,
            email: `${label.toLowerCase()}@deadline.test`,
            password_hash: hash,
            role,
            status: 'ACTIVE',
            created_at: now,
            updated_at: now,
          },
        })
      ).id;
      const login = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${label.toLowerCase()}@deadline.test`,
          password: 'SyntheticDeadline123!',
        });
      expect(login.status).toBe(200);
      tokens[label] = login.body.access_token;
    }
    const year = await db.academic_years.create({
      data: { name: 'Deadline fixture', start_year: 2098 },
    });
    const department = await db.departments.create({
      data: { code: 'DEADLINE', name: 'Deadline department' },
    });
    const major = await db.majors.create({
      data: {
        department_id: department.id,
        code: 'DEADLINE',
        name: 'Deadline major',
      },
    });
    const cohort = await db.student_generations.create({
      data: {
        name: 'Deadline Gen 1',
        major_id: major.id,
        generation_number: 1,
        ownership_state: 'MAJOR_SCOPED',
        entry_academic_year_id: year.id,
        starting_year_level: 1,
      },
    });
    for (const label of ['STUDENT', 'DONE', 'UNASSIGNED'])
      await db.$transaction(async (tx) => {
        const student = await tx.students.create({
          data: {
            user_id: users[label],
            student_code: `DEADLINE-${label}`,
            generation_id: cohort.id,
            created_at: now,
            updated_at: now,
          },
        });
        const record = await tx.student_academic_records.create({
          data: {
            student_id: student.id,
            academic_year_id: year.id,
            major_id: major.id,
            generation_id: cohort.id,
            year_level: 1,
            class_group: 'A',
          },
        });
        await tx.student_cohort_assignment_events.create({
          data: {
            academic_record_id: record.id,
            student_id: student.id,
            academic_year_id: year.id,
            major_id: major.id,
            generation_id: cohort.id,
            action: 'INITIAL',
          },
        });
      });
    const semester = await db.semesters.create({
      data: {
        academic_year_id: year.id,
        semester_name: 'Semester 1',
        semester_number: 1,
        created_at: now,
        updated_at: now,
      },
    });
    const course = await db.courses.create({
      data: {
        department_id: department.id,
        course_code: 'DEADLINE-1',
        course_name: 'Deadline course',
        created_at: now,
        updated_at: now,
      },
    });
    const rule = await db.course_year_rules.create({
      data: {
        course_id: course.id,
        major_id: major.id,
        year_level: 1,
        revisions: {
          create: {
            revision_no: 1,
            effective_academic_year_id: year.id,
            effective_start_year: 2098,
            enabled: true,
          },
        },
      },
      include: { revisions: true },
    });
    const offering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: users.LECTURER,
        semester_id: semester.id,
        year_level: 1,
        class_type: 'COURSE',
        created_at: now,
        updated_at: now,
        group_scopes: {
          create: {
            academic_year_id: year.id,
            generation_id: cohort.id,
            major_id: major.id,
            year_level: 1,
            class_group: 'A',
            curriculum_revision_id: rule.revisions[0].id,
          },
        },
      },
    });
    for (const label of ['STUDENT', 'DONE'])
      await db.enrollments.create({
        data: {
          course_offering_id: offering.id,
          student_id: users[label],
          enrolled_at: now,
        },
      });
    const survey = await db.surveys.create({
      data: {
        title: 'Deadline questionnaire',
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
    question = (
      await db.questions.create({
        data: {
          survey_version_id: version.id,
          question_text: 'Rate teaching',
          question_type: 'RATING',
          min_rating: 1,
          max_rating: 5,
          display_order: 1,
          is_required: true,
          created_at: now,
          updated_at: now,
        },
      })
    ).id;
    await db.survey_versions.update({
      where: { id: version.id },
      data: { status: 'LOCKED', locked_at: now },
    });
    evaluation = (
      await db.evaluations.create({
        data: {
          course_offering_id: offering.id,
          survey_version_id: version.id,
          status: 'OPEN',
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          created_by: users.ADMIN,
          created_at: now,
          updated_at: now,
        },
      })
    ).id;
    for (const label of ['STUDENT', 'DONE']) {
      const participant = await db.evaluation_participants.create({
        data: {
          evaluation_id: evaluation,
          student_id: users[label],
          survey_version_id: version.id,
          has_submitted: label === 'DONE',
          ...(label === 'DONE' ? { submitted_at: now } : {}),
          created_at: now,
        },
      });
      if (label === 'STUDENT')
        await db.assessment_drafts.create({
          data: {
            participant_id: participant.id,
            survey_version_id: version.id,
            answers_json: {
              answers: [{ question_id: String(question), rating_value: 3 }],
            },
            created_at: now,
            updated_at: now,
          },
        });
      else {
        const response = await db.responses.create({
          data: {
            evaluation_id: evaluation,
            survey_version_id: version.id,
            created_at: now,
            submitted_at: now,
          },
        });
        await db.answers.create({
          data: {
            response_id: response.id,
            question_id: question,
            rating_value: 4,
            created_at: now,
          },
        });
      }
    }
    const closedOffering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: users.LECTURER,
        semester_id: semester.id,
        year_level: 1,
        class_type: 'TP',
        created_at: now,
        updated_at: now,
      },
    });
    closedEvaluation = (
      await db.evaluations.create({
        data: {
          course_offering_id: closedOffering.id,
          survey_version_id: version.id,
          status: 'CLOSED',
          start_at: new Date(now.getTime() - 7200000),
          end_at: new Date(now.getTime() - 3600000),
          created_by: users.ADMIN,
          created_at: now,
          updated_at: now,
        },
      })
    ).id;
    protectedRows = await history();
    protectedClosed = await db.evaluations.findUnique({
      where: { id: closedEvaluation },
    });
  }, 90000);
  beforeEach(async () => {
    if (db && evaluation) await active();
  });
  afterEach(async () => {
    if (db && protectedRows) {
      expect(await history()).toEqual(protectedRows);
      expect(
        await db.evaluations.findUnique({ where: { id: closedEvaluation } }),
      ).toEqual(protectedClosed);
      await fixture.unchangedPublic();
    }
  });
  afterAll(async () => {
    await app?.close();
    await fixture.close();
  });

  it('extends only end_at/updated_at and preserves all protected academic/questionnaire/answer state', async () => {
    const before = await db.evaluations.findUniqueOrThrow({
        where: { id: evaluation },
      }),
      deadline = later();
    const result = await schedule({ end_at: deadline });
    expect(result.status).toBe(200);
    expect(result.body.end_at).toBe(deadline);
    const after = await db.evaluations.findUniqueOrThrow({
      where: { id: evaluation },
    });
    expect({
      ...after,
      end_at: before.end_at,
      updated_at: before.updated_at,
    }).toEqual(before);
    expect(after.end_at).toEqual(new Date(deadline));
    expect(result.body.status).toBe('OPEN');
  });
  it('allows another ACTIVE ADMIN under the approved school-wide policy', async () => {
    expect((await schedule({ end_at: later() }, 'OTHER')).status).toBe(200);
  });
  it.each(['LECTURER', 'STUDENT'])('denies %s extension', async (role) => {
    await unchanged(() => schedule({ end_at: later() }, role), 403);
  });
  it('denies anonymous extension', async () => {
    await unchanged(
      () =>
        api()
          .put(`/api/evaluations/${evaluation}/schedule`)
          .send({ end_at: later() }),
      401,
    );
  });
  it('denies an inactive administrator', async () => {
    await db.users.update({
      where: { id: users.OTHER },
      data: { status: 'INACTIVE' },
    });
    try {
      await unchanged(() => schedule({ end_at: later() }, 'OTHER'), 401);
    } finally {
      await db.users.update({
        where: { id: users.OTHER },
        data: { status: 'ACTIVE' },
      });
    }
  });
  it.each(['upcoming', 'expired', 'closed', 'missing_start', 'missing_end'])(
    'rejects %s windows without writes',
    async (state) => {
      const patch =
        state === 'upcoming'
          ? { start_at: new Date(Date.now() + 1800000) }
          : state === 'expired'
            ? { end_at: new Date(Date.now() - 1) }
            : state === 'closed'
              ? { status: 'CLOSED' }
              : state === 'missing_start'
                ? { start_at: null }
                : { end_at: null };
      await active(patch);
      await unchanged(
        () => schedule({ end_at: later() }),
        409,
        'EVALUATION_NOT_ACTIVE',
      );
    },
  );
  it.each(['unchanged', 'changed', 'null'])(
    'rejects supplied %s start_at on an active evaluation',
    async (type) => {
      const saved = await db.evaluations.findUniqueOrThrow({
        where: { id: evaluation },
      });
      await unchanged(
        () =>
          schedule({
            end_at: later(),
            start_at:
              type === 'null'
                ? null
                : type === 'unchanged'
                  ? saved.start_at!.toISOString()
                  : new Date().toISOString(),
          }),
        400,
        'ACTIVE_DEADLINE_START_IMMUTABLE',
      );
    },
  );
  it.each([
    'missing',
    'null',
    'blank',
    'malformed',
    'impossible',
    'equal',
    'earlier',
  ])('rejects %s deadline without writes', async (type) => {
    const saved = await db.evaluations.findUniqueOrThrow({
      where: { id: evaluation },
    });
    const value =
      type === 'null'
        ? null
        : type === 'blank'
          ? ''
          : type === 'malformed'
            ? 'tomorrow'
            : type === 'impossible'
              ? '2098-02-30T14:00:00Z'
              : type === 'equal'
                ? saved.end_at!.toISOString()
                : new Date(saved.end_at!.getTime() - 1).toISOString();
    await unchanged(
      () => schedule(type === 'missing' ? {} : { end_at: value }),
      400,
    );
  });
  it('rejects an equal instant expressed with another timezone offset', async () => {
    const saved = await db.evaluations.findUniqueOrThrow({
        where: { id: evaluation },
      }),
      shifted = new Date(saved.end_at!.getTime() + 7 * 3600000)
        .toISOString()
        .replace('Z', '+07:00');
    await unchanged(
      () => schedule({ end_at: shifted }),
      400,
      'ACTIVE_DEADLINE_MUST_INCREASE',
    );
  });
  it('rejects unknown fields instead of applying a hidden status change', async () => {
    await unchanged(() => schedule({ end_at: later(), status: 'OPEN' }), 400);
  });
  it('returns 404 for an unknown evaluation', async () => {
    await unchanged(
      () => schedule({ end_at: later() }, 'ADMIN', 9223372036854775807n),
      404,
    );
  });
  it('retains DRAFT start/end editing', async () => {
    await active({ status: 'DRAFT' });
    const start = new Date(Date.now() + 3600000).toISOString(),
      end = new Date(Date.now() + 7200000).toISOString();
    const result = await schedule({ start_at: start, end_at: end });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: 'DRAFT',
      start_at: start,
      end_at: end,
    });
  });
  it('retains DRAFT invalid-window rejection', async () => {
    await active({ status: 'DRAFT' });
    await unchanged(
      () => schedule({ start_at: later(), end_at: new Date().toISOString() }),
      400,
    );
  });
  it('allows recovery by GET after response loss; an exact repeated extension is a no-write 400', async () => {
    const deadline = later();
    expect((await schedule({ end_at: deadline })).status).toBe(200);
    const get = await unchanged(
      () => api().get(`/api/evaluations/${evaluation}`).set(auth()),
      200,
    );
    expect(get.body.end_at).toBe(deadline);
    await unchanged(
      () => schedule({ end_at: deadline }),
      400,
      'ACTIVE_DEADLINE_MUST_INCREASE',
    );
  });
  it('does not change student access scope, completed status or locked questionnaire through extension', async () => {
    const get = (role: string) =>
      api().get('/api/student/evaluations/history').set(auth(role));
    const before = await get('STUDENT'),
      doneBefore = await get('DONE'),
      unassignedBefore = await get('UNASSIGNED');
    expect(before.status).toBe(200);
    expect(before.body.some((row: any) => row.id === String(evaluation))).toBe(
      true,
    );
    expect(
      unassignedBefore.body.some((row: any) => row.id === String(evaluation)),
    ).toBe(false);
    const deadline = later();
    expect((await schedule({ end_at: deadline })).status).toBe(200);
    const after = await get('STUDENT'),
      doneAfter = await get('DONE');
    expect(after.body).toEqual(
      before.body.map((row: any) =>
        row.id === String(evaluation) ? { ...row, end_at: deadline } : row,
      ),
    );
    expect(doneAfter.body).toEqual(
      doneBefore.body.map((row: any) =>
        row.id === String(evaluation) ? { ...row, end_at: deadline } : row,
      ),
    );
    expect((await get('UNASSIGNED')).body).toEqual(unassignedBefore.body);
  });
  it('never shortens a later committed deadline under competing extensions', async () => {
    const short = new Date(Date.now() + 7200000).toISOString(),
      long = new Date(Date.now() + 10800000).toISOString();
    const results = await Promise.all([
      schedule({ end_at: short }),
      schedule({ end_at: long }),
    ]);
    expect(results.some((r) => r.status === 200)).toBe(true);
    expect(results.every((r) => [200, 400, 409].includes(r.status))).toBe(true);
    const success = [short, long]
      .filter((_end, i) => results[i].status === 200)
      .sort()
      .at(-1);
    expect(
      (
        await db.evaluations.findUniqueOrThrow({ where: { id: evaluation } })
      ).end_at!.toISOString(),
    ).toBe(success);
    const saved = await db.evaluations.findUniqueOrThrow({
      where: { id: evaluation },
    });
    if (saved.end_at!.toISOString() !== long)
      expect((await schedule({ end_at: long })).status).toBe(200);
    expect(
      (
        await db.evaluations.findUniqueOrThrow({ where: { id: evaluation } })
      ).end_at!.toISOString(),
    ).toBe(long);
  });
  it('serializes with manual closure and cannot reopen the evaluation', async () => {
    const results = await Promise.all([
      schedule({ end_at: later() }),
      api().post(`/api/evaluations/${evaluation}/close`).set(auth()),
    ]);
    expect(results.every((r) => [200, 409].includes(r.status))).toBe(true);
    expect(results.some((r) => r.status === 200)).toBe(true);
    const saved = await db.evaluations.findUniqueOrThrow({
      where: { id: evaluation },
    });
    if (saved.status === 'OPEN')
      expect(
        (await api().post(`/api/evaluations/${evaluation}/close`).set(auth()))
          .status,
      ).toBe(200);
    await unchanged(
      () => schedule({ end_at: later() }),
      409,
      'EVALUATION_NOT_ACTIVE',
    );
    expect(
      (await db.evaluations.findUniqueOrThrow({ where: { id: evaluation } }))
        .status,
    ).toBe('CLOSED');
  });
  it('rolls back an injected update failure without altering protected state', async () => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION deadline_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic deadline failure'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER deadline_fail BEFORE UPDATE ON evaluations FOR EACH ROW EXECUTE FUNCTION deadline_fail()',
    );
    try {
      await unchanged(() => schedule({ end_at: later() }), 500);
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER deadline_fail ON evaluations');
      await db.$executeRawUnsafe('DROP FUNCTION deadline_fail()');
    }
    expect((await schedule({ end_at: later() })).status).toBe(200);
  });
  it('documents extension, boundaries, errors, recovery and retained DRAFT behavior in Swagger', () => {
    const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().addBearerAuth().build(),
      ),
      route = document.paths['/api/evaluations/{id}/schedule'].put!;
    expect(route.description).toContain(
      'start_at <= server time < current end_at',
    );
    expect(route.description).toContain('SERIALIZABLE');
    expect(route.description).toContain('lost response');
    expect(route.responses).toHaveProperty('400');
    expect(route.responses).toHaveProperty('409');
  });
});
