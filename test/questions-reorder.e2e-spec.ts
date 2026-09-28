import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// BigInt IDs cannot be JSON-serialized by default.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Questions Reorder (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let studentToken: string;

  let tempSurveyId: string;
  let draftVersionId: string;

  let otherSurveyId: string;
  let otherVersionId: string;

  const questionIds: string[] = [];
  let otherQuestionId: string;

  const auth = () => ({
    Authorization: `Bearer ${adminToken}`,
  });

  const reorderUrl = () =>
    `/api/survey-versions/${draftVersionId}/questions/reorder`;

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

    prisma = app.get(PrismaService);

    // ---------------------------------------------------------
    // Login using the same seeded accounts used by the
    // existing E2E tests.
    // ---------------------------------------------------------

    const login = (email: string) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'Password123',
        })
        .then((res) => res.body.access_token);

    adminToken = await login('admin@itc.edu.kh');
    studentToken = await login('student1@itc.edu.kh');

    // ---------------------------------------------------------
    // Create temporary survey through the real API.
    // ---------------------------------------------------------

    const survey = await request(app.getHttpServer())
      .post('/api/surveys')
      .set(auth())
      .send({
        title: `E2E Question Reorder ${Date.now()}`,
      });

    expect(survey.status).toBe(201);

    tempSurveyId = survey.body.id;

    // ---------------------------------------------------------
    // Create a DRAFT version through the real API.
    // ---------------------------------------------------------

    const version = await request(app.getHttpServer())
      .post(`/api/surveys/${tempSurveyId}/versions`)
      .set(auth())
      .send({});

    expect(version.status).toBe(201);

    draftVersionId = version.body.id;

    // ---------------------------------------------------------
    // Create 5 questions through the real Questions API.
    // ---------------------------------------------------------

    const questions = [
      {
        question_text: 'Reorder Question A',
        question_type: 'TEXT',
      },
      {
        question_text: 'Reorder Question B',
        question_type: 'RATING',
      },
      {
        question_text: 'Reorder Question C',
        question_type: 'AGREEMENT',
      },
      {
        question_text: 'Reorder Question D',
        question_type: 'FREQUENCY',
      },
      {
        question_text: 'Reorder Question E',
        question_type: 'TEXT',
      },
    ];

    for (const question of questions) {
      const response = await request(app.getHttpServer())
        .post(questionsUrl())
        .set(auth())
        .send(question);

      expect(response.status).toBe(201);

      questionIds.push(response.body.id);
    }

    // ---------------------------------------------------------
    // Create another survey/version/question.
    //
    // We use this later to prove that a question belonging to
    // another survey version cannot be inserted into the
    // reorder request.
    // ---------------------------------------------------------

    const otherSurvey = await request(app.getHttpServer())
      .post('/api/surveys')
      .set(auth())
      .send({
        title: `E2E Other Reorder Survey ${Date.now()}`,
      });

    expect(otherSurvey.status).toBe(201);

    otherSurveyId = otherSurvey.body.id;

    const otherVersion = await request(app.getHttpServer())
      .post(`/api/surveys/${otherSurveyId}/versions`)
      .set(auth())
      .send({});

    expect(otherVersion.status).toBe(201);

    otherVersionId = otherVersion.body.id;

    const otherQuestion = await request(
      app.getHttpServer(),
    )
      .post(
        `/api/survey-versions/${otherVersionId}/questions`,
      )
      .set(auth())
      .send({
        question_text:
          'Question belonging to another survey version',
        question_type: 'TEXT',
      });

    expect(otherQuestion.status).toBe(201);

    otherQuestionId = otherQuestion.body.id;
  }, 30000);

  afterAll(async () => {
    // ---------------------------------------------------------
    // Clean up questions/options directly with Prisma.
    //
    // This follows the cleanup approach already used by the
    // existing Questions E2E test.
    // ---------------------------------------------------------

    const versionIds = [
      draftVersionId,
      otherVersionId,
    ]
      .filter(
        (id): id is string => id !== undefined,
      )
      .map((id) => BigInt(id));

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
    }

    // Delete versions through the API.
    if (draftVersionId && tempSurveyId) {
      await request(app.getHttpServer())
        .delete(
          `/api/surveys/${tempSurveyId}/versions/${draftVersionId}`,
        )
        .set(auth());
    }

    if (otherVersionId && otherSurveyId) {
      await request(app.getHttpServer())
        .delete(
          `/api/surveys/${otherSurveyId}/versions/${otherVersionId}`,
        )
        .set(auth());
    }

    // Delete temporary surveys.
    if (tempSurveyId) {
      await request(app.getHttpServer())
        .delete(`/api/surveys/${tempSurveyId}`)
        .set(auth());
    }

    if (otherSurveyId) {
      await request(app.getHttpServer())
        .delete(`/api/surveys/${otherSurveyId}`)
        .set(auth());
    }

    await app.close();
  });

  // ===========================================================
  // 1. Successful reorder
  // ===========================================================

  it('ADMIN can reorder the complete question list -> 200', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(auth())
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[3],
            display_order: 2,
          },
          {
            question_id: questionIds[2],
            display_order: 3,
          },
          {
            question_id: questionIds[1],
            display_order: 4,
          },
          {
            question_id: questionIds[0],
            display_order: 5,
          },
        ],
      });

    expect(response.status).toBe(200);

    expect(response.body).toHaveLength(5);

    expect(
      response.body.map(
        (question: any) => question.id,
      ),
    ).toEqual([
      questionIds[4],
      questionIds[3],
      questionIds[2],
      questionIds[1],
      questionIds[0],
    ]);

    expect(
      response.body.map(
        (question: any) =>
          question.display_order,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  // ===========================================================
  // 2. Persistence
  // ===========================================================

  it('GET returns questions in the persisted reordered sequence -> 200', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get(questionsUrl())
      .set(auth());

    expect(response.status).toBe(200);

    expect(response.body).toHaveLength(5);

    expect(
      response.body.map(
        (question: any) => question.id,
      ),
    ).toEqual([
      questionIds[4],
      questionIds[3],
      questionIds[2],
      questionIds[1],
      questionIds[0],
    ]);

    expect(
      response.body.map(
        (question: any) =>
          question.display_order,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  // ===========================================================
  // 3. Duplicate display_order
  // ===========================================================

  it('rejects duplicate display_order values -> 400', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(auth())
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[3],
            display_order: 1,
          },
          {
            question_id: questionIds[2],
            display_order: 3,
          },
          {
            question_id: questionIds[1],
            display_order: 4,
          },
          {
            question_id: questionIds[0],
            display_order: 5,
          },
        ],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      'Each display_order must be unique',
    );
  });

  // ===========================================================
  // 4. Failed reorder must not change saved order
  // ===========================================================

  it('failed reorder does not change the saved order -> 200', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .get(questionsUrl())
      .set(auth());

    expect(response.status).toBe(200);

    expect(
      response.body.map(
        (question: any) => question.id,
      ),
    ).toEqual([
      questionIds[4],
      questionIds[3],
      questionIds[2],
      questionIds[1],
      questionIds[0],
    ]);

    expect(
      response.body.map(
        (question: any) =>
          question.display_order,
      ),
    ).toEqual([1, 2, 3, 4, 5]);
  });

  // ===========================================================
  // 5. Incomplete list
  // ===========================================================

  it('rejects an incomplete question list -> 400', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(auth())
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[3],
            display_order: 2,
          },
          {
            question_id: questionIds[2],
            display_order: 3,
          },
          {
            question_id: questionIds[1],
            display_order: 4,
          },
        ],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      'The complete question list is required when reordering',
    );
  });

  // ===========================================================
  // 6. Duplicate question ID
  // ===========================================================

  it('rejects duplicate question_id values -> 400', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(auth())
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[4],
            display_order: 2,
          },
          {
            question_id: questionIds[2],
            display_order: 3,
          },
          {
            question_id: questionIds[1],
            display_order: 4,
          },
          {
            question_id: questionIds[0],
            display_order: 5,
          },
        ],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      'Each question_id must be unique',
    );
  });

  // ===========================================================
  // 7. Invalid display_order sequence
  // ===========================================================

  it('rejects a non-contiguous display_order sequence -> 400', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(auth())
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[3],
            display_order: 3,
          },
          {
            question_id: questionIds[2],
            display_order: 4,
          },
          {
            question_id: questionIds[1],
            display_order: 5,
          },
          {
            question_id: questionIds[0],
            display_order: 6,
          },
        ],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      'display_order must contain every position from 1 to 5',
    );
  });

  // ===========================================================
  // 8. Question from another version
  // ===========================================================

  it('rejects a question belonging to another survey version -> 400', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(auth())
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[3],
            display_order: 2,
          },
          {
            question_id: questionIds[2],
            display_order: 3,
          },
          {
            question_id: questionIds[1],
            display_order: 4,
          },
          {
            question_id: otherQuestionId,
            display_order: 5,
          },
        ],
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      `Question ${otherQuestionId} does not belong to this survey version`,
    );
  });

  // ===========================================================
  // 9. STUDENT authorization
  // ===========================================================

  it('STUDENT cannot reorder questions -> 403', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(reorderUrl())
      .set(
        'Authorization',
        `Bearer ${studentToken}`,
      )
      .send({
        questions: [
          {
            question_id: questionIds[4],
            display_order: 1,
          },
          {
            question_id: questionIds[3],
            display_order: 2,
          },
          {
            question_id: questionIds[2],
            display_order: 3,
          },
          {
            question_id: questionIds[1],
            display_order: 4,
          },
          {
            question_id: questionIds[0],
            display_order: 5,
          },
        ],
      });

    expect(response.status).toBe(403);
  });

  // ===========================================================
  // 10. Locked / active version protection
  // ===========================================================

  it('cannot reorder a version used by an OPEN evaluation -> 409', async () => {
    const response = await request(
      app.getHttpServer(),
    )
      .put(
        '/api/survey-versions/1/questions/reorder',
      )
      .set(auth())
      .send({
        questions: [
          {
            question_id: '1',
            display_order: 1,
          },
        ],
      });

    expect(response.status).toBe(409);
  });
});