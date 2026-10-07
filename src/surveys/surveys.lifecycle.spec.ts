import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SurveysService } from './surveys.service';

describe('SurveysService lifecycle safeguards', () => {
  let service: SurveysService;

  const surveyFindManyMock =
    jest.fn<(args?: any) => Promise<any[]>>();

  const surveyFindUniqueMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyFindUniqueOrThrowMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyFindFirstMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyCreateMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyUpdateMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyDeleteMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyVersionCreateMock =
    jest.fn<(args: any) => Promise<any>>();

  const surveyVersionDeleteManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionFindManyMock =
    jest.fn<(args: any) => Promise<any[]>>();

  const questionDeleteManyMock =
    jest.fn<(args: any) => Promise<any>>();

  const questionOptionDeleteManyMock =
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
    surveys: {
      findMany: surveyFindManyMock,
      findUnique: surveyFindUniqueMock,
      findUniqueOrThrow:
        surveyFindUniqueOrThrowMock,
      findFirst: surveyFindFirstMock,
      create: surveyCreateMock,
      update: surveyUpdateMock,
      delete: surveyDeleteMock,
    },

    survey_versions: {
      create: surveyVersionCreateMock,
      deleteMany: surveyVersionDeleteManyMock,
    },

    questions: {
      findMany: questionFindManyMock,
      deleteMany: questionDeleteManyMock,
    },

    question_options: {
      deleteMany: questionOptionDeleteManyMock,
    },

    $transaction: transactionMock,
  };

  const activeSurvey = {
    id: BigInt(1),
    title: 'Teaching Quality',
    description: 'Main question set',
    archived_at: null,
    created_by: BigInt(10),
    created_at: new Date(
      '2026-10-05T00:00:00.000Z',
    ),
    updated_at: new Date(
      '2026-10-05T00:00:00.000Z',
    ),
    users: {
      id: BigInt(10),
      full_name: 'Admin User',
    },
    survey_versions: [
      {
        id: BigInt(11),
        version_no: 1,
        status: 'DRAFT',
        locked_at: null,
        created_at: new Date(
          '2026-10-05T00:00:00.000Z',
        ),
        _count: {
          questions: 0,
          evaluations: 0,
          evaluation_participants: 0,
          assessment_drafts: 0,
          responses: 0,
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          SurveysService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    service =
      module.get<SurveysService>(
        SurveysService,
      );

    transactionMock.mockImplementation(
      async (callback) =>
        callback(prismaMock),
    );

    surveyFindFirstMock
      .mockResolvedValue(null);

    surveyCreateMock
      .mockResolvedValue({
        id: BigInt(1),
        title: 'Teaching Quality',
      });

    surveyVersionCreateMock
      .mockResolvedValue({
        id: BigInt(11),
        survey_id: BigInt(1),
        version_no: 1,
        status: 'DRAFT',
      });

    surveyFindUniqueOrThrowMock
      .mockResolvedValue(activeSurvey);

    surveyUpdateMock
      .mockResolvedValue(activeSurvey);

    surveyDeleteMock
      .mockResolvedValue(activeSurvey);

    questionFindManyMock
      .mockResolvedValue([]);

    questionDeleteManyMock
      .mockResolvedValue({
        count: 0,
      });

    questionOptionDeleteManyMock
      .mockResolvedValue({
        count: 0,
      });

    surveyVersionDeleteManyMock
      .mockResolvedValue({
        count: 1,
      });
  });

  it('creates a question set and Version 1 atomically', async () => {
    const result = await service.create(
      {
        title: '  Teaching Quality  ',
        description: '  Main question set  ',
      },
      BigInt(10),
    );

    expect(transactionMock)
      .toHaveBeenCalledTimes(1);

    expect(surveyCreateMock)
      .toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Teaching Quality',
          description: 'Main question set',
          created_by: BigInt(10),
        }),
      });

    expect(surveyVersionCreateMock)
      .toHaveBeenCalledWith({
        data: expect.objectContaining({
          survey_id: BigInt(1),
          version_no: 1,
          status: 'DRAFT',
          created_by: BigInt(10),
        }),
      });

    expect(result).toEqual(activeSurvey);
  });

  it('rejects a duplicate normalized title', async () => {
    surveyFindFirstMock
      .mockResolvedValue({
        id: BigInt(99),
        archived_at: null,
      });

    await expect(
      service.create(
        {
          title: '  Teaching Quality  ',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new ConflictException(
        'A question set with this title already exists',
      ),
    );

    expect(surveyCreateMock)
      .not.toHaveBeenCalled();

    expect(surveyVersionCreateMock)
      .not.toHaveBeenCalled();
  });

  it('rejects a blank question-set title', async () => {
    await expect(
      service.create(
        {
          title: '   ',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Question set title cannot be blank',
      ),
    );

    expect(transactionMock)
      .not.toHaveBeenCalled();
  });

  it('rejects a title longer than 200 characters', async () => {
    await expect(
      service.create(
        {
          title: 'A'.repeat(201),
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'Question set title cannot exceed 200 characters',
      ),
    );

    expect(transactionMock)
      .not.toHaveBeenCalled();
  });

  it('archives the whole question set without deleting history', async () => {
    surveyFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
        archived_at: null,
      });

    surveyFindUniqueOrThrowMock
      .mockResolvedValue({
        ...activeSurvey,
        archived_at: new Date(
          '2026-10-05T01:00:00.000Z',
        ),
      });

    const result =
      await service.archive(BigInt(1));

    expect(surveyUpdateMock)
      .toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        data: {
          archived_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });

    expect(surveyVersionDeleteManyMock)
      .not.toHaveBeenCalled();

    expect(questionDeleteManyMock)
      .not.toHaveBeenCalled();

    expect(result.archived_at)
      .not.toBeNull();
  });

  it('rejects archiving an already archived question set', async () => {
    surveyFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
        archived_at: new Date(
          '2026-10-05T01:00:00.000Z',
        ),
      });

    await expect(
      service.archive(BigInt(1)),
    ).rejects.toThrow(
      new ConflictException(
        'Question set is already archived',
      ),
    );

    expect(surveyUpdateMock)
      .not.toHaveBeenCalled();
  });

  it('keeps archived question sets read-only', async () => {
    surveyFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
        title: 'Teaching Quality',
        description: 'Main question set',
        archived_at: new Date(
          '2026-10-05T01:00:00.000Z',
        ),
      });

    await expect(
      service.update(
        BigInt(1),
        {
          title: 'Changed Title',
        },
      ),
    ).rejects.toThrow(
      new ConflictException(
        'Archived question sets are read-only and cannot be updated',
      ),
    );

    expect(transactionMock)
      .not.toHaveBeenCalled();
  });

  it('returns authoritative usage totals across all versions', async () => {
    surveyFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
        title: 'Teaching Quality',
        archived_at: null,

        survey_versions: [
          {
            id: BigInt(11),
            version_no: 1,
            status: 'LOCKED',
            _count: {
              questions: 5,
              evaluations: 2,
              evaluation_participants: 20,
              assessment_drafts: 1,
              responses: 15,
            },
          },
          {
            id: BigInt(12),
            version_no: 2,
            status: 'DRAFT',
            _count: {
              questions: 6,
              evaluations: 1,
              evaluation_participants: 10,
              assessment_drafts: 2,
              responses: 8,
            },
          },
        ],
      });

    const result =
      await service.getUsage(BigInt(1));

    expect(result.version_count).toBe(2);

    expect(result.totals).toEqual({
      questions: 11,
      evaluations: 3,
      evaluation_participants: 30,
      assessment_drafts: 3,
      responses: 23,
    });

    expect(
      result.has_historical_usage,
    ).toBe(true);

    expect(result.can_delete)
      .toBe(false);
  });

  it('allows an unused question set to be deleted atomically', async () => {
    surveyFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
        title: 'Unused Set',

        survey_versions: [
          {
            id: BigInt(11),
            _count: {
              evaluations: 0,
              evaluation_participants: 0,
              assessment_drafts: 0,
              responses: 0,
            },
          },
        ],
      });

    questionFindManyMock
      .mockResolvedValue([
        {
          id: BigInt(101),
        },
        {
          id: BigInt(102),
        },
      ]);

    const result =
      await service.remove(BigInt(1));

    expect(
      questionOptionDeleteManyMock,
    ).toHaveBeenCalledWith({
      where: {
        question_id: {
          in: [
            BigInt(101),
            BigInt(102),
          ],
        },
      },
    });

    expect(questionDeleteManyMock)
      .toHaveBeenCalledWith({
        where: {
          survey_version_id: {
            in: [BigInt(11)],
          },
        },
      });

    expect(surveyVersionDeleteManyMock)
      .toHaveBeenCalledWith({
        where: {
          id: {
            in: [BigInt(11)],
          },
        },
      });

    expect(surveyDeleteMock)
      .toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
      });

    expect(result).toEqual({
      deleted: true,
      survey_id: '1',
      title: 'Unused Set',
    });
  });

  it('rejects deletion when historical dependencies exist', async () => {
    surveyFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
        title: 'Used Set',

        survey_versions: [
          {
            id: BigInt(11),
            _count: {
              evaluations: 1,
              evaluation_participants: 0,
              assessment_drafts: 0,
              responses: 0,
            },
          },
        ],
      });

    await expect(
      service.remove(BigInt(1)),
    ).rejects.toThrow(
      new ConflictException(
        'Question set is referenced by evaluation history, participants, drafts, or responses and cannot be deleted',
      ),
    );

    expect(questionFindManyMock)
      .not.toHaveBeenCalled();

    expect(surveyDeleteMock)
      .not.toHaveBeenCalled();
  });

  it('returns 404 when trying to delete a missing question set', async () => {
    surveyFindUniqueMock
      .mockResolvedValue(null);

    await expect(
      service.remove(BigInt(999)),
    ).rejects.toThrow(
      new NotFoundException(
        'Question set not found',
      ),
    );

    expect(surveyDeleteMock)
      .not.toHaveBeenCalled();
  });

  it('maps concurrent creation conflicts to a review-and-retry conflict', async () => {
    transactionMock
      .mockRejectedValueOnce({
        code: 'P2034',
      });

    await expect(
      service.create(
        {
          title: 'Teaching Quality',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new ConflictException(
        'The question set changed during creation. Please review the latest data and try again.',
      ),
    );
  });

  it('maps foreign-key delete races to a safe conflict', async () => {
    transactionMock
      .mockRejectedValueOnce({
        code: 'P2003',
      });

    await expect(
      service.remove(BigInt(1)),
    ).rejects.toThrow(
      new ConflictException(
        'Question set is referenced by historical data and cannot be deleted',
      ),
    );
  });
});