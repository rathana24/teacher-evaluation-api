import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Same fix as main.ts — BigInt IDs cannot be JSON-serialized by default.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Assessment Drafts (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let lecturerToken: string;
  let student1Token: string;
  let student2Token: string;

  let surveyId: string;
  let versionId: string;
  let evaluationId: string;
  let offeringId: string;

  let courseId: bigint | undefined;
  let semesterId: bigint | undefined;
  let academicYearId: bigint | undefined;
  let generationId: bigint | undefined;

  const fixtureUserIds: bigint[] = [];

  let qRating: string;
  let qText: string;
  let qAgreement: string;
  let qFrequency: string;
  let qMultipleChoice: string;
  let qCheckbox: string;

  let mcOption1: string;
  let mcOption2: string;

  let checkboxOption1: string;
  let checkboxOption2: string;

  const stamp = Date.now();

  const hourAgo = new Date(
    stamp - 60 * 60 * 1000,
  ).toISOString();

  const nextWeek = new Date(
    stamp + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const api = () => request(app.getHttpServer());

  const as = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const admin = () => ({
    Authorization: `Bearer ${adminToken}`,
  });

  const saveDraft = (
    token: string,
    answers: unknown[],
  ) =>
    api()
      .put(
        `/api/student/evaluations/${evaluationId}/draft`,
      )
      .set(as(token))
      .send({ answers });

  const getDraft = (token: string) =>
    api()
      .get(
        `/api/student/evaluations/${evaluationId}/draft`,
      )
      .set(as(token));

  const deleteDraft = (token: string) =>
    api()
      .delete(
        `/api/student/evaluations/${evaluationId}/draft`,
      )
      .set(as(token));

  const submit = (
    token: string,
    answers: unknown[],
  ) =>
    api()
      .post(
        `/api/student/evaluations/${evaluationId}/responses`,
      )
      .set(as(token))
      .send({ answers });

  async function addQuestion(
    body: Record<string, unknown>,
  ) {
    return api()
      .post(
        `/api/survey-versions/${versionId}/questions`,
      )
      .set(admin())
      .send(body);
  }

  const completeAnswers = () => [
    {
      question_id: qRating,
      rating_value: 5,
    },
    {
      question_id: qText,
      text_value: 'Clear explanation',
    },
    {
      question_id: qAgreement,
      rating_value: 4,
    },
    {
      question_id: qFrequency,
      rating_value: 3,
    },
    {
      question_id: qMultipleChoice,
      selected_option_ids: [mcOption1],
    },
    {
      question_id: qCheckbox,
      selected_option_ids: [
        checkboxOption1,
        checkboxOption2,
      ],
    },
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
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

    const lecturer = await prisma.users.findUniqueOrThrow({
      where: { email: 'sokdara@itc.edu.kh' },
    });
    const seedStudent = await prisma.users.findUniqueOrThrow({
      where: { email: 'student1@itc.edu.kh' },
    });
    const department = await prisma.departments.findUniqueOrThrow({
      where: { code: 'AMS' },
    });

    const fixtures = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const year = await tx.academic_years.create({
        data: {
          name: `DR-${stamp}`,
          start_year: 2026,
          is_active: false,
        },
      });

      const semester = await tx.semesters.create({
        data: {
          academic_year_id: year.id,
          semester_name: 'Drafts E2E',
          created_at: now,
          updated_at: now,
        },
      });

      const course = await tx.courses.create({
        data: {
          course_code: `E2E-DR-${stamp}`,
          course_name: 'Drafts E2E Course',
          department_id: department.id,
          created_at: now,
          updated_at: now,
        },
      });

      const generation = await tx.student_generations.create({
        data: {
          name: `E2E-DR-${stamp}`,
          entry_academic_year_id: year.id,
          starting_year_level: 1,
        },
      });

      const userIds: bigint[] = [];

      for (let index = 0; index < 2; index++) {
        const user = await tx.users.create({
          data: {
            email: `draft-${stamp}-${index}@example.test`,
            full_name: `Draft E2E Student ${index}`,
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
            student_code: `E2E-DR-${stamp}-${index}`,
            generation_id: generation.id,
          },
        });
      }

      const offering = await tx.course_offerings.create({
        data: {
          course_id: course.id,
          lecturer_id: lecturer.id,
          semester_id: semester.id,
          class_type: 'COURSE',
          section_code: `DRAFT-${stamp}`,
          created_at: now,
          updated_at: now,
        },
      });

      await tx.enrollments.createMany({
        data: userIds.map((userId) => ({
          course_offering_id: offering.id,
          student_id: userId,
          enrolled_at: now,
        })),
      });

      return {
        yearId: year.id,
        semesterId: semester.id,
        courseId: course.id,
        generationId: generation.id,
        userIds,
        offeringId: offering.id.toString(),
      };
    });

    academicYearId = fixtures.yearId;
    semesterId = fixtures.semesterId;
    courseId = fixtures.courseId;
    generationId = fixtures.generationId;
    fixtureUserIds.push(...fixtures.userIds);
    offeringId = fixtures.offeringId;

    student1Token = await login(`draft-${stamp}-0@example.test`);
    student2Token = await login(`draft-${stamp}-1@example.test`);

    // ------------------------------------------------
    // Create survey
    // ------------------------------------------------

    const survey = await api()
      .post('/api/surveys')
      .set(admin())
      .send({
        title: `E2E Assessment Draft ${stamp}`,
      });

    expect(survey.status).toBe(201);

    surveyId = survey.body.id;

    // ------------------------------------------------
    // Create survey version
    // ------------------------------------------------

    const version = await prisma.survey_versions.findFirstOrThrow({
      where: {
        survey_id: BigInt(surveyId),
        version_no: 1,
      },
    });

    versionId = version.id.toString();

    // ------------------------------------------------
    // RATING
    // ------------------------------------------------

    const rating = await addQuestion({
      question_text:
        'How clearly did the lecturer explain?',
      question_type: 'RATING',
      min_rating: 1,
      max_rating: 5,
    });

    expect(rating.status).toBe(201);

    qRating = rating.body.id;

    // ------------------------------------------------
    // TEXT
    // ------------------------------------------------

    const text = await addQuestion({
      question_text:
        'What could be improved?',
      question_type: 'TEXT',
      is_required: false,
    });

    expect(text.status).toBe(201);

    qText = text.body.id;

    // ------------------------------------------------
    // AGREEMENT
    // ------------------------------------------------

    const agreement = await addQuestion({
      question_text:
        'I agree that the lecturer was prepared.',
      question_type: 'AGREEMENT',
    });

    expect(agreement.status).toBe(201);

    qAgreement = agreement.body.id;

    // ------------------------------------------------
    // FREQUENCY
    // ------------------------------------------------

    const frequency = await addQuestion({
      question_text:
        'How often were examples provided?',
      question_type: 'FREQUENCY',
    });

    expect(frequency.status).toBe(201);

    qFrequency = frequency.body.id;

    // ------------------------------------------------
    // MULTIPLE CHOICE
    // ------------------------------------------------

    const multipleChoice = await addQuestion({
      question_text:
        'Which resource was most useful?',
      question_type: 'MULTIPLE_CHOICE',
      options: [
        {
          option_text: 'Lecture slides',
          display_order: 1,
        },
        {
          option_text: 'Exercises',
          display_order: 2,
        },
      ],
    });

    expect(multipleChoice.status).toBe(201);

    qMultipleChoice =
      multipleChoice.body.id;

    mcOption1 =
      multipleChoice.body.question_options[0].id;

    mcOption2 =
      multipleChoice.body.question_options[1].id;

    // ------------------------------------------------
    // CHECKBOX
    // ------------------------------------------------

    const checkbox = await addQuestion({
      question_text:
        'Which activities were useful?',
      question_type: 'CHECKBOX',
      options: [
        {
          option_text: 'Projects',
          display_order: 1,
        },
        {
          option_text: 'Discussions',
          display_order: 2,
        },
      ],
    });

    expect(checkbox.status).toBe(201);

    qCheckbox = checkbox.body.id;

    checkboxOption1 =
      checkbox.body.question_options[0].id;

    checkboxOption2 =
      checkbox.body.question_options[1].id;

    // ------------------------------------------------
    // Create evaluation
    // ------------------------------------------------

    const evaluation = await api()
      .post('/api/evaluations')
      .set(admin())
      .send({
        course_offering_id: offeringId,
        survey_version_id: versionId,
        start_at: hourAgo,
        end_at: nextWeek,
      });

    expect(evaluation.status).toBe(201);

    evaluationId = evaluation.body.id;

    // ------------------------------------------------
    // Open evaluation
    // IMPORTANT:
    // This endpoint returns 200 OK, not 201.
    // ------------------------------------------------

    const opened = await api()
      .post(
        `/api/evaluations/${evaluationId}/open`,
      )
      .set(admin());

    expect(opened.status).toBe(200);
    expect(opened.body.status).toBe('OPEN');
    expect(opened.body._count.evaluation_participants).toBe(2);
  }, 60000);

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.$transaction(async (tx) => {
    if (evaluationId) {
      const evaluationIdBigInt =
        BigInt(evaluationId);

      // ------------------------------------------------
      // Drafts must be removed before participants.
      // ------------------------------------------------

      const participants =
        await tx.evaluation_participants.findMany({
          where: {
            evaluation_id: evaluationIdBigInt,
          },
          select: {
            id: true,
          },
        });

      const participantIds =
        participants.map(
          (participant) => participant.id,
        );

      if (participantIds.length > 0) {
        await tx.assessment_drafts.deleteMany({
          where: {
            participant_id: {
              in: participantIds,
            },
          },
        });
      }

      // ------------------------------------------------
      // Clean responses
      // answer_options -> answers -> responses
      // ------------------------------------------------

      const responseRows =
        await tx.responses.findMany({
          where: {
            evaluation_id: evaluationIdBigInt,
          },
          select: {
            id: true,
          },
        });

      const responseIds =
        responseRows.map(
          (response) => response.id,
        );

      if (responseIds.length > 0) {
        const answerRows =
          await tx.answers.findMany({
            where: {
              response_id: {
                in: responseIds,
              },
            },
            select: {
              id: true,
            },
          });

        const answerIds =
          answerRows.map(
            (answer) => answer.id,
          );

        if (answerIds.length > 0) {
          await tx.answer_options.deleteMany({
            where: {
              answer_id: {
                in: answerIds,
              },
            },
          });
        }

        await tx.answers.deleteMany({
          where: {
            response_id: {
              in: responseIds,
            },
          },
        });
      }

      await tx.responses.deleteMany({
        where: {
          evaluation_id: evaluationIdBigInt,
        },
      });

      await tx.evaluation_participants.deleteMany({
        where: {
          evaluation_id: evaluationIdBigInt,
        },
      });

      await tx.evaluations.deleteMany({
        where: {
          id: evaluationIdBigInt,
        },
      });
    }

    // ------------------------------------------------
    // Clean questions, options, version
    // ------------------------------------------------

    if (versionId) {
      const versionIdBigInt =
        BigInt(versionId);

      await tx.question_options.deleteMany({
        where: {
          questions: {
            survey_version_id:
              versionIdBigInt,
          },
        },
      });

      await tx.questions.deleteMany({
        where: {
          survey_version_id:
            versionIdBigInt,
        },
      });

      await tx.survey_versions.deleteMany({
        where: {
          id: versionIdBigInt,
        },
      });
    }

    // ------------------------------------------------
    // Clean survey
    // ------------------------------------------------

    if (surveyId) {
      await tx.surveys.deleteMany({
        where: {
          id: BigInt(surveyId),
        },
      });
    }

          if (courseId !== undefined) {
            const offerings = await tx.course_offerings.findMany({
              where: { course_id: courseId },
              select: { id: true },
            });
            const offeringIds = offerings.map((offering) => offering.id);

            await tx.enrollments.deleteMany({
              where: { course_offering_id: { in: offeringIds } },
            });
            await tx.course_offerings.deleteMany({
              where: { id: { in: offeringIds } },
            });
            await tx.courses.delete({ where: { id: courseId } });
          }

          if (fixtureUserIds.length > 0) {
            await tx.students.deleteMany({
              where: { user_id: { in: fixtureUserIds } },
            });
            await tx.users.deleteMany({
              where: { id: { in: fixtureUserIds } },
            });
          }
          if (generationId !== undefined) {
            await tx.student_generations.delete({
              where: { id: generationId },
            });
          }
          if (semesterId !== undefined) {
            await tx.semesters.delete({
              where: { id: semesterId },
            });
          }
          if (academicYearId !== undefined) {
            await tx.academic_years.delete({
              where: { id: academicYearId },
            });
          }
        });
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  // ==================================================
  // ACCESS CONTROL
  // ==================================================

  describe('access control', () => {
    it('ADMIN cannot save a draft -> 403', async () => {
      const res = await saveDraft(
        adminToken,
        [],
      );

      expect(res.status).toBe(403);
    });

    it('LECTURER cannot save a draft -> 403', async () => {
      const res = await saveDraft(
        lecturerToken,
        [],
      );

      expect(res.status).toBe(403);
    });
  });

  // ==================================================
  // BASIC DRAFT FLOW
  // ==================================================

  describe('basic draft flow', () => {
    it('student can save an incomplete draft -> 200', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qRating,
            rating_value: 4,
          },
        ],
      );

      expect(res.status).toBe(200);

      expect(res.body.evaluation_id).toBe(
        evaluationId,
      );

      expect(res.body.draft.answers).toEqual([
        {
          question_id: qRating,
          rating_value: 4,
        },
      ]);

      const participant =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: {
            evaluation_id_student_id: {
              evaluation_id: BigInt(evaluationId),
              student_id: fixtureUserIds[0],
            },
          },
        });

      const draft = await prisma.assessment_drafts.findUniqueOrThrow({
        where: { participant_id: participant.id },
      });

      expect(draft.survey_version_id).toBe(BigInt(versionId));
      expect(draft.answers_json).toEqual([
        { question_id: qRating, rating_value: 4 },
      ]);
      expect(participant.has_submitted).toBe(false);
    });

    it('student can load the saved draft -> 200', async () => {
      const res = await getDraft(
        student1Token,
      );

      expect(res.status).toBe(200);

      expect(res.body.draft.answers).toEqual([
        {
          question_id: qRating,
          rating_value: 4,
        },
      ]);
    });

    it('saving again updates the same draft -> 200', async () => {
      const before = await getDraft(
        student1Token,
      );

      expect(before.status).toBe(200);

      const originalDraftId =
        before.body.draft.id;

      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qRating,
            rating_value: 5,
          },
          {
            question_id: qText,
            text_value:
              '  More practical examples  ',
          },
        ],
      );

      expect(res.status).toBe(200);

      expect(res.body.draft.id).toBe(
        originalDraftId,
      );

      expect(res.body.draft.answers).toEqual([
        {
          question_id: qRating,
          rating_value: 5,
        },
        {
          question_id: qText,
          text_value:
            'More practical examples',
        },
      ]);
    });

    it('another student cannot see student1 draft -> 404', async () => {
      const res = await getDraft(
        student2Token,
      );

      expect(res.status).toBe(404);
    });

    it('student2 can create a separate draft -> 200', async () => {
      const res = await saveDraft(
        student2Token,
        [
          {
            question_id: qRating,
            rating_value: 3,
          },
        ],
      );

      expect(res.status).toBe(200);

      expect(res.body.draft.answers).toEqual([
        {
          question_id: qRating,
          rating_value: 3,
        },
      ]);
    });

    it('student2 can delete own draft -> 200', async () => {
      const res = await deleteDraft(
        student2Token,
      );

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it('deleted draft can no longer be loaded -> 404', async () => {
      const res = await getDraft(
        student2Token,
      );

      expect(res.status).toBe(404);
    });

    it('student can save an empty draft -> 200', async () => {
      const res = await saveDraft(
        student2Token,
        [],
      );

      expect(res.status).toBe(200);

      expect(
        res.body.draft.answers,
      ).toEqual([]);
    });
  });

  // ==================================================
  // DRAFT VALIDATION
  // ==================================================

  describe('draft validation', () => {
    let draftBefore: {
      id: bigint;
      survey_version_id: bigint | null;
      answers_json: unknown;
      updated_at: Date;
    };

    beforeEach(async () => {
      const participant =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: {
            evaluation_id_student_id: {
              evaluation_id: BigInt(evaluationId),
              student_id: fixtureUserIds[0],
            },
          },
        });

      draftBefore = await prisma.assessment_drafts.findUniqueOrThrow({
        where: { participant_id: participant.id },
        select: {
          id: true,
          survey_version_id: true,
          answers_json: true,
          updated_at: true,
        },
      });
    });

    afterEach(async () => {
      const participant =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: {
            evaluation_id_student_id: {
              evaluation_id: BigInt(evaluationId),
              student_id: fixtureUserIds[0],
            },
          },
        });

      expect(participant.has_submitted).toBe(false);
      expect(
        await prisma.responses.count({
          where: { evaluation_id: BigInt(evaluationId) },
        }),
      ).toBe(0);
    });

    const expectDraftUnchanged = async () => {
      const unchanged = await prisma.assessment_drafts.findUniqueOrThrow({
        where: { id: draftBefore.id },
        select: {
          id: true,
          survey_version_id: true,
          answers_json: true,
          updated_at: true,
        },
      });

      expect(unchanged).toEqual(draftBefore);
    };

    it('question outside the survey -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: '999999',
            rating_value: 4,
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('same question twice -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qRating,
            rating_value: 4,
          },
          {
            question_id: qRating,
            rating_value: 5,
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('RATING above 5 -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qRating,
            rating_value: 6,
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('RATING rejects text -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qRating,
            text_value: 'Wrong type',
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('TEXT rejects rating_value -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qText,
            rating_value: 3,
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('AGREEMENT accepts a valid numeric draft -> 200', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qAgreement,
            rating_value: 5,
          },
        ],
      );

      expect(res.status).toBe(200);
    });

    it('FREQUENCY accepts a valid numeric draft -> 200', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qFrequency,
            rating_value: 2,
          },
        ],
      );

      expect(res.status).toBe(200);
    });

    // ------------------------------------------------
    // MULTIPLE CHOICE
    // ------------------------------------------------

    it('MULTIPLE_CHOICE accepts one option -> 200', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qMultipleChoice,
            selected_option_ids: [
              mcOption1,
            ],
          },
        ],
      );

      expect(res.status).toBe(200);
    });

    it('MULTIPLE_CHOICE rejects multiple options -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qMultipleChoice,
            selected_option_ids: [
              mcOption1,
              mcOption2,
            ],
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('MULTIPLE_CHOICE rejects option from another question -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qMultipleChoice,
            selected_option_ids: [
              checkboxOption1,
            ],
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    // ------------------------------------------------
    // CHECKBOX
    // ------------------------------------------------

    it('CHECKBOX accepts multiple valid options -> 200', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qCheckbox,
            selected_option_ids: [
              checkboxOption1,
              checkboxOption2,
            ],
          },
        ],
      );

      expect(res.status).toBe(200);
    });

    it('CHECKBOX rejects option from another question -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qCheckbox,
            selected_option_ids: [
              checkboxOption1,
              mcOption1,
            ],
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('CHECKBOX rejects duplicate option IDs -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qCheckbox,
            selected_option_ids: [
              checkboxOption1,
              checkboxOption1,
            ],
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });

    it('non-numeric question_id -> 400', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: 'abc',
            rating_value: 4,
          },
        ],
      );

      expect(res.status).toBe(400);
      await expectDraftUnchanged();
    });
  });

  // ==================================================
  // ALL QUESTION TYPES
  // ==================================================

  describe('all question types', () => {
    it('can save all six question types in one draft -> 200', async () => {
      const res = await saveDraft(
        student1Token,
        completeAnswers(),
      );

      expect(res.status).toBe(200);

      expect(
        res.body.draft.answers,
      ).toHaveLength(6);

      expect(
        res.body.draft.answers,
      ).toEqual(completeAnswers());
    });
  });

  // ==================================================
  // FINAL SUBMISSION
  // ==================================================

  describe('final submission', () => {
    it('successful final submission deletes the saved draft', async () => {
      const saved = await saveDraft(
        student1Token,
        completeAnswers(),
      );

      expect(saved.status).toBe(200);

      const participant =
        await prisma.evaluation_participants.findUnique({
          where: {
            evaluation_id_student_id: {
              evaluation_id:
                BigInt(evaluationId),
                student_id: fixtureUserIds[0],
            },
          },
        });

      expect(participant).not.toBeNull();

      const before =
        await prisma.assessment_drafts.findUnique({
          where: {
            participant_id:
              participant!.id,
          },
        });

      expect(before).not.toBeNull();
      expect(before!.survey_version_id).toBe(BigInt(versionId));

      const submitted = await submit(
        student1Token,
        completeAnswers(),
      );

      expect(submitted.status).toBe(201);

      expect(
        submitted.body.submitted,
      ).toBe(true);

      const after =
        await prisma.assessment_drafts.findUnique({
          where: {
            participant_id:
              participant!.id,
          },
        });

      expect(after).toBeNull();

      const responses = await prisma.responses.findMany({
        where: { evaluation_id: BigInt(evaluationId) },
      });

      expect(responses).toHaveLength(1);
      expect(responses[0].survey_version_id).toBe(BigInt(versionId));

      const updatedParticipant =
        await prisma.evaluation_participants.findUniqueOrThrow({
          where: { id: participant!.id },
        });

      expect(updatedParticipant.has_submitted).toBe(true);
    });

    it('student cannot save another draft after final submission -> 409', async () => {
      const res = await saveDraft(
        student1Token,
        [
          {
            question_id: qRating,
            rating_value: 5,
          },
        ],
      );

      expect(res.status).toBe(409);
    });
  });
});