import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { question_type } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';
import { SubmissionsService } from './submissions.service';

describe('SubmissionsService', () => {
  let service: SubmissionsService;

  const getAnswerableEvaluationMock =
    jest.fn<
      (
        evaluationId: bigint,
        studentId: bigint,
      ) => Promise<any>
    >();

  const questionsFindManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const evaluationFindUniqueMock =
    jest.fn<(args: any) => Promise<any>>();

  const participantFindUniqueMock =
    jest.fn<(args: any) => Promise<any>>();

  const participantUpdateManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const responseCreateMock =
    jest.fn<(args: any) => Promise<any>>();

  const answerCreateMock =
    jest.fn<(args: any) => Promise<any>>();

  const answerOptionsCreateManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const draftDeleteManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const transactionMock =
    jest.fn<
      (
        callback: (tx: any) => Promise<any>,
      ) => Promise<any>
    >();

  const prismaMock: any = {
    questions: {
      findMany: questionsFindManyMock,
    },
    $transaction: transactionMock,
  };

  const studentAccessMock: any = {
    getAnswerableEvaluation:
      getAnswerableEvaluationMock,
  };

  const txMock: any = {
    evaluations: {
      findUnique: evaluationFindUniqueMock,
    },

    evaluation_participants: {
      findUnique: participantFindUniqueMock,
      updateMany: participantUpdateManyMock,
    },

    responses: {
      create: responseCreateMock,
    },

    answers: {
      create: answerCreateMock,
    },

    answer_options: {
      createMany: answerOptionsCreateManyMock,
    },

    assessment_drafts: {
      deleteMany: draftDeleteManyMock,
    },
  };

  const evaluationId = 10n;
  const studentId = 20n;
  const participantId = 30n;

  const baseSurveyVersionId = 100n;
  const effectiveSurveyVersionId = 101n;

  const questionId = 501n;
  const optionId = 601n;

  const makeQuestion = (
    overrides: Record<string, any> = {},
  ) => ({
    id: questionId,
    survey_version_id:
      effectiveSurveyVersionId,
    question_text: 'How was the course?',
    question_text_km: null,
    question_type: question_type.RATING,
    category: null,
    is_required: true,
    min_rating: 1,
    max_rating: 5,
    display_order: 1,
    created_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
    updated_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
    question_options: [],
    ...overrides,
  });

  const mockInitialAccess = (
    participantSurveyVersionId:
      | bigint
      | null = effectiveSurveyVersionId,
    effectiveVersionId:
      bigint = effectiveSurveyVersionId,
  ) => {
    getAnswerableEvaluationMock.mockResolvedValue({
      evaluation: {
        id: evaluationId,
        survey_version_id:
          baseSurveyVersionId,
        status: 'OPEN',
      },

      participant: {
        id: participantId,
        evaluation_id: evaluationId,
        student_id: studentId,
        survey_version_id:
          participantSurveyVersionId,
        has_submitted: false,
      },

      effectiveSurveyVersionId:
        effectiveVersionId,
    });
  };

  const mockOpenEvaluation = (
    surveyVersionId:
      bigint = baseSurveyVersionId,
  ) => {
    const now = Date.now();

    evaluationFindUniqueMock.mockResolvedValue({
      status: 'OPEN',
      start_at: new Date(
        now - 60 * 60 * 1000,
      ),
      end_at: new Date(
        now + 60 * 60 * 1000,
      ),
      survey_version_id: surveyVersionId,
    });
  };

  const mockCurrentParticipant = (
    overrides: Record<string, any> = {},
  ) => {
    participantFindUniqueMock.mockResolvedValue({
      id: participantId,
      evaluation_id: evaluationId,
      student_id: studentId,
      survey_version_id:
        effectiveSurveyVersionId,
      has_submitted: false,
      ...overrides,
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          SubmissionsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: StudentAccessService,
            useValue: studentAccessMock,
          },
        ],
      }).compile();

    service =
      module.get<SubmissionsService>(
        SubmissionsService,
      );

    transactionMock.mockImplementation(
      async (
        callback: (tx: any) => Promise<any>,
      ) => callback(txMock),
    );

    mockInitialAccess();
    mockOpenEvaluation();
    mockCurrentParticipant();

    questionsFindManyMock.mockResolvedValue([
      makeQuestion(),
    ]);

    participantUpdateManyMock.mockResolvedValue({
      count: 1,
    });

    responseCreateMock.mockResolvedValue({
      id: 700n,
    });

    answerCreateMock.mockResolvedValue({
      id: 800n,
    });

    answerOptionsCreateManyMock.mockResolvedValue({
      count: 1,
    });

    draftDeleteManyMock.mockResolvedValue({
      count: 1,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load questions from the participant effective survey version', async () => {
    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              questionId.toString(),
            rating_value: 5,
          },
        ],
      },
    );

    expect(
      questionsFindManyMock,
    ).toHaveBeenCalledWith({
      where: {
        survey_version_id:
          effectiveSurveyVersionId,
      },
      include: {
        question_options: true,
      },
    });
  });

  it('should store the effective survey version on the anonymous response', async () => {
    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              questionId.toString(),
            rating_value: 5,
          },
        ],
      },
    );

    expect(
      responseCreateMock,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        evaluation_id: evaluationId,
        survey_version_id:
          effectiveSurveyVersionId,
      }),
    });
  });

  it('should return the submitted survey version', async () => {
    const result = await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              questionId.toString(),
            rating_value: 4,
          },
        ],
      },
    );

    expect(result).toEqual({
      evaluation_id: evaluationId,
      survey_version_id:
        effectiveSurveyVersionId,
      submitted: true,
      message:
        'Evaluation submitted successfully.',
    });
  });

  it('should create an answer using the exact question ID', async () => {
    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              questionId.toString(),
            rating_value: 4,
          },
        ],
      },
    );

    expect(
      answerCreateMock,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        response_id: 700n,
        question_id: questionId,
        rating_value: 4,
        text_value: null,
      }),
    });
  });

  it('should delete the saved draft after successful submission', async () => {
    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              questionId.toString(),
            rating_value: 5,
          },
        ],
      },
    );

    expect(
      draftDeleteManyMock,
    ).toHaveBeenCalledWith({
      where: {
        participant_id: participantId,
      },
    });
  });

  it('should support a historical NULL participant version by falling back to the evaluation base version', async () => {
    mockInitialAccess(
      null,
      baseSurveyVersionId,
    );

    mockCurrentParticipant({
      survey_version_id: null,
    });

    questionsFindManyMock.mockResolvedValue([
      makeQuestion({
        survey_version_id:
          baseSurveyVersionId,
      }),
    ]);

    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              questionId.toString(),
            rating_value: 5,
          },
        ],
      },
    );

    expect(
      questionsFindManyMock,
    ).toHaveBeenCalledWith({
      where: {
        survey_version_id:
          baseSurveyVersionId,
      },
      include: {
        question_options: true,
      },
    });

    expect(
      responseCreateMock,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        survey_version_id:
          baseSurveyVersionId,
      }),
    });

    expect(
      participantUpdateManyMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          survey_version_id: null,
        }),
      }),
    );
  });

  it('should reject when the evaluation is closed before final submission', async () => {
    evaluationFindUniqueMock.mockResolvedValue({
      status: 'CLOSED',
      start_at: new Date(
        Date.now() - 60_000,
      ),
      end_at: new Date(
        Date.now() + 60_000,
      ),
      survey_version_id:
        baseSurveyVersionId,
    });

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      ConflictException,
    );

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();

    expect(
      draftDeleteManyMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject when the evaluation window has expired', async () => {
    evaluationFindUniqueMock.mockResolvedValue({
      status: 'OPEN',
      start_at: new Date(
        Date.now() - 120_000,
      ),
      end_at: new Date(
        Date.now() - 60_000,
      ),
      survey_version_id:
        baseSurveyVersionId,
    });

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      ConflictException,
    );

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject when the participant already submitted', async () => {
    mockCurrentParticipant({
      has_submitted: true,
    });

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      new ConflictException(
        'You have already submitted this evaluation',
      ),
    );

    expect(
      participantUpdateManyMock,
    ).not.toHaveBeenCalled();

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject when the participant disappears before final submission', async () => {
    participantFindUniqueMock.mockResolvedValue(
      null,
    );

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      new ConflictException(
        'You are no longer eligible for this evaluation',
      ),
    );

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject when the participant belongs to another student', async () => {
    mockCurrentParticipant({
      student_id: 999n,
    });

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      new ConflictException(
        'You are no longer eligible for this evaluation',
      ),
    );

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject when the effective survey version changes before submission', async () => {
    mockCurrentParticipant({
      survey_version_id: 999n,
    });

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      new ConflictException(
        'The questionnaire version changed before submission. Please reload the evaluation before submitting.',
      ),
    );

    expect(
      participantUpdateManyMock,
    ).not.toHaveBeenCalled();

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();

    expect(
      draftDeleteManyMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject a concurrent participant change during final update', async () => {
    participantUpdateManyMock.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      new ConflictException(
        'The evaluation assignment changed or was already submitted. Please reload the evaluation.',
      ),
    );

    expect(
      responseCreateMock,
    ).not.toHaveBeenCalled();

    expect(
      draftDeleteManyMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject a question outside the effective survey version', async () => {
    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id: '9999',
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject duplicate answers for the same question', async () => {
    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 4,
            },
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject an out-of-range rating', async () => {
    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 6,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject when a required question is unanswered', async () => {
    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
            },
          ],
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Required question(s) not answered: 1',
      ),
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('should trim TEXT answers before saving', async () => {
    const textQuestionId = 502n;

    questionsFindManyMock.mockResolvedValue([
      makeQuestion({
        id: textQuestionId,
        question_type:
          question_type.TEXT,
        is_required: true,
        min_rating: null,
        max_rating: null,
      }),
    ]);

    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              textQuestionId.toString(),
            text_value:
              '  Clear explanations  ',
          },
        ],
      },
    );

    expect(
      answerCreateMock,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        question_id:
          textQuestionId,
        rating_value: null,
        text_value:
          'Clear explanations',
      }),
    });
  });

  it('should save a valid MULTIPLE_CHOICE option', async () => {
    const mcQuestionId = 503n;

    questionsFindManyMock.mockResolvedValue([
      makeQuestion({
        id: mcQuestionId,
        question_type:
          question_type.MULTIPLE_CHOICE,
        min_rating: null,
        max_rating: null,
        question_options: [
          {
            id: optionId,
            question_id:
              mcQuestionId,
            option_text: 'Excellent',
            display_order: 1,
          },
        ],
      }),
    ]);

    await service.submit(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id:
              mcQuestionId.toString(),
            selected_option_ids: [
              optionId.toString(),
            ],
          },
        ],
      },
    );

    expect(
      answerOptionsCreateManyMock,
    ).toHaveBeenCalledWith({
      data: [
        {
          answer_id: 800n,
          option_id: optionId,
        },
      ],
    });
  });

  it('should reject an option that does not belong to the question', async () => {
    const mcQuestionId = 503n;

    questionsFindManyMock.mockResolvedValue([
      makeQuestion({
        id: mcQuestionId,
        question_type:
          question_type.MULTIPLE_CHOICE,
        min_rating: null,
        max_rating: null,
        question_options: [
          {
            id: optionId,
            question_id:
              mcQuestionId,
            option_text: 'Excellent',
            display_order: 1,
          },
        ],
      }),
    ]);

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                mcQuestionId.toString(),
              selected_option_ids: [
                '9999',
              ],
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject multiple selections for MULTIPLE_CHOICE', async () => {
    const mcQuestionId = 503n;

    questionsFindManyMock.mockResolvedValue([
      makeQuestion({
        id: mcQuestionId,
        question_type:
          question_type.MULTIPLE_CHOICE,
        min_rating: null,
        max_rating: null,
        question_options: [
          {
            id: 601n,
            question_id:
              mcQuestionId,
            option_text: 'Good',
            display_order: 1,
          },
          {
            id: 602n,
            question_id:
              mcQuestionId,
            option_text: 'Excellent',
            display_order: 2,
          },
        ],
      }),
    ]);

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                mcQuestionId.toString(),
              selected_option_ids: [
                '601',
                '602',
              ],
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );

    expect(
      transactionMock,
    ).not.toHaveBeenCalled();
  });

  it('should not delete the draft when response creation fails', async () => {
    responseCreateMock.mockRejectedValue(
      new Error('Database failure'),
    );

    await expect(
      service.submit(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id:
                questionId.toString(),
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      'Database failure',
    );

    expect(
      draftDeleteManyMock,
    ).not.toHaveBeenCalled();
  });
});