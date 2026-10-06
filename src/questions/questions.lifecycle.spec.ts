import { jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { question_type } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SurveyVersionsService } from '../survey-versions/survey-versions.service';
import { QuestionsService } from './questions.service';

describe('QuestionsService lifecycle safeguards', () => {
  let service: QuestionsService;

  const assertEditableMock =
    jest.fn<(versionId: bigint) => Promise<any>>();

  const questionCountMock =
    jest.fn<(args: any) => Promise<number>>();

  const questionFindUniqueMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionFindManyMock =
    jest.fn<(args: any) => Promise<any[]>>();

  const questionCreateMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionUpdateMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionDeleteMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionOptionDeleteManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionOptionCreateManyMock =
    jest.fn<(args: any) => Promise<any>>();

  type TransactionCallback = (
    tx: any,
  ) => Promise<any>;

  const transactionMock =
    jest.fn<
      (
        callback: TransactionCallback,
        options?: any,
      ) => Promise<any>
    >();

  const prismaMock: any = {
    questions: {
      count: questionCountMock,
      findUnique: questionFindUniqueMock,
      findMany: questionFindManyMock,
      create: questionCreateMock,
      update: questionUpdateMock,
      delete: questionDeleteMock,
    },

    question_options: {
      deleteMany: questionOptionDeleteManyMock,
      createMany: questionOptionCreateManyMock,
    },

    $transaction: transactionMock,
  };

  const surveyVersionsMock = {
    assertEditable: assertEditableMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          QuestionsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: SurveyVersionsService,
            useValue: surveyVersionsMock,
          },
        ],
      }).compile();

    service =
      module.get<QuestionsService>(
        QuestionsService,
      );

    assertEditableMock
      .mockResolvedValue(undefined);

    questionCountMock
      .mockResolvedValue(0);

    questionFindManyMock
      .mockResolvedValue([]);

    questionCreateMock
      .mockResolvedValue({
        id: BigInt(101),
        survey_version_id: BigInt(11),
        question_text: 'Teaching quality?',
        question_type: question_type.RATING,
        min_rating: 1,
        max_rating: 5,
        display_order: 1,
        question_options: [],
      });

    questionUpdateMock
      .mockResolvedValue({
        id: BigInt(101),
        survey_version_id: BigInt(11),
        question_text: 'Updated question',
        question_type: question_type.RATING,
        min_rating: 1,
        max_rating: 5,
        display_order: 1,
        question_options: [],
      });

    questionDeleteMock
      .mockResolvedValue({
        id: BigInt(101),
      });

    questionOptionDeleteManyMock
      .mockResolvedValue({
        count: 0,
      });

    questionOptionCreateManyMock
      .mockResolvedValue({
        count: 0,
      });

    transactionMock.mockImplementation(
      async (callback) =>
        callback(prismaMock),
    );
  });

  it('allows creating a question when the version is editable', async () => {
    await service.create(
      BigInt(11),
      {
        question_text: 'Teaching quality?',
        question_type: question_type.RATING,
        min_rating: 1,
        max_rating: 5,
      },
    );

    expect(assertEditableMock)
      .toHaveBeenCalledWith(BigInt(11));

    expect(questionCreateMock)
      .toHaveBeenCalledTimes(1);
  });

  it('blocks question creation when lifecycle guard rejects the version', async () => {
    assertEditableMock
      .mockRejectedValueOnce(
        new ConflictException(
          'Only the latest survey version can be edited',
        ),
      );

    await expect(
      service.create(
        BigInt(11),
        {
          question_text: 'Blocked question',
          question_type: question_type.RATING,
          min_rating: 1,
          max_rating: 5,
        },
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(questionCountMock)
      .not.toHaveBeenCalled();

    expect(transactionMock)
      .not.toHaveBeenCalled();

    expect(questionCreateMock)
      .not.toHaveBeenCalled();
  });

  it('blocks question creation for a LOCKED version', async () => {
    assertEditableMock
      .mockRejectedValueOnce(
        new ConflictException(
          'Survey version is not editable',
        ),
      );

    await expect(
      service.create(
        BigInt(11),
        {
          question_text: 'Blocked question',
          question_type: question_type.RATING,
          min_rating: 1,
          max_rating: 5,
        },
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(transactionMock)
      .not.toHaveBeenCalled();
  });

  it('blocks question creation when the whole question set is archived', async () => {
    assertEditableMock
      .mockRejectedValueOnce(
        new ConflictException(
          'Archived question sets are read-only',
        ),
      );

    await expect(
      service.create(
        BigInt(11),
        {
          question_text: 'Blocked question',
          question_type: question_type.RATING,
          min_rating: 1,
          max_rating: 5,
        },
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(transactionMock)
      .not.toHaveBeenCalled();
  });

  it('blocks updating a question when its version is not editable', async () => {
    questionFindUniqueMock
      .mockResolvedValue({
        id: BigInt(101),
        survey_version_id: BigInt(11),
        question_text: 'Old question',
        question_text_km: null,
        question_type: question_type.RATING,
        category: null,
        is_required: true,
        min_rating: 1,
        max_rating: 5,
        display_order: 1,
      });

    assertEditableMock
      .mockRejectedValueOnce(
        new ConflictException(
          'Only the latest survey version can be edited',
        ),
      );

    await expect(
      service.update(
        BigInt(101),
        {
          question_text: 'Changed question',
        },
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(assertEditableMock)
      .toHaveBeenCalledWith(BigInt(11));

    expect(transactionMock)
      .not.toHaveBeenCalled();

    expect(questionUpdateMock)
      .not.toHaveBeenCalled();
  });

  it('blocks deleting a question when its version is historically protected', async () => {
    questionFindUniqueMock
      .mockResolvedValue({
        id: BigInt(101),
        survey_version_id: BigInt(11),
        question_text: 'Historical question',
        question_type: question_type.RATING,
        min_rating: 1,
        max_rating: 5,
        display_order: 1,
      });

    assertEditableMock
      .mockRejectedValueOnce(
        new ConflictException(
          'Survey version is already referenced by historical data',
        ),
      );

    await expect(
      service.remove(BigInt(101)),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(assertEditableMock)
      .toHaveBeenCalledWith(BigInt(11));

    expect(transactionMock)
      .not.toHaveBeenCalled();

    expect(questionDeleteMock)
      .not.toHaveBeenCalled();
  });

  it('blocks reordering questions when the version is stale', async () => {
    assertEditableMock
      .mockRejectedValueOnce(
        new ConflictException(
          'Only the latest survey version can be edited',
        ),
      );

    await expect(
      service.reorder(
        BigInt(11),
        {
          questions: [
            {
              question_id: '101',
              display_order: 1,
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(assertEditableMock)
      .toHaveBeenCalledWith(BigInt(11));

    expect(questionFindManyMock)
      .not.toHaveBeenCalled();

    expect(transactionMock)
      .not.toHaveBeenCalled();
  });
});