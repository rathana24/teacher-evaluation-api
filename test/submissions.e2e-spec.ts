import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Same fix as main.ts — BigInt IDs can't be JSON-serialised by default
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Submission (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let lecturerToken: string;
  let student1Token: string; // user 4
  let student2Token: string; // user 5
  let student3Token: string; // user 6

  let tempSurveyId: string;
  let versionAId: string;
  let versionBId: string;

  let tempOfferingId: string;

  let openEvalId: string;
  let closedEvalId: string;
  let otherEvalId: string;

  let q1: string; // RATING required
  let q2: string; // RATING required
  let q3: string; // TEXT optional
  let q4: string; // AGREEMENT required
  let q5: string; // FREQUENCY required
  let q6: string; // MULTIPLE_CHOICE required
  let q7: string; // CHECKBOX required

  let mcOption1: string;
  let mcOption2: string;
  let mcOption3: string;

  let checkboxOption1: string;
  let checkboxOption2: string;
  let checkboxOption3: string;

  const stamp = Date.now();

  const hourAgo = new Date(
    stamp - 60 * 60 * 1000,
  ).toISOString();

  const nextWeek = new Date(
    stamp + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const api = () => request(app.getHttpServer());

  const admin = () => ({
    Authorization: `Bearer ${adminToken}`,
  });

  const as = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });

  const submit = (
    evalId: string,
    token: string,
    answers: unknown,
  ) =>
    api()
      .post(
        `/api/student/evaluations/${evalId}/responses`,
      )
      .set(as(token))
      .send({ answers });

  const validAnswers = () => [
    {
      question_id: q1,
      rating_value: 5,
    },
    {
      question_id: q2,
      rating_value: 4,
    },
    {
      question_id: q3,
      text_value: '  Clear explanations.  ',
    },
    {
      question_id: q4,
      rating_value: 5,
    },
    {
      question_id: q5,
      rating_value: 4,
    },
    {
      question_id: q6,
      selected_option_ids: [mcOption1],
    },
    {
      question_id: q7,
      selected_option_ids: [
        checkboxOption1,
        checkboxOption2,
      ],
    },
  ];

  async function createOpenEvaluation(
    offeringId: string,
    versionId: string,
  ) {
    const created = await api()
      .post('/api/evaluations')
      .set(admin())
      .send({
        course_offering_id: offeringId,
        survey_version_id: versionId,
        start_at: hourAgo,
        end_at: nextWeek,
      });

    await api()
      .post(
        `/api/evaluations/${created.body.id}/open`,
      )
      .set(admin());

    return created.body.id as string;
  }

  async function addQuestion(
    versionId: string,
    body: Record<string, unknown>,
  ) {
    return api()
      .post(
        `/api/survey-versions/${versionId}/questions`,
      )
      .set(admin())
      .send(body);
  }

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
          (res) => res.body.access_token,
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

    student3Token = await login(
      'student3@itc.edu.kh',
    );

    // ------------------------------------------------
    // Survey
    // ------------------------------------------------

    const survey = await api()
      .post('/api/surveys')
      .set(admin())
      .send({
        title: `E2E Submit ${stamp}`,
      });

    tempSurveyId = survey.body.id;

    // ------------------------------------------------
    // Version A — all six question types
    // ------------------------------------------------

    const versionA = await api()
      .post(
        `/api/surveys/${tempSurveyId}/versions`,
      )
      .set(admin())
      .send({});

    versionAId = versionA.body.id;

    const rating1 = await addQuestion(
      versionAId,
      {
        question_text: 'Explains clearly',
        question_type: 'RATING',
      },
    );

    q1 = rating1.body.id;

    const rating2 = await addQuestion(
      versionAId,
      {
        question_text: 'Well prepared',
        question_type: 'RATING',
      },
    );

    q2 = rating2.body.id;

    const text = await addQuestion(
      versionAId,
      {
        question_text: 'Comments',
        question_type: 'TEXT',
        is_required: false,
      },
    );

    q3 = text.body.id;

    const agreement = await addQuestion(
      versionAId,
      {
        question_text:
          'I agree that the lecturer explains clearly.',
        question_type: 'AGREEMENT',
      },
    );

    q4 = agreement.body.id;

    const frequency = await addQuestion(
      versionAId,
      {
        question_text:
          'How often does the lecturer provide examples?',
        question_type: 'FREQUENCY',
      },
    );

    q5 = frequency.body.id;

    const multipleChoice =
      await addQuestion(versionAId, {
        question_text:
          'Which resource was most useful?',
        question_type:
          'MULTIPLE_CHOICE',
        options: [
          {
            option_text: 'Lecture slides',
            display_order: 1,
          },
          {
            option_text:
              'Practice exercises',
            display_order: 2,
          },
          {
            option_text:
              'Group discussions',
            display_order: 3,
          },
        ],
      });

    q6 = multipleChoice.body.id;

    mcOption1 =
      multipleChoice.body
        .question_options[0].id;

    mcOption2 =
      multipleChoice.body
        .question_options[1].id;

    mcOption3 =
      multipleChoice.body
        .question_options[2].id;

    const checkbox = await addQuestion(
      versionAId,
      {
        question_text:
          'Which learning activities were useful?',
        question_type: 'CHECKBOX',
        options: [
          {
            option_text: 'Exercises',
            display_order: 1,
          },
          {
            option_text: 'Projects',
            display_order: 2,
          },
          {
            option_text: 'Discussions',
            display_order: 3,
          },
        ],
      },
    );

    q7 = checkbox.body.id;

    checkboxOption1 =
      checkbox.body.question_options[0].id;

    checkboxOption2 =
      checkbox.body.question_options[1].id;

    checkboxOption3 =
      checkbox.body.question_options[2].id;

    // ------------------------------------------------
    // Version B — simple rating survey
    // ------------------------------------------------

    const versionB = await api()
      .post(
        `/api/surveys/${tempSurveyId}/versions`,
      )
      .set(admin())
      .send({});

    versionBId = versionB.body.id;

    await addQuestion(versionBId, {
      question_text: 'Overall',
      question_type: 'RATING',
    });

    // ------------------------------------------------
    // Evaluations
    // ------------------------------------------------

    openEvalId =
      await createOpenEvaluation(
        '1',
        versionAId,
      );

    closedEvalId =
      await createOpenEvaluation(
        '1',
        versionBId,
      );

    await api()
      .post(
        `/api/evaluations/${closedEvalId}/close`,
      )
      .set(admin());

    // ------------------------------------------------
    // Separate offering — only student2 enrolled
    // ------------------------------------------------

    const offering = await api()
      .post('/api/course-offerings')
      .set(admin())
      .send({
        course_id: '2',
        lecturer_id: '2',
        semester_id: '1',
        section_code: `E2E-SUB-${stamp}`,
      });

    tempOfferingId = offering.body.id;

    await api()
      .post(
        `/api/course-offerings/${tempOfferingId}/enrollments`,
      )
      .set(admin())
      .send({
        student_id: '5',
      });

    otherEvalId =
      await createOpenEvaluation(
        tempOfferingId,
        versionBId,
      );
  }, 60000);

  afterAll(async () => {
    const evalIds = [
      openEvalId,
      closedEvalId,
      otherEvalId,
    ]
      .filter(
        (id): id is string =>
          id !== undefined,
      )
      .map((id) => BigInt(id));

    const versionIds = [
      versionAId,
      versionBId,
    ]
      .filter(
        (id): id is string =>
          id !== undefined,
      )
      .map((id) => BigInt(id));

    // ----------------------------------------------
    // Responses
    //
    // answer_options -> answers -> responses
    // ----------------------------------------------

    if (evalIds.length > 0) {
      const responseRows =
        await prisma.responses.findMany({
          where: {
            evaluation_id: {
              in: evalIds,
            },
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
          await prisma.answer_options.deleteMany(
            {
              where: {
                answer_id: {
                  in: answerIds,
                },
              },
            },
          );
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
          evaluation_id: {
            in: evalIds,
          },
        },
      });

      await prisma.evaluation_participants.deleteMany(
        {
          where: {
            evaluation_id: {
              in: evalIds,
            },
          },
        },
      );

      await prisma.evaluations.deleteMany({
        where: {
          id: {
            in: evalIds,
          },
        },
      });
    }

    // ----------------------------------------------
    // Temporary offering
    // ----------------------------------------------

    if (tempOfferingId) {
      await prisma.enrollments.deleteMany({
        where: {
          course_offering_id: BigInt(
            tempOfferingId,
          ),
        },
      });

      await prisma.course_offerings.delete({
        where: {
          id: BigInt(tempOfferingId),
        },
      });
    }

    // ----------------------------------------------
    // Survey questions
    //
    // question_options -> questions -> versions
    // ----------------------------------------------

    if (versionIds.length > 0) {
      await prisma.question_options.deleteMany({
        where: {
          questions: {
            survey_version_id: {
              in: versionIds,
            },
          },
        },
      });

      await prisma.questions.deleteMany({
        where: {
          survey_version_id: {
            in: versionIds,
          },
        },
      });

      await prisma.survey_versions.deleteMany({
        where: {
          id: {
            in: versionIds,
          },
        },
      });
    }

    if (tempSurveyId) {
      await prisma.surveys.delete({
        where: {
          id: BigInt(tempSurveyId),
        },
      });
    }

    await app.close();
  });

  // ==================================================
  // ACCESS CONTROL
  // ==================================================

  describe('access control', () => {
    it('ADMIN cannot submit -> 403', async () => {
      const res = await submit(
        openEvalId,
        adminToken,
        validAnswers(),
      );

      expect(res.status).toBe(403);
    });

    it('LECTURER cannot submit -> 403', async () => {
      const res = await submit(
        openEvalId,
        lecturerToken,
        validAnswers(),
      );

      expect(res.status).toBe(403);
    });
  });

  // ==================================================
  // ANSWER VALIDATION
  // ==================================================

  describe(
    'answer validation (nothing is saved)',
    () => {
      it('empty answers list -> 400', async () => {
        const res = await submit(
          openEvalId,
          student1Token,
          [],
        );

        expect(res.status).toBe(400);
      });

      it('missing a required question -> 400', async () => {
        const answers =
          validAnswers().filter(
            (answer) =>
              answer.question_id !== q4,
          );

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('RATING above the range -> 400', async () => {
        const answers =
          validAnswers();

        answers[0] = {
          question_id: q1,
          rating_value: 6,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('RATING below the range -> 400', async () => {
        const answers =
          validAnswers();

        answers[0] = {
          question_id: q1,
          rating_value: 0,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('RATING must be a whole number -> 400', async () => {
        const answers =
          validAnswers();

        answers[0] = {
          question_id: q1,
          rating_value: 3.5,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('text sent to a RATING question -> 400', async () => {
        const answers =
          validAnswers();

        answers[0] = {
          question_id: q1,
          text_value: 'great',
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('rating sent to a TEXT question -> 400', async () => {
        const answers =
          validAnswers();

        answers[2] = {
          question_id: q3,
          rating_value: 3,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      // --------------------------------------------
      // AGREEMENT
      // --------------------------------------------

      it('AGREEMENT accepts only 1-5: value 0 -> 400', async () => {
        const answers =
          validAnswers();

        answers[3] = {
          question_id: q4,
          rating_value: 0,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('AGREEMENT accepts only 1-5: value 6 -> 400', async () => {
        const answers =
          validAnswers();

        answers[3] = {
          question_id: q4,
          rating_value: 6,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      // --------------------------------------------
      // FREQUENCY
      // --------------------------------------------

      it('FREQUENCY accepts only 1-5: value 0 -> 400', async () => {
        const answers =
          validAnswers();

        answers[4] = {
          question_id: q5,
          rating_value: 0,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('FREQUENCY accepts only 1-5: value 6 -> 400', async () => {
        const answers =
          validAnswers();

        answers[4] = {
          question_id: q5,
          rating_value: 6,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      // --------------------------------------------
      // MULTIPLE CHOICE
      // --------------------------------------------

      it('MULTIPLE_CHOICE requires exactly one option -> 400', async () => {
        const answers =
          validAnswers();

        answers[5] = {
          question_id: q6,
          selected_option_ids: [
            mcOption1,
            mcOption2,
          ],
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('MULTIPLE_CHOICE rejects an option belonging to another question -> 400', async () => {
        const answers =
          validAnswers();

        answers[5] = {
          question_id: q6,
          selected_option_ids: [
            checkboxOption1,
          ],
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('MULTIPLE_CHOICE rejects rating_value -> 400', async () => {
        const answers =
          validAnswers();

        answers[5] = {
          question_id: q6,
          rating_value: 5,
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      // --------------------------------------------
      // CHECKBOX
      // --------------------------------------------

      it('CHECKBOX rejects an option belonging to another question -> 400', async () => {
        const answers =
          validAnswers();

        answers[6] = {
          question_id: q7,
          selected_option_ids: [
            checkboxOption1,
            mcOption1,
          ],
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('CHECKBOX rejects duplicate selected option IDs -> 400', async () => {
        const answers =
          validAnswers();

        answers[6] = {
          question_id: q7,
          selected_option_ids: [
            checkboxOption1,
            checkboxOption1,
          ],
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('CHECKBOX rejects text_value -> 400', async () => {
        const answers =
          validAnswers();

        answers[6] = {
          question_id: q7,
          text_value: 'Exercises',
        };

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      // --------------------------------------------
      // GENERAL
      // --------------------------------------------

      it('question from another survey -> 400', async () => {
        const answers = [
          ...validAnswers(),
          {
            question_id: '1',
            rating_value: 5,
          },
        ];

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('same question answered twice -> 400', async () => {
        const answers = [
          ...validAnswers(),
          {
            question_id: q1,
            rating_value: 3,
          },
        ];

        const res = await submit(
          openEvalId,
          student1Token,
          answers,
        );

        expect(res.status).toBe(400);
      });

      it('non-numeric question_id -> 400', async () => {
        const res = await submit(
          openEvalId,
          student1Token,
          [
            {
              question_id: 'abc',
              rating_value: 5,
            },
          ],
        );

        expect(res.status).toBe(400);
      });
    },
  );

  // ==================================================
  // EVALUATION STATE / ELIGIBILITY
  // ==================================================

  describe(
    'evaluation state and eligibility',
    () => {
      it('CLOSED evaluation -> 409', async () => {
        const res = await submit(
          closedEvalId,
          student1Token,
          validAnswers(),
        );

        expect(res.status).toBe(409);
      });

      it('class I am not enrolled in -> 403', async () => {
        const res = await submit(
          otherEvalId,
          student1Token,
          validAnswers(),
        );

        expect(res.status).toBe(403);
      });

      it('evaluation that does not exist -> 404', async () => {
        const res = await submit(
          '999999',
          student1Token,
          validAnswers(),
        );

        expect(res.status).toBe(404);
      });
    },
  );

  // ==================================================
  // SUCCESSFUL SUBMISSION
  // ==================================================

  describe('successful submission', () => {
    it('valid answers for all six question types are accepted -> 201', async () => {
      const res = await submit(
        openEvalId,
        student1Token,
        validAnswers(),
      );

      expect(res.status).toBe(201);
      expect(res.body.submitted).toBe(true);

      const status = await api()
        .get(
          `/api/student/evaluations/${openEvalId}/submission-status`,
        )
        .set(as(student1Token));

      expect(
        status.body.has_submitted,
      ).toBe(true);
    });

    it('submitting a second time -> 409', async () => {
      const res = await submit(
        openEvalId,
        student1Token,
        validAnswers(),
      );

      expect(res.status).toBe(409);
    });

    it('saved response is anonymous and stores all answer types correctly', async () => {
      const responses =
        await prisma.responses.findMany({
          where: {
            evaluation_id:
              BigInt(openEvalId),
          },

          include: {
            answers: {
              include: {
                answer_options: true,
              },
            },
          },
        });

      // Only one successful student1 submission.
      // All validation failures saved nothing.
      expect(responses).toHaveLength(1);

      const response: any =
        responses[0];

      // Anonymous response:
      expect(response).not.toHaveProperty(
        'student_id',
      );

      expect(response).not.toHaveProperty(
        'participant_id',
      );

      expect(
        response.submitted_at.toISOString(),
      ).toMatch(
        /T00:00:00\.000Z$/,
      );

      // 7 questions:
      // 2 rating + text + agreement +
      // frequency + MC + checkbox
      expect(
        response.answers,
      ).toHaveLength(7);

      // TEXT should be trimmed.
      const comment =
        response.answers.find(
          (answer: any) =>
            answer.question_id ===
            BigInt(q3),
        );

      expect(comment.text_value).toBe(
        'Clear explanations.',
      );

      // AGREEMENT stored numerically.
      const agreement =
        response.answers.find(
          (answer: any) =>
            answer.question_id ===
            BigInt(q4),
        );

      expect(
        agreement.rating_value,
      ).toBe(5);

      // FREQUENCY stored numerically.
      const frequency =
        response.answers.find(
          (answer: any) =>
            answer.question_id ===
            BigInt(q5),
        );

      expect(
        frequency.rating_value,
      ).toBe(4);

      // MULTIPLE_CHOICE:
      // exactly one answer_option.
      const multipleChoice =
        response.answers.find(
          (answer: any) =>
            answer.question_id ===
            BigInt(q6),
        );

      expect(
        multipleChoice.answer_options,
      ).toHaveLength(1);

      expect(
        multipleChoice
          .answer_options[0]
          .option_id,
      ).toBe(BigInt(mcOption1));

      // CHECKBOX:
      // two answer_options.
      const checkbox =
        response.answers.find(
          (answer: any) =>
            answer.question_id ===
            BigInt(q7),
        );

      expect(
        checkbox.answer_options,
      ).toHaveLength(2);

      expect(
        checkbox.answer_options
          .map(
            (item: any) =>
              item.option_id.toString(),
          )
          .sort(),
      ).toEqual(
        [
          checkboxOption1,
          checkboxOption2,
        ].sort(),
      );
    });

    it('an empty optional comment is simply skipped -> 201', async () => {
      const answers =
        validAnswers();

      answers[2] = {
        question_id: q3,
        text_value: '   ',
      };

      const res = await submit(
        openEvalId,
        student2Token,
        answers,
      );

      expect(res.status).toBe(201);

      const latest =
        await prisma.responses.findMany({
          where: {
            evaluation_id:
              BigInt(openEvalId),
          },

          include: {
            answers: true,
          },

          orderBy: {
            id: 'desc',
          },

          take: 1,
        });

      // 7 possible questions - optional TEXT skipped = 6
      expect(
        latest[0].answers,
      ).toHaveLength(6);
    });

    it('two submissions at the same moment: exactly one succeeds', async () => {
      const [a, b] =
        await Promise.all([
          submit(
            openEvalId,
            student3Token,
            validAnswers(),
          ),

          submit(
            openEvalId,
            student3Token,
            validAnswers(),
          ),
        ]);

      expect(
        [a.status, b.status].sort(),
      ).toEqual([201, 409]);

      const count =
        await prisma.responses.count({
          where: {
            evaluation_id:
              BigInt(openEvalId),
          },
        });

      expect(count).toBe(3);
    });
  });
});