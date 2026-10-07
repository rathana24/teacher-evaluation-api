import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { EvaluationsService } from './evaluations.service';

describe('EvaluationsService - question-set lifecycle', () => {
  let service: EvaluationsService;

  const courseOfferingFindUniqueMock =
    jest.fn<() => Promise<any>>();

  const surveyFindUniqueMock =
    jest.fn<() => Promise<any>>();

  const surveyVersionFindFirstMock =
    jest.fn<() => Promise<any>>();

  const evaluationCreateMock =
    jest.fn<() => Promise<any>>();

  const transactionMock =
    jest.fn<
      (
        callback: (tx: any) => Promise<any>,
      ) => Promise<any>
    >();

  const prismaMock: any = {
    course_offerings: {
      findUnique: courseOfferingFindUniqueMock,
    },

    surveys: {
      findUnique: surveyFindUniqueMock,
    },

    survey_versions: {
      findFirst: surveyVersionFindFirstMock,
      update: jest.fn<() => Promise<any>>(),
    },

    evaluations: {
      create: evaluationCreateMock,
      findMany: jest.fn<() => Promise<any[]>>(),
      findUnique: jest.fn<() => Promise<any>>()
        .mockResolvedValue({
          id: BigInt(50),
          course_offering_id: BigInt(1),
          survey_version_id: BigInt(3),
          status: 'DRAFT',
        }),
    },

    enrollments: {
      findMany: jest.fn<() => Promise<any[]>>(),
    },

    evaluation_participants: {
      createMany:
        jest.fn<() => Promise<{ count: number }>>(),
      deleteMany:
        jest.fn<() => Promise<{ count: number }>>(),
    },

    evaluation_generation_targets: {
      createMany:
        jest.fn<() => Promise<{ count: number }>>(),
      deleteMany:
        jest.fn<() => Promise<{ count: number }>>(),
    },

    student_generations: {
      findMany: jest.fn<() => Promise<any[]>>(),
    },

    $transaction: transactionMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          EvaluationsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    service =
      module.get<EvaluationsService>(
        EvaluationsService,
      );

    courseOfferingFindUniqueMock.mockResolvedValue({
      id: BigInt(1),
    });

    surveyFindUniqueMock.mockResolvedValue({
      id: BigInt(2),
      archived_at: null,
    });

    surveyVersionFindFirstMock.mockResolvedValue({
      id: BigInt(3),
      survey_id: BigInt(2),
      status: 'DRAFT',

      surveys: {
        archived_at: null,
      },

      _count: {
        questions: 5,
      },
    });

    evaluationCreateMock.mockResolvedValue({
      id: BigInt(50),
    });

    prismaMock.enrollments.findMany
      .mockResolvedValue([]);

    prismaMock.evaluation_participants.createMany
      .mockResolvedValue({
        count: 0,
      });

    prismaMock.evaluation_generation_targets.createMany
      .mockResolvedValue({
        count: 0,
      });

    transactionMock.mockImplementation(
      async (callback) =>
        callback(prismaMock),
    );
  });

  it('allows a new evaluation using an active question set', async () => {
    await service.create(
      {
        course_offering_id: '1',
        survey_id: '2',
      },
      BigInt(10),
    );

    expect(
      evaluationCreateMock,
    ).toHaveBeenCalled();
  });

  it('rejects an archived question set selected by survey_id', async () => {
    surveyFindUniqueMock.mockResolvedValue({
      id: BigInt(2),
      archived_at: new Date(),
    });

    await expect(
      service.create(
        {
          course_offering_id: '1',
          survey_id: '2',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'An archived question set cannot be used for a new evaluation',
      ),
    );

    expect(
      evaluationCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('rejects an archived question set selected through an explicit version', async () => {
    surveyVersionFindFirstMock.mockResolvedValue({
      id: BigInt(3),
      survey_id: BigInt(2),
      status: 'DRAFT',

      surveys: {
        archived_at: new Date(),
      },

      _count: {
        questions: 5,
      },
    });

    await expect(
      service.create(
        {
          course_offering_id: '1',
          survey_version_id: '3',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'An archived question set cannot be used for a new evaluation',
      ),
    );

    expect(
      evaluationCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('rejects an individually archived survey version', async () => {
    surveyVersionFindFirstMock.mockResolvedValue({
      id: BigInt(3),
      survey_id: BigInt(2),
      status: 'ARCHIVED',

      surveys: {
        archived_at: null,
      },

      _count: {
        questions: 5,
      },
    });

    await expect(
      service.create(
        {
          course_offering_id: '1',
          survey_version_id: '3',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'An archived survey version cannot be used for a new evaluation',
      ),
    );

    expect(
      evaluationCreateMock,
    ).not.toHaveBeenCalled();
  });

  it('allows a LOCKED version belonging to an active question set', async () => {
    surveyVersionFindFirstMock.mockResolvedValue({
      id: BigInt(3),
      survey_id: BigInt(2),
      status: 'LOCKED',

      surveys: {
        archived_at: null,
      },

      _count: {
        questions: 5,
      },
    });

    await service.create(
      {
        course_offering_id: '1',
        survey_version_id: '3',
      },
      BigInt(10),
    );

    expect(
      evaluationCreateMock,
    ).toHaveBeenCalled();
  });

  it('rejects a version with no questions', async () => {
    surveyVersionFindFirstMock.mockResolvedValue({
      id: BigInt(3),
      survey_id: BigInt(2),
      status: 'DRAFT',

      surveys: {
        archived_at: null,
      },

      _count: {
        questions: 0,
      },
    });

    await expect(
      service.create(
        {
          course_offering_id: '1',
          survey_version_id: '3',
        },
        BigInt(10),
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'The survey version has no questions',
      ),
    );

    expect(
      evaluationCreateMock,
    ).not.toHaveBeenCalled();
  });
});