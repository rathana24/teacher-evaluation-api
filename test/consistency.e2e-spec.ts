import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ConflictException,
} from '@nestjs/common';
import { Prisma, question_type } from '@prisma/client';
import { createRequire } from 'node:module';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StudentAccessService } from '../src/student-access/student-access.service';
import { AssessmentDraftsService } from '../src/assessment-drafts/assessment-drafts.service';
import { SubmissionsService } from '../src/submissions/submissions.service';
import { SurveyVersionsService } from '../src/survey-versions/survey-versions.service';
import { QuestionsService } from '../src/questions/questions.service';
import { EvaluationsService } from '../src/evaluations/evaluations.service';
import { EnrollmentsService } from '../src/enrollments/enrollments.service';
import { StudentsService } from '../src/students/students.service';
import { StudentEvaluationProgressService } from '../src/students/student-evaluation-progress.service';
import { UsersService } from '../src/users/users.service';
import { StudentAcademicRecordsService } from '../src/student-academic-records/student-academic-records.service';
import { CommentsService } from '../src/comments/comments.service';
import { LecturerDashboardService } from '../src/lecturer-dashboard/lecturer-dashboard.service';
import { ResultsService } from '../src/results/results.service';

const historical = createRequire(`${process.cwd()}/package.json`)(
  './scripts/historical-metadata.cjs',
);

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

/** Pause one real SQL operation. All delegates still execute against PostgreSQL. */
function gateTransaction(prisma: PrismaService, model: string, method: string) {
  let reached!: () => void;
  let release!: () => void;
  let paused = false;
  const ready = new Promise<void>((resolve) => {
    reached = resolve;
  });
  const resume = new Promise<void>((resolve) => {
    release = resolve;
  });
  const db = new Proxy(prisma, {
    get(target, property) {
      if (property === '$transaction')
        return (operation: any, options: any) =>
          target.$transaction(
            async (tx) =>
              operation(
                new Proxy(tx, {
                  get(client, delegate) {
                    const value = Reflect.get(client, delegate);
                    if (delegate !== model)
                      return typeof value === 'function'
                        ? value.bind(client)
                        : value;
                    return new Proxy(value, {
                      get(table, action) {
                        const fn = Reflect.get(table, action);
                        if (action !== method)
                          return typeof fn === 'function' ? fn.bind(table) : fn;
                        return async (...args: any[]) => {
                          if (!paused) {
                            paused = true;
                            reached();
                            await resume;
                          }
                          return fn.apply(table, args);
                        };
                      },
                    });
                  },
                }),
              ),
            options,
          );
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return {
    db,
    release,
    async wait(operation: Promise<any>) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          ready,
          operation.then(() => {
            throw new Error('Operation never reached SQL barrier');
          }),
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('SQL barrier timed out')),
              8_000,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
  };
}

describe('School consistency acceptance (real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: bigint,
    lecturer: bigint,
    year: bigint,
    semester: bigint,
    generation: bigint,
    major: bigint,
    department: bigint;
  let adminToken: string;
  const stamp = Date.now().toString();
  const userIds: bigint[] = [],
    offeringIds: bigint[] = [],
    courseIds: bigint[] = [],
    surveyIds: bigint[] = [];
  const extraGenerationIds: bigint[] = [],
    extraMajorIds: bigint[] = [];
  const students: {
    account: bigint;
    profile: bigint;
    placement: bigint;
    group: string;
  }[] = [];
  let passwordHash: string;

  const api = () => request(app.getHttpServer());
  const authorization = () => ({ Authorization: `Bearer ${adminToken}` });
  async function account(role: 'ADMIN' | 'LECTURER' | 'STUDENT', name: string) {
    const now = new Date();
    const user = await prisma.users.create({
      data: {
        email: `${name}-${stamp}@consistency.test`,
        full_name: name,
        password_hash: passwordHash,
        role,
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      },
    });
    userIds.push(user.id);
    return user.id;
  }
  async function student(
    group: string,
    generationId = generation,
    majorId = major,
    yearLevel = 1,
  ) {
    const accountId = await account('STUDENT', `student-${userIds.length}`);
    const profile = await prisma.students.create({
      data: {
        user_id: accountId,
        student_code: `C-${stamp}-${accountId}`,
        generation_id: generationId,
      },
    });
    const placement = await prisma.student_academic_records.create({
      data: {
        student_id: profile.id,
        academic_year_id: year,
        year_level: yearLevel,
        major_id: majorId,
        class_group: group,
      },
    });
    return {
      account: accountId,
      profile: profile.id,
      placement: placement.id,
      group,
    };
  }
  async function offering(groups: string[] = []) {
    const now = new Date();
    const course = await prisma.courses.create({
      data: {
        course_code: `C${stamp}-${courseIds.length}`,
        course_name: 'Consistency test',
        department_id: department,
        created_at: now,
        updated_at: now,
      },
    });
    courseIds.push(course.id);
    const result = await prisma.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: lecturer,
        semester_id: semester,
        class_type: groups.length === 1 ? 'TD' : 'COURSE',
        year_level: 1,
        section_code: 'A label is not a scope',
        created_at: now,
        updated_at: now,
        group_scopes: {
          create: groups.map((class_group) => ({
            academic_year_id: year,
            generation_id: generation,
            major_id: major,
            year_level: 1,
            class_group,
          })),
        },
      },
    });
    offeringIds.push(result.id);
    return result;
  }
  async function survey() {
    const now = new Date();
    const set = await prisma.surveys.create({
      data: {
        title: `Consistency ${stamp}-${surveyIds.length}`,
        created_by: admin,
        created_at: now,
        updated_at: now,
      },
    });
    surveyIds.push(set.id);
    const v1 = await version(set.id, 1);
    return { set, v1 };
  }
  async function version(
    surveyId: bigint,
    number: number,
    withQuestions = true,
  ) {
    const now = new Date();
    return prisma.survey_versions.create({
      data: {
        survey_id: surveyId,
        version_no: number,
        created_by: admin,
        created_at: now,
        status: 'DRAFT',
        questions: {
          create: withQuestions
            ? [
                {
                  question_type: question_type.RATING,
                  question_text: `Rating V${number}`,
                  min_rating: 1,
                  max_rating: 5,
                  display_order: 1,
                  created_at: now,
                  updated_at: now,
                },
                {
                  question_type: question_type.TEXT,
                  question_text: `Comment V${number}`,
                  is_required: false,
                  display_order: 2,
                  created_at: now,
                  updated_at: now,
                },
              ]
            : [],
        },
      },
      include: { questions: true },
    });
  }
  async function evaluation() {
    const assignment = await offering(['A', 'B']);
    const { set, v1 } = await survey();
    const now = new Date();
    await prisma.enrollments.createMany({
      data: students.map((s) => ({
        student_id: s.account,
        course_offering_id: assignment.id,
        enrolled_at: now,
      })),
    });
    const result = await prisma.evaluations.create({
      data: {
        course_offering_id: assignment.id,
        survey_version_id: v1.id,
        created_by: admin,
        status: 'OPEN',
        start_at: new Date(Date.now() - 60_000),
        end_at: new Date(Date.now() + 86_400_000),
        created_at: now,
        updated_at: now,
        evaluation_participants: {
          create: students.map((s) => ({
            student_id: s.account,
            survey_version_id: v1.id,
            has_submitted: false,
            created_at: now,
          })),
        },
      },
      include: { evaluation_participants: true },
    });
    return { ...result, set, v1, assignment };
  }
  const answers = (v: {
    questions: { id: bigint; question_type: string }[];
  }) => ({
    answers: [
      {
        question_id: v.questions
          .find((q) => q.question_type === 'RATING')!
          .id.toString(),
        rating_value: 5,
      },
    ],
  });
  const selection = (groups: string[]) => ({
    academic_year_id: year.toString(),
    generation_id: generation.toString(),
    major_id: major.toString(),
    year_level: 1,
    class_groups: groups,
  });

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
    passwordHash = await bcrypt.hash('Consistency123', 10);
    admin = await account('ADMIN', 'admin');
    lecturer = await account('LECTURER', 'lecturer');
    const login = await api()
      .post('/api/auth/login')
      .send({
        identifier: `admin-${stamp}@consistency.test`,
        password: 'Consistency123',
      });
    expect(login.status).toBe(200);
    adminToken = login.body.access_token;
    department = (
      await prisma.departments.create({
        data: { code: `C-${stamp}`, name: `Consistency ${stamp}` },
      })
    ).id;
    year = (
      await prisma.academic_years.create({
        data: { name: `C-${stamp}`, start_year: 2026 },
      })
    ).id;
    const now = new Date();
    semester = (
      await prisma.semesters.create({
        data: {
          academic_year_id: year,
          semester_name: 'Consistency',
          semester_number: 1,
          created_at: now,
          updated_at: now,
        },
      })
    ).id;
    generation = (
      await prisma.student_generations.create({
        data: { name: `C-${stamp}`, entry_academic_year_id: year },
      })
    ).id;
    major = (
      await prisma.majors.create({
        data: {
          code: `C-${stamp}`,
          name: 'Consistency',
          department_id: department,
        },
      })
    ).id;
    students.push(await student('A'), await student('B'));
  }, 30_000);

  afterAll(async () => {
    try {
      if (prisma)
        await prisma.$transaction(
          async (tx) => {
            const evaluations = { course_offering_id: { in: offeringIds } };
            const responseFilter = { evaluations };
            const questionFilter = {
              survey_versions: { survey_id: { in: surveyIds } },
            };
            await tx.answer_options.deleteMany({
              where: { answers: { responses: responseFilter } },
            });
            await tx.answers.deleteMany({
              where: { responses: responseFilter },
            });
            await tx.responses.deleteMany({ where: responseFilter });
            await tx.assessment_drafts.deleteMany({
              where: { evaluation_participants: { evaluations } },
            });
            await tx.evaluation_participants.deleteMany({
              where: { evaluations },
            });
            await tx.evaluation_group_targets.deleteMany({
              where: { evaluations },
            });
            await tx.evaluation_generation_targets.deleteMany({
              where: { evaluations },
            });
            await tx.evaluations.deleteMany({ where: evaluations });
            await tx.enrollments.deleteMany({
              where: { course_offering_id: { in: offeringIds } },
            });
            await tx.course_offering_group_scopes.deleteMany({
              where: { course_offering_id: { in: offeringIds } },
            });
            await tx.course_offerings.deleteMany({
              where: { id: { in: offeringIds } },
            });
            await tx.courses.deleteMany({ where: { id: { in: courseIds } } });
            await tx.question_options.deleteMany({
              where: { questions: questionFilter },
            });
            await tx.questions.deleteMany({ where: questionFilter });
            await tx.survey_versions.deleteMany({
              where: { survey_id: { in: surveyIds } },
            });
            await tx.surveys.deleteMany({ where: { id: { in: surveyIds } } });
            await tx.student_academic_records.deleteMany({
              where: { students: { user_id: { in: userIds } } },
            });
            await tx.students.deleteMany({
              where: { user_id: { in: userIds } },
            });
            await tx.users.deleteMany({ where: { id: { in: userIds } } });
            await tx.student_generations.deleteMany({
              where: {
                id: { in: [generation, ...extraGenerationIds].filter(Boolean) },
              },
            });
            await tx.majors.deleteMany({
              where: { id: { in: [major, ...extraMajorIds].filter(Boolean) } },
            });
            if (semester)
              await tx.semesters.delete({ where: { id: semester } });
            if (year) await tx.academic_years.delete({ where: { id: year } });
            if (department)
              await tx.departments.delete({ where: { id: department } });
          },
          { timeout: 20_000 },
        );
    } finally {
      if (app) await app.close();
    }
  });

  it('rejects direct single/bulk scope bypass and accepts saved shared A+B scope', async () => {
    const aOnly = await offering(['A']);
    const shared = await offering(['A', 'B']);
    const url = (id: bigint) => `/api/course-offerings/${id}/enrollments`;
    expect(
      (
        await api()
          .post(url(aOnly.id))
          .set(authorization())
          .send({ student_id: students[1].account.toString() })
      ).status,
    ).toBe(400);
    const bulk = await api()
      .post(`${url(aOnly.id)}/bulk`)
      .set(authorization())
      .send({
        ...selection(['A', 'B']),
        confirmed_student_ids: students.map((s) => s.account.toString()),
      });
    expect(bulk.status).toBe(409);
    expect(
      await prisma.enrollments.count({
        where: { course_offering_id: aOnly.id },
      }),
    ).toBe(0);
    for (const s of students)
      expect(
        (
          await api()
            .post(url(shared.id))
            .set(authorization())
            .send({ student_id: s.account.toString() })
        ).status,
      ).toBe(201);
  });

  it('rejects same-named groups in another generation, major or year and inactive accounts', async () => {
    const aOnly = await offering(['A']);
    const otherGeneration = (
      await prisma.student_generations.create({
        data: { name: `Other-${stamp}`, entry_academic_year_id: year },
      })
    ).id;
    extraGenerationIds.push(otherGeneration);
    const otherMajor = (
      await prisma.majors.create({
        data: {
          code: `Other-${stamp}`,
          name: 'Other',
          department_id: department,
        },
      })
    ).id;
    extraMajorIds.push(otherMajor);
    for (const s of [
      await student('A', otherGeneration),
      await student('A', generation, otherMajor),
      await student('A', generation, major, 2),
    ]) {
      await expect(
        app
          .get(EnrollmentsService)
          .create(aOnly.id, { student_id: s.account.toString() }),
      ).rejects.toThrow();
    }
    await prisma.users.update({
      where: { id: students[0].account },
      data: { status: 'INACTIVE' },
    });
    try {
      await expect(
        app
          .get(EnrollmentsService)
          .create(aOnly.id, { student_id: students[0].account.toString() }),
      ).rejects.toThrow();
    } finally {
      await prisma.users.update({
        where: { id: students[0].account },
        data: { status: 'ACTIVE' },
      });
    }
    expect(
      await prisma.enrollments.count({
        where: { course_offering_id: aOnly.id },
      }),
    ).toBe(0);
  });

  it('preserves explicit legacy no-scope behavior without inferring a section restriction', async () => {
    const legacy = await offering();
    const user = await account('STUDENT', 'legacy-no-placement');
    await app
      .get(EnrollmentsService)
      .create(legacy.id, { student_id: user.toString() });
    expect(
      await prisma.enrollments.count({
        where: { course_offering_id: legacy.id },
      }),
    ).toBe(1);
  });

  it('rejects stale explicit versions and never falls back when the newest is empty', async () => {
    const assignment = await offering();
    const { set, v1 } = await survey();
    await version(set.id, 2, false);
    await expect(
      app.get(EvaluationsService).create(
        {
          course_offering_id: assignment.id.toString(),
          survey_version_id: v1.id.toString(),
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      app.get(EvaluationsService).create(
        {
          course_offering_id: assignment.id.toString(),
          survey_id: set.id.toString(),
        },
        admin,
      ),
    ).rejects.toThrow('no questions');
    expect(
      await prisma.evaluations.count({
        where: { course_offering_id: assignment.id },
      }),
    ).toBe(0);
  });

  it('protects questions assigned to a DRAFT evaluation and older unused drafts', async () => {
    const assignment = await offering();
    const { set, v1 } = await survey();
    await app.get(EvaluationsService).create(
      {
        course_offering_id: assignment.id.toString(),
        survey_version_id: v1.id.toString(),
      },
      admin,
    );
    await expect(
      app.get(QuestionsService).update(v1.questions[0].id, {
        question_text: 'Changed after assignment',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const unused = await survey();
    await version(unused.set.id, 2);
    await expect(
      app
        .get(QuestionsService)
        .update(unused.v1.questions[0].id, { question_text: 'Stale edit' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.survey_versions.count({ where: { survey_id: set.id } }),
    ).toBe(1);
  });

  it('rejects a stale opening and preserves its assigned version and frozen participants', async () => {
    const e = await evaluation();
    await prisma.evaluations.update({
      where: { id: e.id },
      data: { status: 'DRAFT' },
    });
    await version(e.set.id, 2);
    await expect(app.get(EvaluationsService).open(e.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const saved = await prisma.evaluations.findUniqueOrThrow({
      where: { id: e.id },
      include: { evaluation_participants: true },
    });
    expect(saved.status).toBe('DRAFT');
    expect(saved.survey_version_id).toBe(e.v1.id);
    expect(saved.evaluation_participants.map((p) => p.id)).toEqual(
      e.evaluation_participants.map((p) => p.id),
    );
  });

  it('allows continuing an existing archived-set assignment but rejects new assignments', async () => {
    const e = await evaluation();
    await prisma.evaluations.update({
      where: { id: e.id },
      data: { status: 'DRAFT' },
    });
    await prisma.surveys.update({
      where: { id: e.set.id },
      data: { archived_at: new Date() },
    });
    await app.get(EvaluationsService).open(e.id);
    await app
      .get(SubmissionsService)
      .submit(e.id, students[0].account, answers(e.v1));
    const other = await offering();
    await expect(
      app.get(EvaluationsService).create(
        {
          course_offering_id: other.id.toString(),
          survey_version_id: e.v1.id.toString(),
        },
        admin,
      ),
    ).rejects.toThrow('archived question set');
  });

  it('rolls back a question edit raced against assignment; original IDs and wording survive', async () => {
    const assignment = await offering();
    const { v1 } = await survey();
    const gate = gateTransaction(prisma, 'questions', 'update');
    const editing = new QuestionsService(
      gate.db,
      app.get(SurveyVersionsService),
    ).update(v1.questions[0].id, { question_text: 'Concurrent edit' });
    const outcome = editing.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(editing);
      await app.get(EvaluationsService).create(
        {
          course_offering_id: assignment.id.toString(),
          survey_version_id: v1.id.toString(),
        },
        admin,
      );
    } finally {
      gate.release();
    }
    expect(await outcome).toBeInstanceOf(ConflictException);
    expect(
      (
        await prisma.questions.findUniqueOrThrow({
          where: { id: v1.questions[0].id },
        })
      ).question_text,
    ).toBe('Rating V1');
  });

  it('a delayed draft save cannot recreate a draft after anonymous submission', async () => {
    const e = await evaluation();
    const gate = gateTransaction(prisma, 'assessment_drafts', 'upsert');
    const saving = new AssessmentDraftsService(
      gate.db,
      app.get(StudentAccessService),
    ).save(e.id, students[0].account, answers(e.v1));
    const outcome = saving.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(saving);
      await app
        .get(SubmissionsService)
        .submit(e.id, students[0].account, answers(e.v1));
    } finally {
      gate.release();
    }
    expect(await outcome).toBeInstanceOf(ConflictException);
    expect(
      await prisma.assessment_drafts.count({
        where: { participant_id: e.evaluation_participants[0].id },
      }),
    ).toBe(0);
    expect(
      await prisma.responses.count({ where: { evaluation_id: e.id } }),
    ).toBe(1);
  });

  it('racing question application protects a newly saved V1 draft atomically', async () => {
    const e = await evaluation();
    const v2 = await version(e.set.id, 2);
    const gate = gateTransaction(
      prisma,
      'evaluation_participants',
      'updateMany',
    );
    const applying = new SurveyVersionsService(gate.db).applyToUnfinished(
      e.set.id,
      v2.id,
    );
    const outcome = applying.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(applying);
      await app
        .get(AssessmentDraftsService)
        .save(e.id, students[0].account, answers(e.v1));
    } finally {
      gate.release();
    }
    expect(await outcome).toBeInstanceOf(ConflictException);
    const participant = await prisma.evaluation_participants.findUniqueOrThrow({
      where: { id: e.evaluation_participants[0].id },
      include: { assessment_drafts: true },
    });
    expect(participant.survey_version_id).toBe(e.v1.id);
    expect(participant.assessment_drafts!.survey_version_id).toBe(e.v1.id);
    expect(
      (
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: { id: e.evaluation_participants[1].id },
        })
      ).survey_version_id,
    ).toBe(e.v1.id);
    const retry = await app
      .get(SurveyVersionsService)
      .applyToUnfinished(e.set.id, v2.id);
    expect(retry.updated_participants).toBe(1);
    const repeated = await app
      .get(SurveyVersionsService)
      .applyToUnfinished(e.set.id, v2.id);
    expect(repeated.updated_participants).toBe(0);
  });

  it('concurrent final submissions create exactly one anonymous response', async () => {
    const e = await evaluation();
    const service = app.get(SubmissionsService);
    const result = await Promise.allSettled([
      service.submit(e.id, students[0].account, answers(e.v1)),
      service.submit(e.id, students[0].account, answers(e.v1)),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = result.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    expect(
      await prisma.responses.count({ where: { evaluation_id: e.id } }),
    ).toBe(1);
    expect(
      await prisma.answers.count({
        where: { responses: { evaluation_id: e.id } },
      }),
    ).toBe(1);
  });

  it('moves safe NULL-version participants but preserves NULL-version historical drafts', async () => {
    const e = await evaluation();
    const v2 = await version(e.set.id, 2);
    await prisma.evaluation_participants.updateMany({
      where: { evaluation_id: e.id },
      data: { survey_version_id: null },
    });
    await prisma.assessment_drafts.create({
      data: {
        participant_id: e.evaluation_participants[0].id,
        survey_version_id: null,
        answers_json: answers(e.v1).answers,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const result = await app
      .get(SurveyVersionsService)
      .applyToUnfinished(e.set.id, v2.id);
    expect(result.updated_participants).toBe(1);
    expect(
      (
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: { id: e.evaluation_participants[0].id },
        })
      ).survey_version_id,
    ).toBeNull();
    expect(
      (
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: { id: e.evaluation_participants[1].id },
        })
      ).survey_version_id,
    ).toBe(v2.id);
  });

  it('returns comments and rating questions from the response actual V2 version', async () => {
    const e = await evaluation();
    const v2 = await version(e.set.id, 2);
    await app.get(SurveyVersionsService).applyToUnfinished(e.set.id, v2.id);
    const dto = answers(v2);
    await app.get(SubmissionsService).submit(e.id, students[0].account, {
      answers: [
        ...dto.answers,
        {
          question_id: v2.questions
            .find((q) => q.question_type === 'TEXT')!
            .id.toString(),
          text_value: 'V2 comment',
        },
      ],
    });
    await app.get(EvaluationsService).close(e.id);
    const comments = await app.get(CommentsService).getComments(e.id, lecturer);
    expect(comments.comment_count).toBe(1);
    expect(comments.questions.flatMap((q) => q.comments)).toContain(
      'V2 comment',
    );
    const dashboard = await app
      .get(LecturerDashboardService)
      .getDashboard(e.id, lecturer);
    expect(JSON.stringify(dashboard)).toContain(v2.questions[0].id.toString());
  });

  it('serializes placement drift without rewriting confirmed membership and rejects a stale retry', async () => {
    const assignment = await offering(['A']);
    const gate = gateTransaction(prisma, 'enrollments', 'createMany');
    const dto = {
      ...selection(['A']),
      confirmed_student_ids: [students[0].account.toString()],
    };
    const confirming = new EnrollmentsService(
      gate.db,
      app.get(StudentsService),
    ).bulkCreate(assignment.id, dto);
    const outcome = confirming.then(
      (value) => ({ value, error: null }),
      (error) => ({ value: null, error }),
    );
    try {
      await gate.wait(confirming);
      await app
        .get(StudentAcademicRecordsService)
        .update(students[0].placement, { class_group: 'B' });
    } finally {
      gate.release();
    }
    const result = await outcome;
    expect(
      result.error === null || result.error instanceof ConflictException,
    ).toBe(true);
    expect(
      await prisma.enrollments.count({
        where: { course_offering_id: assignment.id },
      }),
    ).toBe(result.error ? 0 : 1);
    await expect(
      app.get(EnrollmentsService).bulkCreate(assignment.id, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    await app
      .get(StudentAcademicRecordsService)
      .update(students[0].placement, { class_group: 'A' });
  });

  it('historical recovery requires evidence, dry-runs, applies idempotently and rolls back exact metadata', async () => {
    const e = await evaluation();
    await app
      .get(SubmissionsService)
      .submit(e.id, students[0].account, answers(e.v1));
    const response = await prisma.responses.findFirstOrThrow({
      where: { evaluation_id: e.id },
    });
    await prisma.responses.update({
      where: { id: response.id },
      data: { survey_version_id: null },
    });
    const record = await historical.inspectRecord(
      prisma,
      'response',
      response.id.toString(),
    );
    expect(record.status).toBe('CANDIDATE_REQUIRES_VERIFIED_PROVENANCE');
    await app
      .get(AssessmentDraftsService)
      .save(e.id, students[1].account, answers(e.v1));
    const draft = await prisma.assessment_drafts.findUniqueOrThrow({
      where: { participant_id: e.evaluation_participants[1].id },
    });
    await prisma.assessment_drafts.update({
      where: { id: draft.id },
      data: { survey_version_id: null },
    });
    const draftRecord = await historical.inspectRecord(
      prisma,
      'draft',
      draft.id.toString(),
    );
    expect(draftRecord.candidate_version_id).toBe(e.v1.id.toString());
    const manifest = {
      schema_version: 1,
      records: [
        {
          ...record,
          verified_version_id: e.v1.id.toString(),
          verified_by: 'Synthetic fixture verifier',
          evidence_reference:
            'This test created and submitted V1 before clearing metadata',
        },
        {
          ...draftRecord,
          verified_version_id: e.v1.id.toString(),
          verified_by: 'Synthetic fixture verifier',
          evidence_reference:
            'This test saved the V1 draft before clearing metadata',
        },
      ],
    };
    expect(() =>
      historical.validateManifest({
        ...manifest,
        records: [{ ...manifest.records[0], evidence_reference: '' }],
      }),
    ).toThrow('evidence');
    const operation = (options: any) =>
      prisma.$transaction((tx) => historical.reconcile(tx, manifest, options), {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    expect((await operation({ dryRun: true }))[0].outcome).toBe('WOULD_CHANGE');
    expect(
      (await prisma.responses.findUniqueOrThrow({ where: { id: response.id } }))
        .survey_version_id,
    ).toBeNull();
    expect((await operation({ dryRun: false }))[0].outcome).toBe('CHANGED');
    expect((await operation({ dryRun: false }))[0].outcome).toBe(
      'ALREADY_APPLIED',
    );
    expect(
      (await operation({ dryRun: false, rollback: true }))[0].outcome,
    ).toBe('CHANGED');
    expect(
      (await operation({ dryRun: false, rollback: true }))[0].outcome,
    ).toBe('ALREADY_APPLIED');
    expect(
      await prisma.answers.count({ where: { response_id: response.id } }),
    ).toBe(1);
    const restoredDraft = await prisma.assessment_drafts.findUniqueOrThrow({
      where: { id: draft.id },
    });
    expect(restoredDraft.survey_version_id).toBeNull();
    expect(restoredDraft.answers_json).toEqual(draft.answers_json);
    expect(restoredDraft.updated_at).toEqual(draft.updated_at);
  });

  it('a status change invalidates reviewed eligibility and cannot partially enroll a group', async () => {
    const assignment = await offering(['A', 'B']);
    const service = app.get(EnrollmentsService);
    const preview = await service.previewGroup(
      assignment.id,
      selection(['A', 'B']),
    );
    await app
      .get(UsersService)
      .update(students[0].account, { status: 'INACTIVE' }, admin);
    try {
      await expect(
        service.bulkCreate(assignment.id, {
          ...selection(['A', 'B']),
          confirmed_student_ids: preview.confirmed_student_ids,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        await prisma.enrollments.count({
          where: { course_offering_id: assignment.id },
        }),
      ).toBe(0);
    } finally {
      await app
        .get(UsersService)
        .update(students[0].account, { status: 'ACTIVE' }, admin);
    }
  });

  it('racing enrollment removal cannot leave a partially frozen evaluation', async () => {
    const assignment = await offering(['A', 'B']);
    const { v1 } = await survey();
    for (const s of students)
      await app
        .get(EnrollmentsService)
        .create(assignment.id, { student_id: s.account.toString() });
    const gate = gateTransaction(
      prisma,
      'evaluation_participants',
      'createMany',
    );
    const dto = {
      course_offering_id: assignment.id.toString(),
      survey_version_id: v1.id.toString(),
      confirmed_student_ids: students.map((s) => s.account.toString()),
    };
    const creating = new EvaluationsService(gate.db).create(dto, admin);
    const outcome = creating.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(creating);
      await app
        .get(EnrollmentsService)
        .remove(assignment.id, students[0].account);
    } finally {
      gate.release();
    }
    const error = await outcome;
    expect(error === null || error instanceof ConflictException).toBe(true);
    expect(
      await prisma.evaluations.count({
        where: { course_offering_id: assignment.id },
      }),
    ).toBe(error ? 0 : 1);
    const frozen = await prisma.evaluation_participants.findMany({
      where: { evaluations: { course_offering_id: assignment.id } },
    });
    // A successful freeze serializes before the deliberate removal. Later removal
    // leaves the reviewed historical snapshot intact, never a partial selection.
    expect(frozen.map((p) => p.student_id.toString()).sort()).toEqual(
      error ? [] : dto.confirmed_student_ids.slice().sort(),
    );
    await expect(
      app.get(EvaluationsService).create(dto, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('serializes a simultaneous status change and enrollment confirmation without widening reviewed IDs', async () => {
    const assignment = await offering(['A']);
    const gate = gateTransaction(prisma, 'enrollments', 'createMany');
    const dto = {
      ...selection(['A']),
      confirmed_student_ids: [students[0].account.toString()],
    };
    const confirming = new EnrollmentsService(
      gate.db,
      app.get(StudentsService),
    ).bulkCreate(assignment.id, dto);
    const outcome = confirming.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(confirming);
      await app
        .get(UsersService)
        .update(students[0].account, { status: 'INACTIVE' }, admin);
    } finally {
      gate.release();
    }
    try {
      const error = await outcome;
      expect(error === null || error instanceof ConflictException).toBe(true);
      const rows = await prisma.enrollments.findMany({
        where: { course_offering_id: assignment.id },
      });
      expect(rows.map((row) => row.student_id.toString())).toEqual(
        error ? [] : dto.confirmed_student_ids,
      );
      await expect(
        app.get(EnrollmentsService).bulkCreate(assignment.id, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      await app
        .get(UsersService)
        .update(students[0].account, { status: 'ACTIVE' }, admin);
    }
  });

  it('racing individual and bulk placement writes return conflict without lost updates or partial group changes', async () => {
    const gate = gateTransaction(
      prisma,
      'student_academic_records',
      'updateMany',
    );
    const changing = new StudentsService(
      gate.db,
      app.get(StudentEvaluationProgressService),
    ).bulkUpdateClassGroup(
      year,
      students.map((s) => s.profile),
      'D',
    );
    const outcome = changing.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(changing);
      await app
        .get(StudentAcademicRecordsService)
        .update(students[0].placement, { class_group: 'C' });
    } finally {
      gate.release();
    }
    expect(await outcome).toBeInstanceOf(ConflictException);
    expect(
      (
        await prisma.student_academic_records.findUniqueOrThrow({
          where: { id: students[0].placement },
        })
      ).class_group,
    ).toBe('C');
    expect(
      (
        await prisma.student_academic_records.findUniqueOrThrow({
          where: { id: students[1].placement },
        })
      ).class_group,
    ).toBe('B');
    await app
      .get(StudentAcademicRecordsService)
      .update(students[0].placement, { class_group: 'A' });
  });

  it('a reassignment raced against draft saving rolls back the enrollment move and protects the draft', async () => {
    const e = await evaluation();
    const target = await offering(['A', 'B']);
    await prisma.course_offerings.update({
      where: { id: target.id },
      data: {
        course_id: e.assignment.course_id,
        section_code: 'Reassignment target',
      },
    });
    const service = app.get(EnrollmentsService);
    const input = {
      student_id: students[0].account.toString(),
      target_offering_id: target.id.toString(),
    };
    const preview = await service.previewReassignment(e.assignment.id, input);
    const gate = gateTransaction(prisma, 'enrollments', 'delete');
    const moving = new EnrollmentsService(
      gate.db,
      app.get(StudentsService),
    ).confirmReassignment(e.assignment.id, {
      ...input,
      confirmed_enrollment_id: preview.confirmed_enrollment_id,
    });
    const outcome = moving.then(
      () => null,
      (error) => error,
    );
    try {
      await gate.wait(moving);
      await app
        .get(AssessmentDraftsService)
        .save(e.id, students[0].account, answers(e.v1));
    } finally {
      gate.release();
    }
    expect(await outcome).toBeInstanceOf(ConflictException);
    expect(
      await prisma.enrollments.count({
        where: { course_offering_id: target.id },
      }),
    ).toBe(0);
    expect(
      await prisma.enrollments.count({
        where: {
          course_offering_id: e.assignment.id,
          student_id: students[0].account,
        },
      }),
    ).toBe(1);
    expect(
      await prisma.assessment_drafts.count({
        where: { participant_id: e.evaluation_participants[0].id },
      }),
    ).toBe(1);
    await expect(
      service.confirmReassignment(e.assignment.id, {
        ...input,
        confirmed_enrollment_id: preview.confirmed_enrollment_id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('never downgrades unfinished participants or applies a superseded target', async () => {
    const e = await evaluation();
    const v2 = await version(e.set.id, 2);
    await app.get(SurveyVersionsService).applyToUnfinished(e.set.id, v2.id);
    await expect(
      app.get(SurveyVersionsService).applyToUnfinished(e.set.id, e.v1.id),
    ).rejects.toBeInstanceOf(ConflictException);
    await version(e.set.id, 3, false);
    await expect(
      app.get(SurveyVersionsService).applyToUnfinished(e.set.id, v2.id),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await prisma.evaluation_participants.count({
        where: { evaluation_id: e.id, survey_version_id: v2.id },
      }),
    ).toBe(2);
  });

  it('keeps V1/V2 response groups separate and reconciles unavailable legacy results truthfully', async () => {
    const e = await evaluation();
    await app
      .get(SubmissionsService)
      .submit(e.id, students[0].account, answers(e.v1));
    const v2 = await version(e.set.id, 2);
    const applied = await app
      .get(SurveyVersionsService)
      .applyToUnfinished(e.set.id, v2.id);
    expect(applied.updated_participants).toBe(1);
    await app
      .get(SubmissionsService)
      .submit(e.id, students[1].account, answers(v2));
    await app.get(EvaluationsService).close(e.id);
    const results = app.get(ResultsService);
    const grouped = (
      await results.getLecturerResults(lecturer)
    ).evaluations.find((item) => item.evaluation.id === e.id)!;
    expect(grouped.submission_count).toBe(2);
    expect(grouped.unversioned_submission_count).toBe(0);
    expect(
      grouped.version_results.map((group) => ({
        id: group.survey_version_id,
        count: group.submission_count,
      })),
    ).toEqual([
      { id: e.v1.id, count: 1 },
      { id: v2.id, count: 1 },
    ]);
    for (const group of grouped.version_results) {
      const ownIds = (
        group.survey_version_id === e.v1.id ? e.v1 : v2
      ).questions.map((question) => question.id);
      expect(
        group.questions.every((question) =>
          ownIds.includes(question.question_id),
        ),
      ).toBe(true);
    }
    const oldResponse = await prisma.responses.findFirstOrThrow({
      where: { evaluation_id: e.id, survey_version_id: e.v1.id },
    });
    await prisma.responses.update({
      where: { id: oldResponse.id },
      data: { survey_version_id: null },
    });
    const incomplete = (
      await results.getLecturerResults(lecturer)
    ).evaluations.find((item) => item.evaluation.id === e.id)!;
    expect(incomplete.submission_count).toBe(2);
    expect(incomplete.unversioned_submission_count).toBe(1);
    expect(incomplete.version_results).toHaveLength(1);
    expect(
      incomplete.version_results.reduce(
        (total, group) => total + group.submission_count,
        0,
      ) + incomplete.unversioned_submission_count,
    ).toBe(incomplete.submission_count);
    expect(JSON.stringify(incomplete)).not.toMatch(
      /student_id|participant_id|response_id|password_hash/,
    );
  });

  it('historical recovery rolls back the whole batch on stale evidence and preserves ambiguous records', async () => {
    const e = await evaluation();
    for (const s of students)
      await app.get(SubmissionsService).submit(e.id, s.account, answers(e.v1));
    const responses = await prisma.responses.findMany({
      where: { evaluation_id: e.id },
      orderBy: { id: 'asc' },
    });
    await prisma.responses.updateMany({
      where: { evaluation_id: e.id },
      data: { survey_version_id: null },
    });
    const records = [];
    for (const response of responses)
      records.push({
        ...(await historical.inspectRecord(
          prisma,
          'response',
          response.id.toString(),
        )),
        verified_version_id: e.v1.id.toString(),
        verified_by: 'Synthetic verifier',
        evidence_reference: 'Fixture submission',
      });
    records[1].fingerprint = '0'.repeat(64);
    await expect(
      prisma.$transaction(
        (tx) =>
          historical.reconcile(
            tx,
            { schema_version: 1, records },
            { dryRun: false },
          ),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    ).rejects.toThrow('changed after review');
    expect(
      await prisma.responses.count({
        where: { evaluation_id: e.id, survey_version_id: null },
      }),
    ).toBe(2);
    const v2 = await version(e.set.id, 2);
    await prisma.answers.create({
      data: {
        response_id: responses[0].id,
        question_id: v2.questions[0].id,
        rating_value: 4,
        created_at: new Date(),
      },
    });
    const ambiguous = await historical.inspectRecord(
      prisma,
      'response',
      responses[0].id.toString(),
    );
    expect(ambiguous.candidate_version_id).toBeNull();
    expect(ambiguous.issues).toContain('NO_SINGLE_ORIGINAL_VERSION');
  });
});
