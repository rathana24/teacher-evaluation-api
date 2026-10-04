import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  StudentEvaluationProgressService,
} from './student-evaluation-progress.service';

describe(
  'StudentEvaluationProgressService',
  () => {
    let service: StudentEvaluationProgressService;

    const participantFindManyMock =
      jest.fn<
        (
          args: Prisma.evaluation_participantsFindManyArgs,
        ) => Promise<unknown[]>
      >();

    const prismaMock = {
      evaluation_participants: {
        findMany:
          participantFindManyMock,
      },
    };

    const now = new Date(
      '2026-10-04T12:00:00.000Z',
    );

    beforeEach(() => {
      jest.clearAllMocks();

      service =
        new StudentEvaluationProgressService(
          prismaMock as unknown as PrismaService,
        );

      participantFindManyMock
        .mockResolvedValue([]);
    });

    it('should return zero progress when the student has no assignments', async () => {
      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        participantFindManyMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        participantFindManyMock,
      ).toHaveBeenCalledWith({
        where: {
          student_id: {
            in: [BigInt(100)],
          },

          evaluations: {
            is: {
              status: {
                in: [
                  'OPEN',
                  'CLOSED',
                ],
              },
            },
          },
        },

        select: {
          student_id: true,
          has_submitted: true,

          evaluations: {
            select: {
              id: true,
              status: true,
              start_at: true,
              end_at: true,
            },
          },
        },
      });

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 0,
        },

        total: {
          completed: 0,
          assigned: 0,
        },
      });
    });

    it('should count a currently active unsubmitted OPEN evaluation as active and total assigned', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: false,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 1,
        },

        total: {
          completed: 0,
          assigned: 1,
        },
      });
    });

    it('should keep a submitted active evaluation in the active denominator and count it as completed', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 1,
          assigned: 1,
        },

        total: {
          completed: 1,
          assigned: 1,
        },
      });
    });

    it('should include an upcoming OPEN evaluation in total but not active progress', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: false,

            evaluations: {
              id: BigInt(2),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-05T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-05T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 0,
        },

        total: {
          completed: 0,
          assigned: 1,
        },
      });
    });

    it('should include an expired OPEN evaluation in total but not active progress', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(3),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-03T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-03T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 0,
        },

        total: {
          completed: 1,
          assigned: 1,
        },
      });
    });

    it('should include a CLOSED evaluation in total but never active progress', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(4),
              status: 'CLOSED',
              start_at: new Date(
                '2026-10-01T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-01T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 0,
        },

        total: {
          completed: 1,
          assigned: 1,
        },
      });
    });

    it('should not treat an OPEN evaluation with missing schedule boundaries as active', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: false,

            evaluations: {
              id: BigInt(5),
              status: 'OPEN',
              start_at: null,
              end_at: null,
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 0,
        },

        total: {
          completed: 0,
          assigned: 1,
        },
      });
    });

    it('should calculate active and total progress from the same assignment scope', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },

          {
            student_id: BigInt(100),
            has_submitted: false,

            evaluations: {
              id: BigInt(2),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T11:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T15:00:00.000Z',
              ),
            },
          },

          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(3),
              status: 'CLOSED',
              start_at: new Date(
                '2026-09-01T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-09-01T14:00:00.000Z',
              ),
            },
          },

          {
            student_id: BigInt(100),
            has_submitted: false,

            evaluations: {
              id: BigInt(4),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-10T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-10T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 1,
          assigned: 2,
        },

        total: {
          completed: 2,
          assigned: 4,
        },
      });
    });

    it('should calculate progress for multiple students with one batched query', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },

          {
            student_id: BigInt(101),
            has_submitted: false,

            evaluations: {
              id: BigInt(2),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [
            BigInt(100),
            BigInt(101),
          ],
          now,
        );

      expect(
        participantFindManyMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 1,
          assigned: 1,
        },

        total: {
          completed: 1,
          assigned: 1,
        },
      });

      expect(
        result.get(BigInt(101)),
      ).toEqual({
        active: {
          completed: 0,
          assigned: 1,
        },

        total: {
          completed: 0,
          assigned: 1,
        },
      });
    });

    it('should count each evaluation only once for the same student', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },

          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUsers(
          [BigInt(100)],
          now,
        );

      expect(
        result.get(BigInt(100)),
      ).toEqual({
        active: {
          completed: 1,
          assigned: 1,
        },

        total: {
          completed: 1,
          assigned: 1,
        },
      });
    });

    it('should return immediately without querying Prisma when no user IDs are provided', async () => {
      const result =
        await service.getProgressForUsers(
          [],
          now,
        );

      expect(result.size).toBe(0);

      expect(
        participantFindManyMock,
      ).not.toHaveBeenCalled();
    });

    it('should deduplicate requested user IDs', async () => {
      await service.getProgressForUsers(
        [
          BigInt(100),
          BigInt(100),
          BigInt(101),
        ],
        now,
      );

      expect(
        participantFindManyMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            student_id: {
              in: [
                BigInt(100),
                BigInt(101),
              ],
            },

            evaluations: {
              is: {
                status: {
                  in: [
                    'OPEN',
                    'CLOSED',
                  ],
                },
              },
            },
          },
        }),
      );
    });

    it('should provide single-user progress through getProgressForUser', async () => {
      participantFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
            has_submitted: true,

            evaluations: {
              id: BigInt(1),
              status: 'OPEN',
              start_at: new Date(
                '2026-10-04T10:00:00.000Z',
              ),
              end_at: new Date(
                '2026-10-04T14:00:00.000Z',
              ),
            },
          },
        ]);

      const result =
        await service.getProgressForUser(
          BigInt(100),
          now,
        );

      expect(result).toEqual({
        active: {
          completed: 1,
          assigned: 1,
        },

        total: {
          completed: 1,
          assigned: 1,
        },
      });
    });
  },
);