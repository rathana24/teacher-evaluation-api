import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Same fix as main.ts — BigInt IDs can't be JSON-serialised by default
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Student Access (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let studentToken: string;
  let lecturerToken: string;

  let tempSurveyId: string;
  let secondarySurveyId: string;
  let versionAId: string;
  let versionBId: string;
  let tempOfferingId: string;
  let ownOfferingId: string;
  let openEvalId: string;
  let closedEvalId: string;
  let otherEvalId: string;

  let courseId: bigint | undefined;
  let semesterId: bigint | undefined;
  let academicYearId: bigint | undefined;
  let generationId: bigint | undefined;
  let studentUserId: bigint;
  let lecturerName: string;

  const fixtureUserIds: bigint[] = [];
  const fixtureReviewIds: string[] = [];

  const stamp = Date.now();
  const testCourseCode = `E2E-SA-${stamp}`;
  const hourAgo = new Date(stamp - 60 * 60 * 1000).toISOString();

  const nextWeek = new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString();

  const admin = () => ({
    Authorization: `Bearer ${adminToken}`,
  });

  const student = () => ({
    Authorization: `Bearer ${studentToken}`,
  });

  const api = () => request(app.getHttpServer());

  async function createOpenEvaluation(offeringId: string, versionId: string) {
    const created = await api().post('/api/evaluations').set(admin()).send({
      course_offering_id: offeringId,
      survey_version_id: versionId,
      start_at: hourAgo,
      end_at: nextWeek,
    });

    expect(created.status).toBe(201);

    const opened = await api()
      .post(`/api/evaluations/${created.body.id}/open`)
      .set(admin());

    expect(opened.status).toBe(200);
    expect(opened.body.status).toBe('OPEN');
    expect(opened.body._count.evaluation_participants).toBe(1);

    return created.body.id as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const login = async (identifier: string): Promise<string> => {
      const res = await api()
        .post('/api/auth/login')
        .send({ identifier, password: 'Password123' });

      expect(res.status).toBe(200);
      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.length).toBeGreaterThan(0);

      return res.body.access_token;
    };

    adminToken = await login('admin@itc.edu.kh');
    lecturerToken = await login('sokdara@itc.edu.kh');

    const adminUser = await prisma.users.findUniqueOrThrow({
      where: { email: 'admin@itc.edu.kh' },
    });
    const lecturer = await prisma.users.findUniqueOrThrow({
      where: { email: 'sokdara@itc.edu.kh' },
    });
    const seedStudent = await prisma.users.findUniqueOrThrow({
      where: { email: 'student1@itc.edu.kh' },
    });
    const department = await prisma.departments.findUniqueOrThrow({
      where: { code: 'AMS' },
    });

    lecturerName = lecturer.full_name;

    const fixtures = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const year = await tx.academic_years.create({
        data: {
          name: `SA-${stamp}`,
          start_year: 2026,
          is_active: false,
        },
      });

      const semester = await tx.semesters.create({
        data: {
          academic_year_id: year.id,
          semester_name: 'Student Access E2E',
          semester_number: 2,
          created_at: now,
          updated_at: now,
        },
      });

      const course = await tx.courses.create({
        data: {
          course_code: testCourseCode,
          course_name: 'Student Access E2E Course',
          department_id: department.id,
          created_at: now,
          updated_at: now,
        },
      });

      const generation = await tx.student_generations.create({
        data: {
          name: `E2E-SA-${stamp}`,
          entry_academic_year_id: year.id,
          starting_year_level: 1,
        },
      });

      const userIds: bigint[] = [];
      const offeringIds: string[] = [];

      for (let index = 0; index < 2; index++) {
        const user = await tx.users.create({
          data: {
            email: `access-${stamp}-${index}@example.test`,
            full_name: `Access E2E Student ${index}`,
            password_hash: seedStudent.password_hash,
            role: 'STUDENT',
            status: 'ACTIVE',
            created_at: now,
            updated_at: now,
          },
        });
        userIds.push(user.id);

        await tx.students.create({
          data: {
            user_id: user.id,
            student_code: `E2E-SA-${stamp}-${index}`,
            generation_id: generation.id,
            student_academic_records: {
              create: {
                academic_year_id: year.id,
                year_level: 1,
                major_id: (
                  await tx.majors.findFirstOrThrow({
                    where: { department_id: department.id },
                  })
                ).id,
                class_group: 'TEST-A',
              },
            },
          },
        });

        const offering = await tx.course_offerings.create({
          data: {
            course_id: course.id,
            lecturer_id: lecturer.id,
            semester_id: semester.id,
            class_type: 'COURSE',
            section_code: `SA-${stamp}-${index}`,
            created_at: now,
            updated_at: now,
          },
        });
        offeringIds.push(offering.id.toString());

        await tx.enrollments.create({
          data: {
            course_offering_id: offering.id,
            student_id: user.id,
            enrolled_at: now,
          },
        });
      }

      const survey = await tx.surveys.create({
        data: {
          title: `E2E Student Access ${stamp}`,
          created_by: adminUser.id,
          created_at: now,
          updated_at: now,
        },
      });

      const versionA = await tx.survey_versions.create({
        data: {
          survey_id: survey.id,
          version_no: 1,
          status: 'DRAFT',
          created_by: adminUser.id,
          created_at: now,
        },
      });

      const secondSet = await tx.surveys.create({
        data: {
          title: `E2E Student Access other ${stamp}`,
          created_by: adminUser.id,
          created_at: now,
          updated_at: now,
        },
      });
      secondarySurveyId = secondSet.id.toString();
      const versionB = await tx.survey_versions.create({
        data: {
          survey_id: secondSet.id,
          version_no: 2,
          status: 'DRAFT',
          created_by: adminUser.id,
          created_at: now,
        },
      });

      await tx.questions.createMany({
        data: [
          {
            survey_version_id: versionA.id,
            question_text: 'The lecturer explains clearly.',
            question_text_km: 'គ្រូបង្រៀនពន្យល់បានច្បាស់លាស់។',
            question_type: 'RATING',
            is_required: true,
            min_rating: 1,
            max_rating: 5,
            display_order: 1,
            created_at: now,
            updated_at: now,
          },
          {
            survey_version_id: versionA.id,
            question_text: 'Any comments?',
            question_text_km: null,
            question_type: 'TEXT',
            is_required: false,
            display_order: 2,
            created_at: now,
            updated_at: now,
          },
          {
            survey_version_id: versionB.id,
            question_text: 'Overall rating',
            question_type: 'RATING',
            is_required: true,
            min_rating: 1,
            max_rating: 5,
            display_order: 1,
            created_at: now,
            updated_at: now,
          },
        ],
      });

      return {
        yearId: year.id,
        semesterId: semester.id,
        courseId: course.id,
        generationId: generation.id,
        userIds,
        offeringIds,
        surveyId: survey.id.toString(),
        versionAId: versionA.id.toString(),
        versionBId: versionB.id.toString(),
      };
    });

    academicYearId = fixtures.yearId;
    semesterId = fixtures.semesterId;
    courseId = fixtures.courseId;
    generationId = fixtures.generationId;
    fixtureUserIds.push(...fixtures.userIds);
    studentUserId = fixtures.userIds[0];
    ownOfferingId = fixtures.offeringIds[0];
    tempOfferingId = fixtures.offeringIds[1];
    tempSurveyId = fixtures.surveyId;
    versionAId = fixtures.versionAId;
    versionBId = fixtures.versionBId;

    studentToken = await login(`access-${stamp}-0@example.test`);

    openEvalId = await createOpenEvaluation(ownOfferingId, versionAId);
    closedEvalId = await createOpenEvaluation(ownOfferingId, versionBId);

    const closed = await api()
      .post(`/api/evaluations/${closedEvalId}/close`)
      .set(admin());

    expect(closed.status).toBe(200);
    expect(closed.body.status).toBe('CLOSED');

    otherEvalId = await createOpenEvaluation(tempOfferingId, versionBId);
  }, 60000);

  afterAll(async () => {
    try {
      if (prisma && courseId !== undefined) {
        await prisma.$transaction(async (tx) => {
          await tx.reviewed_operations.deleteMany({
            where: { id: { in: fixtureReviewIds } },
          });
          const versions = await tx.survey_versions.findMany({
            where: {
              survey_id: {
                in: [BigInt(tempSurveyId), BigInt(secondarySurveyId)],
              },
            },
            select: { id: true },
          });
          const versionIds = versions.map((version) => version.id);

          const evaluations = await tx.evaluations.findMany({
            where: { survey_version_id: { in: versionIds } },
            select: { id: true },
          });
          const evaluationIds = evaluations.map((evaluation) => evaluation.id);

          await tx.evaluation_participants.deleteMany({
            where: { evaluation_id: { in: evaluationIds } },
          });
          await tx.evaluation_generation_targets.deleteMany({
            where: { evaluation_id: { in: evaluationIds } },
          });
          await tx.evaluation_group_targets.deleteMany({
            where: { evaluation_id: { in: evaluationIds } },
          });
          await tx.evaluations.deleteMany({
            where: { id: { in: evaluationIds } },
          });
          await tx.question_options.deleteMany({
            where: {
              questions: { survey_version_id: { in: versionIds } },
            },
          });
          await tx.questions.deleteMany({
            where: { survey_version_id: { in: versionIds } },
          });
          await tx.survey_versions.deleteMany({
            where: { id: { in: versionIds } },
          });
          await tx.surveys.deleteMany({
            where: {
              id: { in: [BigInt(tempSurveyId), BigInt(secondarySurveyId)] },
            },
          });

          const offerings = await tx.course_offerings.findMany({
            where: { course_id: courseId! },
            select: { id: true },
          });
          const offeringIds = offerings.map((offering) => offering.id);

          await tx.enrollments.deleteMany({
            where: { course_offering_id: { in: offeringIds } },
          });
          await tx.course_offerings.deleteMany({
            where: { id: { in: offeringIds } },
          });
          await tx.courses.delete({ where: { id: courseId! } });
          await tx.student_academic_records.deleteMany({
            where: { academic_year_id: academicYearId },
          });
          await tx.students.deleteMany({
            where: { user_id: { in: fixtureUserIds } },
          });
          await tx.users.deleteMany({
            where: { id: { in: fixtureUserIds } },
          });
          await tx.student_generations.delete({
            where: { id: generationId! },
          });
          await tx.semesters.delete({ where: { id: semesterId! } });
          await tx.academic_years.delete({
            where: { id: academicYearId! },
          });
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  describe('access control', () => {
    it('ADMIN is blocked from student routes -> 403', async () => {
      const res = await api().get('/api/student/evaluations').set(admin());

      expect(res.status).toBe(403);
    });

    it('LECTURER is blocked from student routes -> 403', async () => {
      const res = await api()
        .get('/api/student/evaluations')
        .set('Authorization', `Bearer ${lecturerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/student/evaluations', () => {
    it('shows an open evaluation I am part of, without internal ids -> 200', async () => {
      const res = await api().get('/api/student/evaluations').set(student());

      const mine = res.body.find((e: any) => e.id === openEvalId);

      expect(res.status).toBe(200);
      expect(mine).toBeDefined();

      expect(mine.course.code).toBe(testCourseCode);

      expect(mine.lecturer.full_name).toBe(lecturerName);

      expect(mine).not.toHaveProperty('course_offering_id');

      expect(mine).not.toHaveProperty('survey_version_id');
    });

    it('does not show a CLOSED evaluation', async () => {
      const res = await api().get('/api/student/evaluations').set(student());

      expect(res.body.some((e: any) => e.id === closedEvalId)).toBe(false);
    });

    it('does not show an evaluation for a class I am not in', async () => {
      const res = await api().get('/api/student/evaluations').set(student());

      expect(res.body.some((e: any) => e.id === otherEvalId)).toBe(false);
    });
  });

  describe('current answerability', () => {
    const historyItem = async () => {
      const response = await api()
        .get('/api/student/evaluations/history')
        .set(student());
      expect(response.status).toBe(200);
      return response.body.find((row: any) => row.id === openEvalId);
    };

    const participantSnapshot = () =>
      prisma.evaluation_participants.findUniqueOrThrow({
        where: {
          evaluation_id_student_id: {
            evaluation_id: BigInt(openEvalId),
            student_id: studentUserId,
          },
        },
      });

    it('eligible history, available and survey summaries agree', async () => {
      const before = await participantSnapshot();
      const available = await api()
        .get('/api/student/evaluations')
        .set(student());
      const survey = await api()
        .get(`/api/student/evaluations/${openEvalId}/survey`)
        .set(student());
      expect([available.status, survey.status]).toEqual([200, 200]);
      for (const row of [
        await historyItem(),
        available.body.find((row: any) => row.id === openEvalId),
        survey.body.evaluation,
      ]) {
        expect(row).toMatchObject({
          answerable: true,
          answerability_reason: null,
        });
        expect(row).not.toHaveProperty('student_id');
        expect(row).not.toHaveProperty('participant_id');
      }
      const history = await api()
        .get('/api/student/evaluations/history')
        .set(student());
      expect(
        history.body.find((row: any) => row.id === closedEvalId),
      ).toMatchObject({
        answerable: false,
        answerability_reason: 'EVALUATION_NOT_OPEN',
        history_status: 'Closed',
      });
      expect(history.body.some((row: any) => row.id === otherEvalId)).toBe(
        false,
      );
      expect(await participantSnapshot()).toEqual(before);
    });

    it.each([
      'PAUSED',
      'MISSING_YEARLY_GROUP',
      'PROGRESSION_CHRONOLOGY_UNAVAILABLE',
    ])(
      '%s remains in history but agrees with survey/draft denial',
      async (reason) => {
        const profile = await prisma.students.findUniqueOrThrow({
          where: { user_id: studentUserId },
        });
        const record = await prisma.student_academic_records.findFirstOrThrow({
          where: { student_id: profile.id, academic_year_id: academicYearId! },
        });
        const year = await prisma.academic_years.findUniqueOrThrow({
          where: { id: academicYearId! },
        });
        const participant = await participantSnapshot();
        const ratingQuestion = await prisma.questions.findFirstOrThrow({
          where: {
            survey_version_id: BigInt(versionAId),
            question_type: 'RATING',
          },
        });
        const saved = await api()
          .put(`/api/student/evaluations/${openEvalId}/draft`)
          .set(student())
          .send({ answers: [] });
        expect(saved.status).toBe(200);
        const draft = await prisma.assessment_drafts.findUniqueOrThrow({
          where: { participant_id: participant.id },
        });
        try {
          await prisma.student_academic_records.update({
            where: { id: record.id },
            data: {
              progression_action:
                reason === 'PAUSED'
                  ? 'PAUSE'
                  : reason === 'PROGRESSION_CHRONOLOGY_UNAVAILABLE'
                    ? 'REPEAT'
                    : 'NORMAL',
              class_group:
                reason === 'MISSING_YEARLY_GROUP' ? null : record.class_group,
            },
          });
          if (reason === 'PROGRESSION_CHRONOLOGY_UNAVAILABLE')
            await prisma.academic_years.update({
              where: { id: year.id },
              data: { start_year: null },
            });
          const row = await historyItem();
          expect(row).toMatchObject({
            answerable: false,
            answerability_reason: reason,
            history_status: 'Not Started',
          });
          const available = await api()
            .get('/api/student/evaluations')
            .set(student());
          expect(available.status).toBe(200);
          expect(
            available.body.some((item: any) => item.id === openEvalId),
          ).toBe(false);
          expect(
            (
              await api()
                .get(`/api/student/evaluations/${openEvalId}/survey`)
                .set(student())
            ).status,
          ).toBe(403);
          expect(
            (
              await api()
                .put(`/api/student/evaluations/${openEvalId}/draft`)
                .set(student())
                .send({ answers: [] })
            ).status,
          ).toBe(403);
          expect(
            (
              await api()
                .post(`/api/student/evaluations/${openEvalId}/responses`)
                .set(student())
                .send({
                  answers: [
                    {
                      question_id: ratingQuestion.id.toString(),
                      rating_value: 5,
                    },
                  ],
                })
            ).status,
          ).toBe(403);
          expect(await participantSnapshot()).toEqual(participant);
          expect(
            await prisma.assessment_drafts.findUniqueOrThrow({
              where: { id: draft.id },
            }),
          ).toEqual(draft);
        } finally {
          await prisma.academic_years.update({
            where: { id: year.id },
            data: { start_year: year.start_year },
          });
          await prisma.student_academic_records.update({
            where: { id: record.id },
            data: {
              progression_action: record.progression_action,
              class_group: record.class_group,
            },
          });
          await prisma.assessment_drafts.delete({ where: { id: draft.id } });
        }
      },
    );

    it('a later NORMAL group cannot clear PAUSE, while explicit RESUME restores access without repinning', async () => {
      const profile = await prisma.students.findUniqueOrThrow({
        where: { user_id: studentUserId },
      });
      const record = await prisma.student_academic_records.findFirstOrThrow({
        where: { student_id: profile.id, academic_year_id: academicYearId! },
      });
      const generation = await prisma.student_generations.findUniqueOrThrow({
        where: { id: generationId! },
      });
      const prior = await prisma.academic_years.create({
        data: { name: `SA-P-${stamp}`, start_year: 2025, is_active: false },
      });
      const participant = await participantSnapshot();
      try {
        await prisma.student_generations.update({
          where: { id: generation.id },
          data: { entry_academic_year_id: prior.id },
        });
        await prisma.student_academic_records.create({
          data: {
            student_id: profile.id,
            academic_year_id: prior.id,
            year_level: 1,
            major_id: record.major_id,
            class_group: record.class_group,
            progression_action: 'PAUSE',
          },
        });
        expect(await historyItem()).toMatchObject({
          answerable: false,
          answerability_reason: 'PAUSED',
          history_status: 'Not Started',
        });
        expect(
          (
            await api()
              .get(`/api/student/evaluations/${openEvalId}/survey`)
              .set(student())
          ).status,
        ).toBe(403);
        await prisma.student_academic_records.update({
          where: { id: record.id },
          data: { progression_action: 'RESUME' },
        });
        expect(await historyItem()).toMatchObject({
          answerable: true,
          answerability_reason: null,
        });
        expect(
          (
            await api()
              .get(`/api/student/evaluations/${openEvalId}/survey`)
              .set(student())
          ).status,
        ).toBe(200);
        expect(await participantSnapshot()).toEqual(participant);
      } finally {
        await prisma.student_academic_records.update({
          where: { id: record.id },
          data: { progression_action: record.progression_action },
        });
        await prisma.student_academic_records.deleteMany({
          where: { student_id: profile.id, academic_year_id: prior.id },
        });
        await prisma.student_generations.update({
          where: { id: generation.id },
          data: { entry_academic_year_id: generation.entry_academic_year_id },
        });
        await prisma.academic_years.delete({ where: { id: prior.id } });
      }
    });

    const lifecycleCases = [
      ...['DRAFT', 'CLOSED'].map((status) => ({
        name: status,
        status,
        reason: 'EVALUATION_NOT_OPEN',
        start: hourAgo,
        end: nextWeek,
        history: 'Closed',
      })),
      {
        name: 'future',
        status: 'OPEN',
        reason: 'EVALUATION_NOT_STARTED',
        start: new Date(stamp + 3_600_000).toISOString(),
        end: nextWeek,
        history: 'Upcoming',
      },
      {
        name: 'ended',
        status: 'OPEN',
        reason: 'EVALUATION_ENDED',
        start: new Date(stamp - 7_200_000).toISOString(),
        end: hourAgo,
        history: 'Closed',
      },
      {
        name: 'no start',
        status: 'OPEN',
        reason: 'EVALUATION_UNSCHEDULED',
        start: null,
        end: nextWeek,
        history: 'Closed',
      },
      {
        name: 'no end',
        status: 'OPEN',
        reason: 'EVALUATION_UNSCHEDULED',
        start: hourAgo,
        end: null,
        history: 'Closed',
      },
    ];
    it.each(lifecycleCases)(
      '$name history agrees with lifecycle denial',
      async (item) => {
        const evaluation = await prisma.evaluations.findUniqueOrThrow({
          where: { id: BigInt(openEvalId) },
        });
        const participant = await participantSnapshot();
        try {
          await prisma.evaluations.update({
            where: { id: evaluation.id },
            data: {
              status: item.status as typeof evaluation.status,
              start_at: item.start ? new Date(item.start) : null,
              end_at: item.end ? new Date(item.end) : null,
            },
          });
          expect(await historyItem()).toMatchObject({
            answerable: false,
            answerability_reason: item.reason,
            history_status: item.history,
          });
          const survey = await api()
            .get(`/api/student/evaluations/${openEvalId}/survey`)
            .set(student());
          expect(survey.status).toBe(409);
          expect(survey.body.message).toBe('This evaluation is not open');
          const available = await api()
            .get('/api/student/evaluations')
            .set(student());
          expect(available.status).toBe(200);
          expect(available.body.some((row: any) => row.id === openEvalId)).toBe(
            false,
          );
          expect(await participantSnapshot()).toEqual(participant);
        } finally {
          await prisma.evaluations.update({
            where: { id: evaluation.id },
            data: {
              status: evaluation.status,
              start_at: evaluation.start_at,
              end_at: evaluation.end_at,
            },
          });
        }
      },
    );

    it('completed history reports false while preserving submission timestamp and pinned version', async () => {
      const participant = await participantSnapshot();
      const submittedAt = new Date();
      try {
        await prisma.evaluation_participants.update({
          where: { id: participant.id },
          data: { has_submitted: true, submitted_at: submittedAt },
        });
        expect(await historyItem()).toMatchObject({
          answerable: false,
          answerability_reason: 'ALREADY_SUBMITTED',
          history_status: 'Completed',
          has_submitted: true,
          submitted_at: submittedAt.toISOString(),
          survey: { version_no: 1 },
        });
        expect(
          (
            await api()
              .get(`/api/student/evaluations/${openEvalId}/survey`)
              .set(student())
          ).status,
        ).toBe(409);
        expect((await participantSnapshot()).survey_version_id).toBe(
          participant.survey_version_id,
        );
      } finally {
        await prisma.evaluation_participants.update({
          where: { id: participant.id },
          data: {
            has_submitted: participant.has_submitted,
            submitted_at: participant.submitted_at,
          },
        });
      }
    });

    it('removed enrollment retains the existing history scope and survey permission', async () => {
      const enrollment = await prisma.enrollments.findFirstOrThrow({
        where: {
          student_id: studentUserId,
          course_offering_id: BigInt(ownOfferingId),
        },
      });
      const participant = await participantSnapshot();
      try {
        await prisma.enrollments.delete({ where: { id: enrollment.id } });
        expect(await historyItem()).toBeUndefined();
        expect(
          (
            await api()
              .get(`/api/student/evaluations/${openEvalId}/survey`)
              .set(student())
          ).status,
        ).toBe(403);
        expect(await participantSnapshot()).toEqual(participant);
      } finally {
        await prisma.enrollments.create({ data: enrollment });
      }
    });

    it('disabled accounts are rejected by JWT before history or survey data is exposed', async () => {
      const account = await prisma.users.findUniqueOrThrow({
        where: { id: studentUserId },
      });
      try {
        await prisma.users.update({
          where: { id: account.id },
          data: { status: 'INACTIVE' },
        });
        expect(
          (await api().get('/api/student/evaluations/history').set(student()))
            .status,
        ).toBe(401);
        expect(
          (
            await api()
              .get(`/api/student/evaluations/${openEvalId}/survey`)
              .set(student())
          ).status,
        ).toBe(401);
      } finally {
        await prisma.users.update({
          where: { id: account.id },
          data: { status: account.status },
        });
      }
    });
  });

  describe('student academic display metadata', () => {
    it('all three student reads expose stored COURSE/TD/TP and typed academic context without rewriting history', async () => {
      const offering = await prisma.course_offerings.findUniqueOrThrow({
        where: { id: BigInt(ownOfferingId) },
      });
      const evaluationBefore = await prisma.evaluations.findUniqueOrThrow({
        where: { id: BigInt(openEvalId) },
      });
      const participantsBefore = await prisma.evaluation_participants.findMany({
        where: { evaluation_id: BigInt(openEvalId) },
        orderBy: { id: 'asc' },
      });
      const questionsBefore = await prisma.questions.findMany({
        where: { survey_version_id: BigInt(versionAId) },
        orderBy: { id: 'asc' },
      });
      try {
        for (const classType of ['COURSE', 'TD', 'TP'] as const) {
          await prisma.course_offerings.update({
            where: { id: offering.id },
            data: { class_type: classType },
          });
          const available = await api()
            .get('/api/student/evaluations')
            .set(student());
          const history = await api()
            .get('/api/student/evaluations/history')
            .set(student());
          const survey = await api()
            .get(`/api/student/evaluations/${openEvalId}/survey`)
            .set(student());
          expect([available.status, history.status, survey.status]).toEqual([
            200, 200, 200,
          ]);
          for (const item of [
            available.body.find((row: any) => row.id === openEvalId),
            history.body.find((row: any) => row.id === openEvalId),
            survey.body.evaluation,
          ]) {
            expect(item.class_type).toBe(classType);
            expect(item.semester).toEqual({
              name: 'Student Access E2E',
              semester_number: 2,
              academic_year_id: academicYearId!.toString(),
              academic_year: `SA-${stamp}`,
              start_year: 2026,
              is_active: false,
            });
            expect(item.course.code).toBe(testCourseCode);
            expect(item.survey.version_no).toBe(1);
            expect(item.assigned_survey).toEqual(item.survey);
            expect(item).not.toHaveProperty('student_id');
            expect(item).not.toHaveProperty('participant_id');
            expect(item).not.toHaveProperty('course_offering_id');
          }
        }
        expect(
          await prisma.evaluations.findUniqueOrThrow({
            where: { id: BigInt(openEvalId) },
          }),
        ).toEqual(evaluationBefore);
        expect(
          await prisma.evaluation_participants.findMany({
            where: { evaluation_id: BigInt(openEvalId) },
            orderBy: { id: 'asc' },
          }),
        ).toEqual(participantsBefore);
        expect(
          await prisma.questions.findMany({
            where: { survey_version_id: BigInt(versionAId) },
            orderBy: { id: 'asc' },
          }),
        ).toEqual(questionsBefore);
      } finally {
        await prisma.course_offerings.update({
          where: { id: offering.id },
          data: { class_type: offering.class_type },
        });
      }
    });

    it('history retains legacy null metadata instead of guessing from labels', async () => {
      const offering = await prisma.course_offerings.findUniqueOrThrow({
        where: { id: BigInt(ownOfferingId) },
      });
      const semester = await prisma.semesters.findUniqueOrThrow({
        where: { id: semesterId! },
      });
      const year = await prisma.academic_years.findUniqueOrThrow({
        where: { id: academicYearId! },
      });
      const participantBefore =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: {
            evaluation_id_student_id: {
              evaluation_id: BigInt(openEvalId),
              student_id: studentUserId,
            },
          },
        });
      try {
        await prisma.course_offerings.update({
          where: { id: offering.id },
          data: { class_type: null },
        });
        await prisma.semesters.update({
          where: { id: semester.id },
          data: { semester_name: 'Semester 1', semester_number: null },
        });
        await prisma.academic_years.update({
          where: { id: year.id },
          data: { start_year: null },
        });
        const history = await api()
          .get('/api/student/evaluations/history')
          .set(student());
        expect(history.status).toBe(200);
        const item = history.body.find((row: any) => row.id === openEvalId);
        expect(item.class_type).toBeNull();
        expect(item.semester).toEqual({
          name: 'Semester 1',
          semester_number: null,
          academic_year_id: academicYearId!.toString(),
          academic_year: year.name,
          start_year: null,
          is_active: false,
        });
        expect(item.has_submitted).toBe(false);
        expect(item.submitted_at).toBeNull();
        expect(item.history_status).toBe('Not Started');
        expect(item.survey.version_no).toBe(1);
        expect(
          await prisma.evaluation_participants.findUniqueOrThrow({
            where: { id: participantBefore.id },
          }),
        ).toEqual(participantBefore);
      } finally {
        await prisma.academic_years.update({
          where: { id: year.id },
          data: { start_year: year.start_year },
        });
        await prisma.semesters.update({
          where: { id: semester.id },
          data: {
            semester_name: semester.semester_name,
            semester_number: semester.semester_number,
          },
        });
        await prisma.course_offerings.update({
          where: { id: offering.id },
          data: { class_type: offering.class_type },
        });
      }
    });
  });

  describe('GET /api/student/evaluations/:id/survey', () => {
    it('returns the questions in order, with only student-facing fields -> 200', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${openEvalId}/survey`)
        .set(student());

      expect(res.status).toBe(200);

      expect(res.body.evaluation.course.code).toBe(testCourseCode);
      expect(res.body.evaluation.survey).toEqual({
        title: `E2E Student Access ${stamp}`,
        version_no: 1,
      });
      expect(res.body.evaluation.assigned_survey).toEqual(
        res.body.evaluation.survey,
      );

      expect(res.body.questions.map((q: any) => q.display_order)).toEqual([
        1, 2,
      ]);

      expect(res.body.questions[0]).not.toHaveProperty('created_at');
    });

    it('returns English and Khmer question text to the student -> 200', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${openEvalId}/survey`)
        .set(student());

      expect(res.status).toBe(200);

      const question = res.body.questions[0];

      expect(question.question_text).toBe('The lecturer explains clearly.');

      expect(question.question_text_km).toBe('គ្រូបង្រៀនពន្យល់បានច្បាស់លាស់។');
    });

    it('returns null Khmer text when translation is not provided -> 200', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${openEvalId}/survey`)
        .set(student());

      expect(res.status).toBe(200);

      const question = res.body.questions[1];

      expect(question.question_text).toBe('Any comments?');

      expect(question.question_text_km).toBeNull();
    });

    it('a reviewed V1-to-V2 update returns matching questions and labels in survey, available list and history', async () => {
      const participant =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: {
            evaluation_id_student_id: {
              evaluation_id: BigInt(openEvalId),
              student_id: studentUserId,
            },
          },
        });
      try {
        const version = await api()
          .post(`/api/surveys/${tempSurveyId}/versions`)
          .set(admin())
          .send({ copy_questions: false });
        expect(version.status).toBe(201);
        expect(version.body.version_no).toBe(2);

        const question = await api()
          .post(`/api/survey-versions/${version.body.id}/questions`)
          .set(admin())
          .send({
            question_text: 'Updated V2 student access question',
            question_type: 'RATING',
            is_required: true,
          });
        expect(question.status).toBe(201);

        const applicationPath = `/api/surveys/${tempSurveyId}/versions/${version.body.id}/apply-to-unfinished`;
        const preview = await api()
          .post(`${applicationPath}/preview`)
          .set(admin())
          .send({});
        expect(preview.status).toBe(200);
        fixtureReviewIds.push(preview.body.review_id);
        expect(preview.body.proposed_moved_participants).toBe(1);
        const confirmed = await api()
          .post(`${applicationPath}/confirm`)
          .set(admin())
          .send({ review_id: preview.body.review_id });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.moved_participants).toBe(1);

        const evaluationBefore = await prisma.evaluations.findUniqueOrThrow({
          where: { id: BigInt(openEvalId) },
        });
        const participantBefore =
          await prisma.evaluation_participants.findUniqueOrThrow({
            where: { id: participant.id },
          });
        const baseQuestionsBefore = await prisma.questions.findMany({
          where: { survey_version_id: BigInt(versionAId) },
          orderBy: { id: 'asc' },
        });
        expect(evaluationBefore.survey_version_id.toString()).toBe(versionAId);
        expect(participantBefore.survey_version_id?.toString()).toBe(
          version.body.id,
        );

        const survey = await api()
          .get(`/api/student/evaluations/${openEvalId}/survey`)
          .set(student());
        const available = await api()
          .get('/api/student/evaluations')
          .set(student());
        const history = await api()
          .get('/api/student/evaluations/history')
          .set(student());
        expect(survey.status).toBe(200);
        expect(available.status).toBe(200);
        expect(history.status).toBe(200);
        const effective = {
          title: `E2E Student Access ${stamp}`,
          version_no: 2,
        };
        const assigned = { ...effective, version_no: 1 };
        expect(survey.body.survey_version_id).toBe(version.body.id);
        expect(survey.body.evaluation.survey).toEqual(effective);
        expect(survey.body.evaluation.assigned_survey).toEqual(assigned);
        expect(survey.body.questions.map((row: any) => row.id)).toEqual([
          question.body.id,
        ]);
        expect(survey.body.questions[0].question_text).toBe(
          'Updated V2 student access question',
        );
        for (const rows of [available.body, history.body]) {
          const item = rows.find((row: any) => row.id === openEvalId);
          expect(item.survey).toEqual(effective);
          expect(item.assigned_survey).toEqual(assigned);
          expect(item).not.toHaveProperty('survey_version_id');
          expect(item).not.toHaveProperty('student_id');
          expect(item).not.toHaveProperty('participant_id');
        }

        expect(
          await prisma.evaluations.findUniqueOrThrow({
            where: { id: BigInt(openEvalId) },
          }),
        ).toEqual(evaluationBefore);
        expect(
          await prisma.evaluation_participants.findUniqueOrThrow({
            where: { id: participant.id },
          }),
        ).toEqual(participantBefore);
        expect(
          await prisma.questions.findMany({
            where: { survey_version_id: BigInt(versionAId) },
            orderBy: { id: 'asc' },
          }),
        ).toEqual(baseQuestionsBefore);
      } finally {
        // Restore only this suite's owned synthetic assignment for its later tests.
        await prisma.evaluation_participants.update({
          where: { id: participant.id },
          data: { survey_version_id: participant.survey_version_id },
        });
      }
    }, 20000);

    it('a legacy null pin keeps V1 questions and metadata even when V2 exists', async () => {
      const participant =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: {
            evaluation_id_student_id: {
              evaluation_id: BigInt(openEvalId),
              student_id: studentUserId,
            },
          },
        });
      try {
        await prisma.evaluation_participants.update({
          where: { id: participant.id },
          data: { survey_version_id: null },
        });
        const survey = await api()
          .get(`/api/student/evaluations/${openEvalId}/survey`)
          .set(student());
        const available = await api()
          .get('/api/student/evaluations')
          .set(student());
        const history = await api()
          .get('/api/student/evaluations/history')
          .set(student());
        expect(survey.status).toBe(200);
        expect(available.status).toBe(200);
        expect(history.status).toBe(200);
        const assigned = {
          title: `E2E Student Access ${stamp}`,
          version_no: 1,
        };
        expect(survey.body.survey_version_id).toBe(versionAId);
        expect(survey.body.participant_survey_version_id).toBeNull();
        expect(survey.body.evaluation.survey).toEqual(assigned);
        expect(survey.body.evaluation.assigned_survey).toEqual(assigned);
        expect(
          survey.body.questions.map((row: any) => row.question_text),
        ).toEqual(['The lecturer explains clearly.', 'Any comments?']);
        for (const rows of [available.body, history.body]) {
          const item = rows.find((row: any) => row.id === openEvalId);
          expect(item.survey).toEqual(assigned);
          expect(item.assigned_survey).toEqual(assigned);
        }
      } finally {
        await prisma.evaluation_participants.update({
          where: { id: participant.id },
          data: { survey_version_id: participant.survey_version_id },
        });
      }
    });

    it('CLOSED evaluation -> 409', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${closedEvalId}/survey`)
        .set(student());

      expect(res.status).toBe(409);
    });

    it('evaluation for a class I am not in -> 403', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${otherEvalId}/survey`)
        .set(student());

      expect(res.status).toBe(403);
    });

    it('evaluation that does not exist -> 404', async () => {
      const res = await api()
        .get('/api/student/evaluations/999999/survey')
        .set(student());

      expect(res.status).toBe(404);
    });

    it('non-numeric id -> 400', async () => {
      const res = await api()
        .get('/api/student/evaluations/abc/survey')
        .set(student());

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/student/evaluations/:id/submission-status', () => {
    it('not submitted yet -> 200', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${openEvalId}/submission-status`)
        .set(student());

      expect(res.status).toBe(200);

      expect(res.body.has_submitted).toBe(false);
    });

    it('evaluation I am not part of -> 403', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${otherEvalId}/submission-status`)
        .set(student());

      expect(res.status).toBe(403);
    });
  });

  describe('after submitting', () => {
    beforeAll(async () => {
      // Simulate participant state only; submission persistence is tested separately.
      const updated = await prisma.evaluation_participants.updateMany({
        where: {
          evaluation_id: BigInt(openEvalId),
          student_id: studentUserId,
        },
        data: {
          has_submitted: true,
          submitted_at: new Date(),
        },
      });

      expect(updated.count).toBe(1);
    });

    it('status shows submitted -> 200', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${openEvalId}/submission-status`)
        .set(student());

      expect(res.status).toBe(200);

      expect(res.body.has_submitted).toBe(true);

      expect(res.body.submitted_at).not.toBeNull();
    });

    it('survey can no longer be opened -> 409', async () => {
      const res = await api()
        .get(`/api/student/evaluations/${openEvalId}/survey`)
        .set(student());

      expect(res.status).toBe(409);
    });

    it('it disappears from my available list', async () => {
      const res = await api().get('/api/student/evaluations').set(student());

      expect(res.body.some((e: any) => e.id === openEvalId)).toBe(false);
    });
  });
});
