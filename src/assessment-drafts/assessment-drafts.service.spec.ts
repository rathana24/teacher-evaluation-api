import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { question_type } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';
import { AssessmentDraftsService } from './assessment-drafts.service';

describe('AssessmentDraftsService', () => {
  let service: AssessmentDraftsService;

  const draftFindUniqueMock =
    jest.fn<(args?: any) => Promise<any>>();

  const draftUpsertMock =
    jest.fn<(args: any) => Promise<any>>();

  const draftDeleteManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionsFindManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const getAnswerableEvaluationMock =
    jest.fn<
      (
        evaluationId: bigint,
        studentId: bigint,
      ) => Promise<any>
    >();

  const prismaMock: any = {
    assessment_drafts: {
      findUnique: draftFindUniqueMock,
      upsert: draftUpsertMock,
      deleteMany: draftDeleteManyMock,
    },

    questions: {
      findMany: questionsFindManyMock,
    },
  };

  const studentAccessMock: any = {
    getAnswerableEvaluation:
      getAnswerableEvaluationMock,
  };

  const evaluationId = 100n;
  const studentId = 200n;
  const participantId = 300n;

  const baseSurveyVersionId = 10n;
  const effectiveSurveyVersionId = 11n;

  const participant = {
    id: participantId,
    evaluation_id: evaluationId,
    student_id: studentId,
    survey_version_id:
      effectiveSurveyVersionId,
    has_submitted: false,
    submitted_at: null,
    created_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
  };

  const evaluation = {
    id: evaluationId,
    course_offering_id: 50n,
    survey_version_id: baseSurveyVersionId,
    status: 'OPEN',
    start_at: new Date(
      '2026-10-01T00:00:00.000Z',
    ),
    end_at: new Date(
      '2026-10-31T23:59:59.000Z',
    ),
  };

  const ratingQuestion = {
    id: 501n,
    survey_version_id:
      effectiveSurveyVersionId,
    question_text: 'Rate the lecturer',
    question_text_km: null,
    question_type: question_type.RATING,
    category: 'Teaching Quality',
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
  };

  const textQuestion = {
    id: 502n,
    survey_version_id:
      effectiveSurveyVersionId,
    question_text: 'Comment',
    question_text_km: null,
    question_type: question_type.TEXT,
    category: null,
    is_required: false,
    min_rating: null,
    max_rating: null,
    display_order: 2,
    created_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
    updated_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
    question_options: [],
  };

  const multipleChoiceQuestion = {
    id: 503n,
    survey_version_id:
      effectiveSurveyVersionId,
    question_text: 'Choose one',
    question_text_km: null,
    question_type:
      question_type.MULTIPLE_CHOICE,
    category: null,
    is_required: false,
    min_rating: null,
    max_rating: null,
    display_order: 3,
    created_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
    updated_at: new Date(
      '2026-10-04T00:00:00.000Z',
    ),
    question_options: [
      {
        id: 601n,
        question_id: 503n,
        option_text: 'Option A',
        display_order: 1,
      },
      {
        id: 602n,
        question_id: 503n,
        option_text: 'Option B',
        display_order: 2,
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AssessmentDraftsService,
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
      module.get<AssessmentDraftsService>(
        AssessmentDraftsService,
      );

    getAnswerableEvaluationMock.mockResolvedValue(
      {
        evaluation,
        participant,
        effectiveSurveyVersionId,
      },
    );

    draftFindUniqueMock.mockResolvedValue(
      null,
    );

    questionsFindManyMock.mockResolvedValue([
      ratingQuestion,
      textQuestion,
      multipleChoiceQuestion,
    ]);

    draftUpsertMock.mockResolvedValue({
      id: 700n,
      participant_id: participantId,
      survey_version_id:
        effectiveSurveyVersionId,
      answers_json: [
        {
          question_id: '501',
          rating_value: 5,
        },
      ],
      created_at: new Date(
        '2026-10-04T01:00:00.000Z',
      ),
      updated_at: new Date(
        '2026-10-04T01:00:00.000Z',
      ),
    });

    draftDeleteManyMock.mockResolvedValue({
      count: 1,
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should save a draft using the participant effective survey version', async () => {
    const result = await service.save(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id: '501',
            rating_value: 5,
          },
        ],
      },
    );

    expect(
      getAnswerableEvaluationMock,
    ).toHaveBeenCalledWith(
      evaluationId,
      studentId,
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

    expect(
      draftUpsertMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          participant_id: participantId,
        },

        update: expect.objectContaining({
          survey_version_id:
            effectiveSurveyVersionId,
        }),

        create: expect.objectContaining({
          participant_id: participantId,
          survey_version_id:
            effectiveSurveyVersionId,
        }),
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        evaluation_id: evaluationId,
        survey_version_id:
          effectiveSurveyVersionId,

        draft: expect.objectContaining({
          id: 700n,
          survey_version_id:
            effectiveSurveyVersionId,
        }),
      }),
    );
  });

  it('should allow replacing an existing draft when the version is unchanged', async () => {
    draftFindUniqueMock.mockResolvedValue({
      id: 700n,
      survey_version_id:
        effectiveSurveyVersionId,
    });

    await service.save(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id: '501',
            rating_value: 4,
          },
        ],
      },
    );

    expect(
      draftUpsertMock,
    ).toHaveBeenCalledTimes(1);
  });

  it('should reject overwriting a draft from a different survey version', async () => {
    draftFindUniqueMock.mockResolvedValue({
      id: 700n,
      survey_version_id: 9n,
    });

    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [],
        },
      ),
    ).rejects.toThrow(ConflictException);

    expect(
      questionsFindManyMock,
    ).not.toHaveBeenCalled();

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject updating a historical draft whose survey version is null', async () => {
    draftFindUniqueMock.mockResolvedValue({
      id: 700n,
      survey_version_id: null,
    });

    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [],
        },
      ),
    ).rejects.toThrow(ConflictException);

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject saving after submission', async () => {
    getAnswerableEvaluationMock.mockResolvedValue(
      {
        evaluation,
        participant: {
          ...participant,
          has_submitted: true,
        },
        effectiveSurveyVersionId,
      },
    );

    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [],
        },
      ),
    ).rejects.toThrow(ConflictException);

    expect(
      draftFindUniqueMock,
    ).not.toHaveBeenCalled();

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should allow an incomplete draft', async () => {
    await service.save(
      evaluationId,
      studentId,
      {
        answers: [],
      },
    );

    expect(
      draftUpsertMock,
    ).toHaveBeenCalledTimes(1);
  });

  it('should reject a question that is not part of the effective survey version', async () => {
    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id: '999',
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject duplicate answers for the same question', async () => {
    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id: '501',
              rating_value: 4,
            },
            {
              question_id: '501',
              rating_value: 5,
            },
          ],
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject a rating outside the configured range', async () => {
    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id: '501',
              rating_value: 6,
            },
          ],
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should trim text answers before saving', async () => {
    await service.save(
      evaluationId,
      studentId,
      {
        answers: [
          {
            question_id: '502',
            text_value: '  Good lecturer  ',
          },
        ],
      },
    );

    expect(
      draftUpsertMock,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          answers_json: [
            {
              question_id: '502',
              text_value: 'Good lecturer',
            },
          ],
        }),
      }),
    );
  });

  it('should reject an option that does not belong to the question', async () => {
    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id: '503',
              selected_option_ids: ['999'],
            },
          ],
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject multiple selected options for a multiple-choice question', async () => {
    await expect(
      service.save(
        evaluationId,
        studentId,
        {
          answers: [
            {
              question_id: '503',
              selected_option_ids: [
                '601',
                '602',
              ],
            },
          ],
        },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(
      draftUpsertMock,
    ).not.toHaveBeenCalled();
  });

  it('should load a draft when its survey version matches the participant effective version', async () => {
    const savedDraft = {
      id: 700n,
      participant_id: participantId,
      survey_version_id:
        effectiveSurveyVersionId,
      answers_json: [
        {
          question_id: '501',
          rating_value: 5,
        },
      ],
      created_at: new Date(
        '2026-10-04T01:00:00.000Z',
      ),
      updated_at: new Date(
        '2026-10-04T01:00:00.000Z',
      ),
    };

    draftFindUniqueMock.mockResolvedValue(
      savedDraft,
    );

    const result =
      await service.findMyDraft(
        evaluationId,
        studentId,
      );

    expect(result).toEqual({
      evaluation_id: evaluationId,

      survey_version_id:
        effectiveSurveyVersionId,

      draft: {
        id: savedDraft.id,

        survey_version_id:
          effectiveSurveyVersionId,

        answers: savedDraft.answers_json,
        created_at: savedDraft.created_at,
        updated_at: savedDraft.updated_at,
      },
    });
  });

  it('should reject loading a draft from a different survey version', async () => {
    draftFindUniqueMock.mockResolvedValue({
      id: 700n,
      participant_id: participantId,
      survey_version_id: 9n,
      answers_json: [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(
      service.findMyDraft(
        evaluationId,
        studentId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject loading a historical draft whose version is null', async () => {
    draftFindUniqueMock.mockResolvedValue({
      id: 700n,
      participant_id: participantId,
      survey_version_id: null,
      answers_json: [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    await expect(
      service.findMyDraft(
        evaluationId,
        studentId,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should return not found when there is no saved draft', async () => {
    draftFindUniqueMock.mockResolvedValue(
      null,
    );

    await expect(
      service.findMyDraft(
        evaluationId,
        studentId,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should delete the current participant draft', async () => {
    const result = await service.remove(
      evaluationId,
      studentId,
    );

    expect(
      draftDeleteManyMock,
    ).toHaveBeenCalledWith({
      where: {
        participant_id: participantId,
      },
    });

    expect(result).toEqual({
      evaluation_id: evaluationId,
      deleted: true,
      message:
        'Assessment draft deleted successfully.',
    });
  });

  it('should return not found when deleting a draft that does not exist', async () => {
    draftDeleteManyMock.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.remove(
        evaluationId,
        studentId,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});