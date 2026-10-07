import { completeTransactionMock } from '../../test/utils/complete-transaction-mock';
import { jest } from '@jest/globals';

import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService - staff management and deletion', () => {
  const usersFindManyMock = jest.fn<
    (...args: any[]) => Promise<any[]>
  >();

  const usersCountMock = jest.fn<
    (...args: any[]) => Promise<number>
  >();

  const usersFindUniqueMock = jest.fn<
    (...args: any[]) => Promise<any>
  >();

  const usersDeleteMock = jest.fn<
    (...args: any[]) => Promise<any>
  >();

  const userDepartmentsDeleteManyMock = jest.fn<
    (...args: any[]) => Promise<any>
  >();

  const studentAcademicRecordsDeleteManyMock =
    jest.fn<
      (...args: any[]) => Promise<any>
    >();

  const studentsDeleteMock = jest.fn<
    (...args: any[]) => Promise<any>
  >();

  let service: UsersService;

  let prismaMock: any;
  let transactionClientMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    transactionClientMock = {
      users: {
        delete: usersDeleteMock,
      },

      user_departments: {
        deleteMany:
          userDepartmentsDeleteManyMock,
      },

      student_academic_records: {
        deleteMany:
          studentAcademicRecordsDeleteManyMock,
      },

      students: {
        delete: studentsDeleteMock,
      },
    };

    prismaMock = {
      users: {
        findMany: usersFindManyMock,
        count: usersCountMock,
        findUnique: usersFindUniqueMock,
        delete: usersDeleteMock,
      },

      user_departments: {
        deleteMany:
          userDepartmentsDeleteManyMock,
      },

      student_academic_records: {
        deleteMany:
          studentAcademicRecordsDeleteManyMock,
      },

      students: {
        delete: studentsDeleteMock,
      },

      $transaction: jest.fn(
        async (argument: any) => {
          /*
           * findAll() uses Prisma's array
           * transaction:
           *
           * $transaction([
           *   findMany(...),
           *   count(...),
           * ])
           */
          if (Array.isArray(argument)) {
            return Promise.all(argument);
          }

          /*
           * remove() uses Prisma's interactive
           * transaction:
           *
           * $transaction(async (tx) => ...)
           */
          if (
            typeof argument === 'function'
          ) {
            return argument(
              completeTransactionMock(prismaMock, transactionClientMock),
            );
          }

          throw new Error(
            'Unsupported transaction type',
          );
        },
      ),
    };

    service = new UsersService(
      prismaMock as PrismaService,
    );

    usersFindManyMock.mockResolvedValue([]);
    usersCountMock.mockResolvedValue(0);

    usersDeleteMock.mockResolvedValue({
      id: BigInt(10),
    });

    userDepartmentsDeleteManyMock
      .mockResolvedValue({
        count: 0,
      });

    studentAcademicRecordsDeleteManyMock
      .mockResolvedValue({
        count: 0,
      });

    studentsDeleteMock.mockResolvedValue({
      id: BigInt(1),
    });
  });

  // =========================================================
  // STAFF LIST / SEARCH / PAGINATION
  // =========================================================

  describe('findAll', () => {
    it('should list only admin and lecturer accounts by default with pagination', async () => {
      const staffUsers = [
        {
          id: BigInt(1),
          email: 'admin@itc.edu.kh',
          full_name: 'Main Admin',
          gender: null,
          role: 'ADMIN',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
          user_departments: [],
        },
        {
          id: BigInt(2),
          email: 'lecturer@itc.edu.kh',
          full_name: 'Keo Sophal',
          gender: 'MALE',
          role: 'LECTURER',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date(),
          user_departments: [],
        },
      ];

      usersFindManyMock.mockResolvedValue(
        staffUsers,
      );

      usersCountMock.mockResolvedValue(2);

      const result = await service.findAll({
        page: 1,
        limit: 20,
      });

      expect(
        usersFindManyMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: {
              in: [
                'ADMIN',
                'LECTURER',
              ],
            },
          }),

          skip: 0,
          take: 20,
        }),
      );

      expect(
        usersCountMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: {
              in: [
                'ADMIN',
                'LECTURER',
              ],
            },
          }),
        }),
      );

      expect(result.data).toEqual(
        staffUsers,
      );

      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
      });

      expect(result.filters).toEqual({
        search: null,
        role: null,
        status: null,
      });
    });

    it('should search by full name or email and apply role, status, and pagination', async () => {
      const lecturer = {
        id: BigInt(9),
        email: 'sophal@itc.edu.kh',
        full_name: 'Keo Sophal',
        gender: 'MALE',
        role: 'LECTURER',
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
        user_departments: [],
      };

      usersFindManyMock.mockResolvedValue([
        lecturer,
      ]);

      usersCountMock.mockResolvedValue(21);

      const result = await service.findAll({
        search: '  Sophal  ',
        role: 'LECTURER',
        status: 'ACTIVE',
        page: 2,
        limit: 10,
      });

      expect(
        usersFindManyMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: 'LECTURER',
            status: 'ACTIVE',

            OR: [
              {
                full_name: {
                  contains: 'Sophal',
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: 'Sophal',
                  mode: 'insensitive',
                },
              },
            ],
          },

          skip: 10,
          take: 10,
        }),
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 21,
        total_pages: 3,
      });

      expect(result.filters).toEqual({
        search: 'Sophal',
        role: 'LECTURER',
        status: 'ACTIVE',
      });
    });
  });

  // =========================================================
  // PERMANENT USER DELETION
  // =========================================================

  describe('remove', () => {
    it('should permanently delete a safe unreferenced lecturer', async () => {
      usersFindUniqueMock.mockResolvedValue({
        id: BigInt(10),
        role: 'LECTURER',
        student: null,

        _count: {
          course_offerings: 0,
          enrollments: 0,
          evaluation_participants: 0,
          evaluations: 0,
          surveys: 0,
          survey_versions: 0,
        },
      });

      const result = await service.remove(
        BigInt(10),
        BigInt(1),
      );

      expect(
        userDepartmentsDeleteManyMock,
      ).toHaveBeenCalledWith({
        where: {
          user_id: BigInt(10),
        },
      });

      expect(
        studentAcademicRecordsDeleteManyMock,
      ).not.toHaveBeenCalled();

      expect(
        studentsDeleteMock,
      ).not.toHaveBeenCalled();

      expect(
        usersDeleteMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(10),
        },
      });

      expect(result).toEqual({
        message: 'User deleted successfully',
      });
    });

    it('should transactionally remove student academic records, profile, departments, and user account', async () => {
      usersFindUniqueMock.mockResolvedValue({
        id: BigInt(73),
        role: 'STUDENT',

        student: {
          id: BigInt(1),
        },

        _count: {
          course_offerings: 0,
          enrollments: 0,
          evaluation_participants: 0,
          evaluations: 0,
          surveys: 0,
          survey_versions: 0,
        },
      });

      const result = await service.remove(
        BigInt(73),
        BigInt(1),
      );

      expect(
        userDepartmentsDeleteManyMock,
      ).toHaveBeenCalledWith({
        where: {
          user_id: BigInt(73),
        },
      });

      expect(
        studentAcademicRecordsDeleteManyMock,
      ).toHaveBeenCalledWith({
        where: {
          student_id: BigInt(1),
        },
      });

      expect(
        studentsDeleteMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
      });

      expect(
        usersDeleteMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(73),
        },
      });

      expect(result).toEqual({
        message: 'User deleted successfully',
      });
    });

    it('should reject permanent deletion of the caller own account', async () => {
      await expect(
        service.remove(
          BigInt(1),
          BigInt(1),
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'You cannot delete your own account',
        ),
      );

      expect(
        usersFindUniqueMock,
      ).not.toHaveBeenCalled();

      expect(
        usersDeleteMock,
      ).not.toHaveBeenCalled();
    });

    it('should reject permanent deletion of an admin account', async () => {
      usersFindUniqueMock.mockResolvedValue({
        id: BigInt(20),
        role: 'ADMIN',
        student: null,

        _count: {
          course_offerings: 0,
          enrollments: 0,
          evaluation_participants: 0,
          evaluations: 0,
          surveys: 0,
          survey_versions: 0,
        },
      });

      await expect(
        service.remove(
          BigInt(20),
          BigInt(1),
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Admin accounts cannot be permanently deleted',
        ),
      );

      expect(
        usersDeleteMock,
      ).not.toHaveBeenCalled();
    });

    it('should reject permanent deletion when historical references exist', async () => {
      usersFindUniqueMock.mockResolvedValue({
        id: BigInt(10),
        role: 'LECTURER',
        student: null,

        _count: {
          course_offerings: 1,
          enrollments: 0,
          evaluation_participants: 0,
          evaluations: 0,
          surveys: 0,
          survey_versions: 0,
        },
      });

      await expect(
        service.remove(
          BigInt(10),
          BigInt(1),
        ),
      ).rejects.toThrow(
        new ConflictException(
          'User has historical references and cannot be permanently deleted. Deactivate the account instead.',
        ),
      );

      expect(
        userDepartmentsDeleteManyMock,
      ).not.toHaveBeenCalled();

      expect(
        usersDeleteMock,
      ).not.toHaveBeenCalled();
    });
  });
});