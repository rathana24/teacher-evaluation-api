import { baseFixtures } from './utils/base-fixtures';
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

describe('Questions (e2e)', () => {
  let app: INestApplication;
 let baseline: Awaited<ReturnType<typeof baseFixtures>>;
  let prisma: PrismaService;

  let adminToken: string;
  let studentToken: string;
  let lecturerToken: string;

  let tempSurveyId: string;
  let draftVersionId: string;
  let archivedVersionId: string | undefined;

  let ratingQuestionId: string;
  let textQuestionId: string;
  let multipleChoiceQuestionId: string;
  let checkboxQuestionId: string;

  const auth = () => ({
    Authorization: `Bearer ${adminToken}`,
  });

  const questionsUrl = () =>
    `/api/survey-versions/${draftVersionId}/questions`;

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
 baseline = await baseFixtures(app.get(PrismaService));

    prisma = app.get(PrismaService);

    const login = (email: string) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          identifier: email,
          password: 'Password123',
        })
        .then((res) => res.body.access_token);

    adminToken = await login('admin@itc.edu.kh');

    studentToken = await login(
      'student1@itc.edu.kh',
    );

    lecturerToken = await login(
      'sokdara@itc.edu.kh',
    );

    // Temporary survey with one DRAFT version,
    // not used by any evaluation.
    const survey = await request(
      app.getHttpServer(),
    )
      .post('/api/surveys')
      .set(auth())
      .send({
        title: `E2E Questions ${Date.now()}`,
      });

    tempSurveyId = survey.body.id;

    const version = await request(
      app.getHttpServer(),
    )
      .post(
        `/api/surveys/${tempSurveyId}/versions`,
      )
      .set(auth())
      .send({});

    draftVersionId = version.body.id;
  }, 30000);

  afterAll(async () => {
    const ids = [
      draftVersionId,
      archivedVersionId,
    ]
      .filter(
        (id): id is string =>
          id !== undefined,
      )
      .map((id) => BigInt(id));

    if (ids.length > 0) {
      /*
       * question_options references questions.
       *
       * Therefore:
       * question_options -> questions -> versions
       */
      await prisma.question_options.deleteMany({
        where: {
          questions: {
            survey_version_id: {
              in: ids,
            },
          },
        },
      });

      await prisma.questions.deleteMany({
        where: {
          survey_version_id: {
            in: ids,
          },
        },
      });
    }

    for (const id of [
      draftVersionId,
      archivedVersionId,
    ]) {
      if (id) {
        await request(app.getHttpServer())
          .delete(
            `/api/surveys/${tempSurveyId}/versions/${id}`,
          )
          .set(auth());
      }
    }

    if (tempSurveyId) {
      await request(app.getHttpServer())
        .delete(
          `/api/surveys/${tempSurveyId}`,
        )
        .set(auth());
    }

    await app.close();
  });

  describe('access control', () => {
    it('STUDENT is blocked from listing -> 403', async () => {
      const res = await request(
        app.getHttpServer(),
      )
        .get(questionsUrl())
        .set(
          'Authorization',
          `Bearer ${studentToken}`,
        );

      expect(res.status).toBe(403);
    });

    it('LECTURER is blocked from creating -> 403', async () => {
      const res = await request(
        app.getHttpServer(),
      )
        .post(questionsUrl())
        .set(
          'Authorization',
          `Bearer ${lecturerToken}`,
        )
        .send({
          question_text: 'Nope',
          question_type: 'TEXT',
        });

      expect(res.status).toBe(403);
    });
  });

  describe(
    'POST /api/survey-versions/:versionId/questions',
    () => {
      it('RATING question gets range 1–5, order 1, required by default and supports Khmer -> 201', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text:
              'The lecturer explains clearly.',
            question_text_km:
              'គ្រូបង្រៀនពន្យល់បានច្បាស់លាស់។',
            question_type: 'RATING',
          });

        expect(res.status).toBe(201);

        expect(res.body.question_type).toBe(
          'RATING',
        );

        expect(res.body.question_text_km).toBe(
          'គ្រូបង្រៀនពន្យល់បានច្បាស់លាស់។',
        );

        expect(res.body.min_rating).toBe(1);
        expect(res.body.max_rating).toBe(5);
        expect(res.body.display_order).toBe(1);
        expect(res.body.is_required).toBe(true);

        expect(
          res.body.question_options,
        ).toEqual([]);

        ratingQuestionId = res.body.id;
      });

      it('TEXT question without Khmer has question_text_km null -> 201', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Any comments?',
            question_type: 'TEXT',
            is_required: false,
          });

        expect(res.status).toBe(201);

        expect(res.body.question_type).toBe(
          'TEXT',
        );

        expect(
          res.body.question_text_km,
        ).toBeNull();

        expect(res.body.min_rating).toBeNull();
        expect(res.body.max_rating).toBeNull();
        expect(res.body.display_order).toBe(2);

        expect(
          res.body.question_options,
        ).toEqual([]);

        textQuestionId = res.body.id;
      });

      it('AGREEMENT question uses fixed range 1–5 -> 201', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text:
              'I agree that the lecturer explains clearly.',
            question_type: 'AGREEMENT',
          });

        expect(res.status).toBe(201);

        expect(res.body.question_type).toBe(
          'AGREEMENT',
        );

        expect(res.body.min_rating).toBe(1);
        expect(res.body.max_rating).toBe(5);
        expect(res.body.display_order).toBe(3);

        expect(
          res.body.question_options,
        ).toEqual([]);
      });

      it('FREQUENCY question uses fixed range 1–5 -> 201', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text:
              'How often does the lecturer provide examples?',
            question_type: 'FREQUENCY',
          });

        expect(res.status).toBe(201);

        expect(res.body.question_type).toBe(
          'FREQUENCY',
        );

        expect(res.body.min_rating).toBe(1);
        expect(res.body.max_rating).toBe(5);
        expect(res.body.display_order).toBe(4);

        expect(
          res.body.question_options,
        ).toEqual([]);
      });

      it('MULTIPLE_CHOICE question can be created with ordered options -> 201', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
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

        expect(res.status).toBe(201);

        expect(res.body.question_type).toBe(
          'MULTIPLE_CHOICE',
        );

        expect(res.body.min_rating).toBeNull();
        expect(res.body.max_rating).toBeNull();
        expect(res.body.display_order).toBe(5);

        expect(
          res.body.question_options,
        ).toHaveLength(3);

        expect(
          res.body.question_options.map(
            (option: any) =>
              option.option_text,
          ),
        ).toEqual([
          'Lecture slides',
          'Practice exercises',
          'Group discussions',
        ]);

        expect(
          res.body.question_options.map(
            (option: any) =>
              option.display_order,
          ),
        ).toEqual([1, 2, 3]);

        multipleChoiceQuestionId =
          res.body.id;
      });

      it('CHECKBOX question can be created with ordered options -> 201', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
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
          });

        expect(res.status).toBe(201);

        expect(res.body.question_type).toBe(
          'CHECKBOX',
        );

        expect(res.body.min_rating).toBeNull();
        expect(res.body.max_rating).toBeNull();
        expect(res.body.display_order).toBe(6);

        expect(
          res.body.question_options,
        ).toHaveLength(3);

        checkboxQuestionId = res.body.id;
      });

      it('rejects MULTIPLE_CHOICE without options -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Choose one',
            question_type:
              'MULTIPLE_CHOICE',
          });

        expect(res.status).toBe(400);
      });

      it('rejects CHECKBOX without options -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Choose several',
            question_type: 'CHECKBOX',
          });

        expect(res.status).toBe(400);
      });

      it('rejects duplicate option display_order -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Bad options',
            question_type:
              'MULTIPLE_CHOICE',
            options: [
              {
                option_text: 'Option A',
                display_order: 1,
              },
              {
                option_text: 'Option B',
                display_order: 1,
              },
            ],
          });

        expect(res.status).toBe(400);
      });

      it('rejects options for a TEXT question -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Comments',
            question_type: 'TEXT',
            options: [
              {
                option_text: 'Not allowed',
                display_order: 1,
              },
            ],
          });

        expect(res.status).toBe(400);
      });

      it('rejects options for a RATING question -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Rating',
            question_type: 'RATING',
            options: [
              {
                option_text: 'Not allowed',
                display_order: 1,
              },
            ],
          });

        expect(res.status).toBe(400);
      });

      it('rejects custom range for AGREEMENT -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Agreement',
            question_type: 'AGREEMENT',
            min_rating: 1,
            max_rating: 4,
          });

        expect(res.status).toBe(400);
      });

      it('rejects custom range for FREQUENCY -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Frequency',
            question_type: 'FREQUENCY',
            min_rating: 1,
            max_rating: 4,
          });

        expect(res.status).toBe(400);
      });

      it('rejects a TEXT question with a rating range -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Bad',
            question_type: 'TEXT',
            min_rating: 1,
          });

        expect(res.status).toBe(400);
      });

      it('rejects min_rating not less than max_rating -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Bad',
            question_type: 'RATING',
            min_rating: 4,
            max_rating: 2,
          });

        expect(res.status).toBe(400);
      });

      it('rejects max_rating above 5 -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Bad',
            question_type: 'RATING',
            max_rating: 6,
          });

        expect(res.status).toBe(400);
      });

      it('rejects an unknown question_type -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Bad',
            question_type: 'CHOICE',
          });

        expect(res.status).toBe(400);
      });

      it('rejects empty question_text -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: '',
            question_type: 'TEXT',
          });

        expect(res.status).toBe(400);
      });

      // FIXED:
      // Creating at an occupied display_order now inserts
      // the new question and shifts later questions.
      it('inserts at an existing display_order and shifts later questions -> 201', async () => {
        const before = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(before.status).toBe(200);

        const originalFirstQuestion =
          before.body[0];

        const res = await request(
          app.getHttpServer(),
        )
          .post(questionsUrl())
          .set(auth())
          .send({
            question_text: 'Clash',
            question_type: 'TEXT',
            display_order: 1,
          });

        expect(res.status).toBe(201);
        expect(res.body.question_text).toBe(
          'Clash',
        );
        expect(res.body.display_order).toBe(1);

        const afterInsert = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(afterInsert.status).toBe(200);

        expect(
          afterInsert.body.map(
            (question: any) =>
              question.display_order,
          ),
        ).toEqual([1, 2, 3, 4, 5, 6, 7]);

        expect(
          afterInsert.body[0].question_text,
        ).toBe('Clash');

        expect(afterInsert.body[1].id).toBe(
          originalFirstQuestion.id,
        );

        // Clean up the temporary question.
        const deleted = await request(
          app.getHttpServer(),
        )
          .delete(
            `/api/questions/${res.body.id}`,
          )
          .set(auth());

        expect(deleted.status).toBe(204);

        // Delete compacts the ordering back to 1..6.
        const afterDelete = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(afterDelete.status).toBe(200);

        expect(
          afterDelete.body.map(
            (question: any) =>
              question.display_order,
          ),
        ).toEqual([1, 2, 3, 4, 5, 6]);
      });

      it('survey version that does not exist -> 404', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .post(
            '/api/survey-versions/999999/questions',
          )
          .set(auth())
          .send({
            question_text: 'Nope',
            question_type: 'TEXT',
          });

        expect(res.status).toBe(404);
      });
    },
  );

  describe(
    'GET /api/survey-versions/:versionId/questions',
    () => {
      it('lists all six question types in display order -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(res.status).toBe(200);

        expect(
          res.body.map(
            (question: any) =>
              question.display_order,
          ),
        ).toEqual([1, 2, 3, 4, 5, 6]);

        expect(
          res.body.map(
            (question: any) =>
              question.question_type,
          ),
        ).toEqual([
          'RATING',
          'TEXT',
          'AGREEMENT',
          'FREQUENCY',
          'MULTIPLE_CHOICE',
          'CHECKBOX',
        ]);
      });

      it('returns Khmer question text -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(res.status).toBe(200);

        const question = res.body.find(
          (item: any) =>
            item.id === ratingQuestionId,
        );

        expect(question).toBeDefined();

        expect(question.question_text_km).toBe(
          'គ្រូបង្រៀនពន្យល់បានច្បាស់លាស់។',
        );
      });

      it('returns null Khmer text when translation was not provided -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(res.status).toBe(200);

        const question = res.body.find(
          (item: any) =>
            item.id === textQuestionId,
        );

        expect(question).toBeDefined();

        expect(
          question.question_text_km,
        ).toBeNull();
      });

      it('returns MULTIPLE_CHOICE options in display order -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        expect(res.status).toBe(200);

        const question = res.body.find(
          (item: any) =>
            item.id ===
            multipleChoiceQuestionId,
        );

        expect(question).toBeDefined();

        expect(
          question.question_options.map(
            (option: any) =>
              option.display_order,
          ),
        ).toEqual([1, 2, 3]);

        expect(
          question.question_options.map(
            (option: any) =>
              option.option_text,
          ),
        ).toEqual([
          'Lecture slides',
          'Practice exercises',
          'Group discussions',
        ]);
      });
    },
  );

  describe(
    'PUT /api/questions/:questionId',
    () => {
      it('ADMIN can edit the English and Khmer text -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${ratingQuestionId}`,
          )
          .set(auth())
          .send({
            question_text:
              'The lecturer explains concepts clearly.',
            question_text_km:
              'គ្រូបង្រៀនពន្យល់គោលគំនិតបានច្បាស់លាស់។',
          });

        expect(res.status).toBe(200);

        expect(res.body.question_text).toBe(
          'The lecturer explains concepts clearly.',
        );

        expect(res.body.question_text_km).toBe(
          'គ្រូបង្រៀនពន្យល់គោលគំនិតបានច្បាស់លាស់។',
        );
      });

      it('updating another field keeps existing Khmer text -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${ratingQuestionId}`,
          )
          .set(auth())
          .send({
            category: 'Teaching Quality',
          });

        expect(res.status).toBe(200);

        expect(res.body.category).toBe(
          'Teaching Quality',
        );

        expect(res.body.question_text_km).toBe(
          'គ្រូបង្រៀនពន្យល់គោលគំនិតបានច្បាស់លាស់។',
        );
      });

      it('changing RATING to TEXT clears the range -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${ratingQuestionId}`,
          )
          .set(auth())
          .send({
            question_type: 'TEXT',
          });

        expect(res.status).toBe(200);

        expect(res.body.question_type).toBe(
          'TEXT',
        );

        expect(res.body.min_rating).toBeNull();
        expect(res.body.max_rating).toBeNull();

        // Khmer translation should remain unchanged.
        expect(res.body.question_text_km).toBe(
          'គ្រូបង្រៀនពន្យល់គោលគំនិតបានច្បាស់លាស់។',
        );
      });

      it('changing TEXT to MULTIPLE_CHOICE without options -> 400', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${ratingQuestionId}`,
          )
          .set(auth())
          .send({
            question_type:
              'MULTIPLE_CHOICE',
          });

        expect(res.status).toBe(400);
      });

      it('changing TEXT to MULTIPLE_CHOICE with options -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${ratingQuestionId}`,
          )
          .set(auth())
          .send({
            question_type:
              'MULTIPLE_CHOICE',
            options: [
              {
                option_text: 'Choice A',
                display_order: 1,
              },
              {
                option_text: 'Choice B',
                display_order: 2,
              },
            ],
          });

        expect(res.status).toBe(200);

        expect(res.body.question_type).toBe(
          'MULTIPLE_CHOICE',
        );

        expect(res.body.min_rating).toBeNull();
        expect(res.body.max_rating).toBeNull();

        expect(
          res.body.question_options,
        ).toHaveLength(2);
      });

      it('editing an option-based question without options keeps its existing options -> 200', async () => {
        const before = await request(
          app.getHttpServer(),
        )
          .get(questionsUrl())
          .set(auth());

        const oldQuestion =
          before.body.find(
            (item: any) =>
              item.id ===
              multipleChoiceQuestionId,
          );

        const oldOptionIds =
          oldQuestion.question_options.map(
            (option: any) => option.id,
          );

        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${multipleChoiceQuestionId}`,
          )
          .set(auth())
          .send({
            question_text:
              'Which learning resource was most useful?',
          });

        expect(res.status).toBe(200);

        expect(
          res.body.question_options,
        ).toHaveLength(3);

        expect(
          res.body.question_options.map(
            (option: any) => option.id,
          ),
        ).toEqual(oldOptionIds);
      });

      it('replaces options when a new option list is provided -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${checkboxQuestionId}`,
          )
          .set(auth())
          .send({
            options: [
              {
                option_text: 'Assignments',
                display_order: 1,
              },
              {
                option_text: 'Projects',
                display_order: 2,
              },
            ],
          });

        expect(res.status).toBe(200);

        expect(
          res.body.question_options,
        ).toHaveLength(2);

        expect(
          res.body.question_options.map(
            (option: any) =>
              option.option_text,
          ),
        ).toEqual([
          'Assignments',
          'Projects',
        ]);
      });

      it('changing an option-based question to TEXT removes its options -> 200', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put(
            `/api/questions/${ratingQuestionId}`,
          )
          .set(auth())
          .send({
            question_type: 'TEXT',
          });

        expect(res.status).toBe(200);

        expect(res.body.question_type).toBe(
          'TEXT',
        );

        expect(
          res.body.question_options,
        ).toEqual([]);
      });

      it('question that does not exist -> 404', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .put('/api/questions/999999')
          .set(auth())
          .send({
            question_text: 'Nope',
          });

        expect(res.status).toBe(404);
      });
    },
  );

  describe('lock rule', () => {
    it('cannot add a question to a version used by an OPEN evaluation (seeded version 1) -> 409', async () => {
      const res = await request(
        app.getHttpServer(),
      )
        .post(
          `/api/survey-versions/${baseline.version}/questions`,
        )
        .set(auth())
        .send({
          question_text: 'Sneaky',
          question_type: 'TEXT',
        });

      expect(res.status).toBe(409);
    });

    it('cannot edit a question in that version (seeded question 1) -> 409', async () => {
      const res = await request(
        app.getHttpServer(),
      )
        .put(`/api/questions/${baseline.question}`)
        .set(auth())
        .send({
          question_text:
            'Changed after students answered',
        });

      expect(res.status).toBe(409);
    });

    it('cannot delete a question in that version (seeded question 1) -> 409', async () => {
      const res = await request(
        app.getHttpServer(),
      )
        .delete(`/api/questions/${baseline.question}`)
        .set(auth());

      expect(res.status).toBe(409);
    });

    it('cannot add a question to an ARCHIVED version -> 409', async () => {
      const version = await request(
        app.getHttpServer(),
      )
        .post(
          `/api/surveys/${tempSurveyId}/versions`,
        )
        .set(auth())
        .send({});

      archivedVersionId = version.body.id;

      await request(app.getHttpServer())
        .post(
          `/api/surveys/${tempSurveyId}/versions/${archivedVersionId}/archive`,
        )
        .set(auth());

      const res = await request(
        app.getHttpServer(),
      )
        .post(
          `/api/survey-versions/${archivedVersionId}/questions`,
        )
        .set(auth())
        .send({
          question_text: 'Too late',
          question_type: 'TEXT',
        });

      expect(res.status).toBe(409);
    });
  });

  describe(
    'DELETE /api/questions/:questionId',
    () => {
      it('ADMIN can delete a question in the latest unused DRAFT version -> 204', async () => {
        const version = await request(app.getHttpServer()).post(`/api/surveys/${tempSurveyId}/versions`).set(auth()).send({});
        expect(version.status).toBe(201);
        const question = await request(app.getHttpServer()).post(`/api/survey-versions/${version.body.id}/questions`).set(auth()).send({question_text:'Disposable question',question_type:'TEXT'});
        expect(question.status).toBe(201); textQuestionId = question.body.id;

        const res = await request(
          app.getHttpServer(),
        )
          .delete(
            `/api/questions/${textQuestionId}`,
          )
          .set(auth());

        expect(res.status).toBe(204);
      });

      it('deleting it again -> 404', async () => {
        const res = await request(
          app.getHttpServer(),
        )
          .delete(
            `/api/questions/${textQuestionId}`,
          )
          .set(auth());

        expect(res.status).toBe(404);
      });
    },
  );
});