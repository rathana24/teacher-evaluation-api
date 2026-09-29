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

    const login = (email: string) =>
      api()
        .post('/api/auth/login')
        .send({
          email,
          password: 'Password123',
        })
        .then(
          (res) => res.body.access_token as string,
        );

    adminToken = await login(
      'admin@itc.edu.kh',
    );

    lecturerToken = await login(
      'sokdara@itc.edu.kh',
    );

    student1Token = await login(
      'student1@itc.edu.kh',
    );

    student2Token = await login(
      'student2@itc.edu.kh',
    );

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

    const version = await api()
      .post(
        `/api/surveys/${surveyId}/versions`,
      )
      .set(admin())
      .send({});

    expect(version.status).toBe(201);

    versionId = version.body.id;

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
        course_offering_id: '1',
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
  }, 60000);

  afterAll(async () => {
    if (evaluationId) {
      const evaluationIdBigInt =
        BigInt(evaluationId);

      // ------------------------------------------------
      // Drafts must be removed before participants.
      // ------------------------------------------------

      const participants =
        await prisma.evaluation_participants.findMany({
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
        await prisma.assessment_drafts.deleteMany({
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
        await prisma.responses.findMany({
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
          await prisma.answers.findMany({
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
          await prisma.answer_options.deleteMany({
            where: {
              answer_id: {
                in: answerIds,
              },
            },
          });
        }

        await prisma.answers.deleteMany({
          where: {
            response_id: {
              in: responseIds,
            },
          },
        });
      }

      await prisma.responses.deleteMany({
        where: {
          evaluation_id: evaluationIdBigInt,
        },
      });

      await prisma.evaluation_participants.deleteMany({
        where: {
          evaluation_id: evaluationIdBigInt,
        },
      });

      await prisma.evaluations.deleteMany({
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

      await prisma.question_options.deleteMany({
        where: {
          questions: {
            survey_version_id:
              versionIdBigInt,
          },
        },
      });

      await prisma.questions.deleteMany({
        where: {
          survey_version_id:
            versionIdBigInt,
        },
      });

      await prisma.survey_versions.deleteMany({
        where: {
          id: versionIdBigInt,
        },
      });
    }

    // ------------------------------------------------
    // Clean survey
    // ------------------------------------------------

    if (surveyId) {
      await prisma.surveys.deleteMany({
        where: {
          id: BigInt(surveyId),
        },
      });
    }

    await app.close();
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
              student_id: BigInt(4),
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