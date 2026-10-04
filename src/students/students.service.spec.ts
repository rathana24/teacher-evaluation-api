import { jest } from '@jest/globals';

import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { StudentsService } from './students.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentEvaluationProgressService } from './student-evaluation-progress.service';

/*
 * Explicit mock function types are used because this project uses
 * TypeScript 6 + Jest 29 in ESM mode.
 */

type IdResult = {
  id: bigint;
};

type IdOrNullResult = IdResult | null;

/*
 * Academic-year lookups are used in two different ways:
 *
 * - create() only needs the ID;
 * - enrollment selection needs the full academic-year context.
 *
 * The optional fields let the same mock safely represent both
 * Prisma query shapes used by StudentsService.
 */
type AcademicYearMockResult = {
  id: bigint;
  name?: string;
  start_year?: number | null;
  is_active?: boolean;
};

type AcademicYearOrNullResult =
  AcademicYearMockResult | null;

type CreatedStudentResult = {
  id: bigint;
  user_id: bigint;
  student_code: string;
  generation_id: bigint;
  notes: string | null;
  created_at: Date;
  updated_at: Date;

  users: {
    id: bigint;
    email: string | null;
    full_name: string;
    gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
    role: 'STUDENT';
    status: 'ACTIVE';
    created_at: Date;
    updated_at: Date;
  };

  student_generations: {
    id: bigint;
    name: string;
    entry_academic_year_id: bigint;
    starting_year_level: number;

    entry_academic_year: {
      id: bigint;
      name: string;
      start_year: number | null;
      is_active: boolean;
    };
  };

  student_academic_records: Array<{
    id: bigint;
    academic_year_id: bigint;
    year_level: number;
    major_id: bigint;
    class_group: string | null;
    created_at: Date;
    updated_at: Date;

    academic_years: {
      id: bigint;
      name: string;
      start_year: number | null;
      is_active: boolean;
    };

    majors: {
      id: bigint;
      code: string;
      name: string;
      department_id: bigint;
    };
  }>;
};

type TxMock = {
  users: {
    create: jest.Mock<
      () => Promise<IdResult>
    >;

    update: jest.Mock<
      () => Promise<unknown>
    >;

    delete: jest.Mock<
      () => Promise<unknown>
    >;
  };

  students: {
    create: jest.Mock<
      () => Promise<IdResult>
    >;

    update: jest.Mock<
      () => Promise<unknown>
    >;

    delete: jest.Mock<
      () => Promise<unknown>
    >;

    findUniqueOrThrow: jest.Mock<
      () => Promise<CreatedStudentResult>
    >;
  };

  student_academic_records: {
    create: jest.Mock<
      () => Promise<IdResult>
    >;
  };
};

describe('StudentsService', () => {
  let service: StudentsService;

  const studentGenerationFindUniqueMock =
    jest.fn<
      () => Promise<IdOrNullResult>
    >();

  const academicYearFindUniqueMock =
    jest.fn<
      () => Promise<AcademicYearOrNullResult>
    >();

  const majorFindUniqueMock =
    jest.fn<
      () => Promise<IdOrNullResult>
    >();

  const studentsFindUniqueMock =
    jest.fn<
      () => Promise<unknown>
    >();

  const studentsFindManyMock =
    jest.fn<
      () => Promise<unknown[]>
    >();

  const enrollmentCountMock =
    jest.fn<
      () => Promise<number>
    >();

  const participantCountMock =
    jest.fn<
      () => Promise<number>
    >();

  /*
   * Student progress mocks.
   *
   * These are provided because StudentsService now depends on
   * StudentEvaluationProgressService. The create tests below do
   * not use these methods, but Nest still needs the dependency
   * when constructing StudentsService.
   */
  const getProgressForUsersMock =
    jest.fn<
      (
        userIds: bigint[],
        now?: Date,
      ) => Promise<
        Map<
          bigint,
          {
            active: {
              completed: number;
              assigned: number;
            };
            total: {
              completed: number;
              assigned: number;
            };
          }
        >
      >
    >();

  const getProgressForUserMock =
    jest.fn<
      (
        userId: bigint,
        now?: Date,
      ) => Promise<{
        active: {
          completed: number;
          assigned: number;
        };
        total: {
          completed: number;
          assigned: number;
        };
      }>
    >();

  const usersCreateMock =
    jest.fn<
      () => Promise<IdResult>
    >();

  const usersUpdateMock =
    jest.fn<
      () => Promise<unknown>
    >();

  const usersDeleteMock =
    jest.fn<
      () => Promise<unknown>
    >();

  const studentsCreateMock =
    jest.fn<
      () => Promise<IdResult>
    >();

  const studentsUpdateMock =
    jest.fn<
      () => Promise<unknown>
    >();

  const studentsDeleteMock =
    jest.fn<
      () => Promise<unknown>
    >();

  const studentsFindUniqueOrThrowMock =
    jest.fn<
      () => Promise<CreatedStudentResult>
    >();

  const academicRecordCreateMock =
    jest.fn<
      () => Promise<IdResult>
    >();

  const txMock: TxMock = {
    users: {
      create: usersCreateMock,
      update: usersUpdateMock,
      delete: usersDeleteMock,
    },

    students: {
      create: studentsCreateMock,
      update: studentsUpdateMock,
      delete: studentsDeleteMock,
      findUniqueOrThrow:
        studentsFindUniqueOrThrowMock,
    },

    student_academic_records: {
      create: academicRecordCreateMock,
    },
  };

  type TransactionCallback =
    (
      tx: TxMock,
    ) => Promise<unknown>;

  const transactionMock =
    jest.fn<
      (
        callback: TransactionCallback,
      ) => Promise<unknown>
    >();

  const prismaMock = {
    student_generations: {
      findUnique:
        studentGenerationFindUniqueMock,
    },

    academic_years: {
      findUnique:
        academicYearFindUniqueMock,
    },

    majors: {
      findUnique:
        majorFindUniqueMock,
    },

    students: {
      findUnique:
        studentsFindUniqueMock,
      findMany:
        studentsFindManyMock,
    },

    enrollments: {
      count:
        enrollmentCountMock,
    },

    evaluation_participants: {
      count:
        participantCountMock,
    },

    $transaction:
      transactionMock,
  };

  const progressServiceMock = {
    getProgressForUsers:
      getProgressForUsersMock,

    getProgressForUser:
      getProgressForUserMock,
  };

  const createDto: CreateStudentDto = {
    student_code: ' E20229999 ',
    full_name: ' Test Student ',
    email: ' TEST@ITC.EDU.KH ',
    gender: 'MALE',
    password: 'Password123',
    generation_id: '1',

    academic_year_id: '1',
    year_level: 2,
    major_id: '1',
    class_group: ' AMS2-A ',

    notes: ' Test student ',
  };

  const createdStudent: CreatedStudentResult = {
    id: BigInt(10),
    user_id: BigInt(100),
    student_code: 'e20229999',
    generation_id: BigInt(1),
    notes: 'Test student',
    created_at: new Date(),
    updated_at: new Date(),

    users: {
      id: BigInt(100),
      email: 'test@itc.edu.kh',
      full_name: 'Test Student',
      gender: 'MALE',
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
    },

    student_generations: {
      id: BigInt(1),
      name: 'Gen 43',
      entry_academic_year_id: BigInt(1),
      starting_year_level: 1,

      entry_academic_year: {
        id: BigInt(1),
        name: '2025-2026',
        start_year: 2025,
        is_active: false,
      },
    },

    student_academic_records: [
      {
        id: BigInt(20),
        academic_year_id: BigInt(1),
        year_level: 2,
        major_id: BigInt(1),
        class_group: 'AMS2-A',
        created_at: new Date(),
        updated_at: new Date(),

        academic_years: {
          id: BigInt(1),
          name: '2025-2026',
          start_year: 2025,
          is_active: false,
        },

        majors: {
          id: BigInt(1),
          code: 'AMS',
          name:
            'Applied Mathematics & Statistics',
          department_id: BigInt(1),
        },
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          StudentsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide:
              StudentEvaluationProgressService,
            useValue:
              progressServiceMock,
          },
        ],
      }).compile();

    service =
      module.get<StudentsService>(
        StudentsService,
      );

    studentGenerationFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
      });

    academicYearFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
      });

    majorFindUniqueMock
      .mockResolvedValue({
        id: BigInt(1),
      });

    usersCreateMock
      .mockResolvedValue({
        id: BigInt(100),
      });

    studentsCreateMock
      .mockResolvedValue({
        id: BigInt(10),
      });

    academicRecordCreateMock
      .mockResolvedValue({
        id: BigInt(20),
      });

    studentsFindUniqueOrThrowMock
      .mockResolvedValue(
        createdStudent,
      );

    /*
     * Safe defaults for Student Progress.
     */
    getProgressForUsersMock
      .mockResolvedValue(
        new Map(),
      );

    getProgressForUserMock
      .mockResolvedValue({
        active: {
          completed: 0,
          assigned: 0,
        },
        total: {
          completed: 0,
          assigned: 0,
        },
      });

    transactionMock.mockImplementation(
      async (
        callback: TransactionCallback,
      ) => callback(txMock),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create user, student profile, and initial academic record in one transaction', async () => {
      const result =
        await service.create(createDto);

      expect(
        studentGenerationFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        select: {
          id: true,
        },
      });

      expect(
        academicYearFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        select: {
          id: true,
        },
      });

      expect(
        majorFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        select: {
          id: true,
        },
      });

      expect(
        transactionMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        usersCreateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email:
              'test@itc.edu.kh',

            full_name:
              'Test Student',

            gender:
              'MALE',

            role:
              'STUDENT',

            status:
              'ACTIVE',

            password_hash:
              expect.any(String),
          }),
        }),
      );

      expect(
        studentsCreateMock,
      ).toHaveBeenCalledWith({
        data: {
          user_id:
            BigInt(100),

          student_code:
            'e20229999',

          generation_id:
            BigInt(1),

          notes:
            'Test student',
        },

        select: {
          id: true,
        },
      });

      expect(
        academicRecordCreateMock,
      ).toHaveBeenCalledWith({
        data: {
          student_id:
            BigInt(10),

          academic_year_id:
            BigInt(1),

          year_level:
            2,

          major_id:
            BigInt(1),

          class_group:
            'AMS2-A',
        },
      });

      expect(
        studentsFindUniqueOrThrowMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: BigInt(10),
          },
        }),
      );

      expect(result).toEqual(
        createdStudent,
      );
    });

    it('should support a student without email, gender, notes, or class group', async () => {
      const dto: CreateStudentDto = {
        student_code:
          'e20228888',

        full_name:
          'Student Two',

        password:
          'Password123',

        generation_id:
          '1',

        academic_year_id:
          '1',

        year_level:
          1,

        major_id:
          '1',
      };

      await service.create(dto);

      expect(
        usersCreateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data:
            expect.objectContaining({
              email: null,
              gender: null,
            }),
        }),
      );

      expect(
        studentsCreateMock,
      ).toHaveBeenCalledWith({
        data: {
          user_id:
            BigInt(100),

          student_code:
            'e20228888',

          generation_id:
            BigInt(1),

          notes:
            null,
        },

        select: {
          id: true,
        },
      });

      expect(
        academicRecordCreateMock,
      ).toHaveBeenCalledWith({
        data: {
          student_id:
            BigInt(10),

          academic_year_id:
            BigInt(1),

          year_level:
            1,

          major_id:
            BigInt(1),

          class_group:
            null,
        },
      });
    });

    it('should throw when generation does not exist', async () => {
      studentGenerationFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.create(createDto),
      ).rejects.toThrow(
        new NotFoundException(
          'Student generation not found',
        ),
      );

      expect(
        transactionMock,
      ).not.toHaveBeenCalled();

      expect(
        usersCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should throw when academic year does not exist', async () => {
      academicYearFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.create(createDto),
      ).rejects.toThrow(
        new NotFoundException(
          'Academic year not found',
        ),
      );

      expect(
        transactionMock,
      ).not.toHaveBeenCalled();

      expect(
        usersCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should throw when major does not exist', async () => {
      majorFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.create(createDto),
      ).rejects.toThrow(
        new NotFoundException(
          'Major not found',
        ),
      );

      expect(
        transactionMock,
      ).not.toHaveBeenCalled();

      expect(
        usersCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should map duplicate student code to ConflictException', async () => {
      const prismaError =
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion:
              '6.19.3',

            meta: {
              target: [
                'student_code',
              ],
            },
          },
        );

      transactionMock
        .mockRejectedValue(
          prismaError,
        );

      await expect(
        service.create(createDto),
      ).rejects.toThrow(
        new ConflictException(
          'Student code already exists',
        ),
      );
    });

    it('should map duplicate email to ConflictException', async () => {
      const prismaError =
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion:
              '6.19.3',

            meta: {
              target: [
                'email',
              ],
            },
          },
        );

      transactionMock
        .mockRejectedValue(
          prismaError,
        );

      await expect(
        service.create(createDto),
      ).rejects.toThrow(
        new ConflictException(
          'Email is already in use',
        ),
      );
    });
  });

  describe('selectStudentsForEnrollment', () => {
    const selectedAcademicYear = {
      id: BigInt(1),
      name: '2025-2026',
      start_year: 2025,
      is_active: true,
    };

    beforeEach(() => {
      /*
       * Enrollment selection needs the complete academic-year
       * context because effective year level is calculated from
       * start_year when an explicit record is not available.
       */
      academicYearFindUniqueMock
        .mockResolvedValue(
          selectedAcademicYear,
        );

      studentsFindManyMock
        .mockResolvedValue([
          createdStudent,
        ]);
    });

    it('should select ACTIVE students using the requested academic year and generation', async () => {
      const result =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
        });

      expect(
        academicYearFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        select: {
          id: true,
          name: true,
          start_year: true,
          is_active: true,
        },
      });

      expect(
        studentGenerationFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        select: {
          id: true,
        },
      });

      expect(
        studentsFindManyMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            generation_id:
              BigInt(1),

            users: {
              is: {
                role: 'STUDENT',
                status: 'ACTIVE',
              },
            },
          },

          orderBy: {
            student_code: 'asc',
          },
        }),
      );

      expect(result).toHaveLength(1);

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: BigInt(10),
          user_id: BigInt(100),
          student_code:
            'e20229999',

          academic_context:
            expect.objectContaining({
              academic_year:
                selectedAcademicYear,

              effective_year_level:
                2,

              year_level_source:
                'ACADEMIC_RECORD',
            }),
        }),
      );
    });

    it('should not calculate evaluation progress during enrollment selection', async () => {
      await service.selectStudentsForEnrollment({
        generation_id: '1',
        academic_year_id: '1',
      });

      expect(
        getProgressForUsersMock,
      ).not.toHaveBeenCalled();

      expect(
        getProgressForUserMock,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the selected academic year does not exist', async () => {
      academicYearFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '999',
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'Academic year not found',
        ),
      );

      expect(
        studentsFindManyMock,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the selected generation does not exist', async () => {
      studentGenerationFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.selectStudentsForEnrollment({
          generation_id: '999',
          academic_year_id: '1',
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'Student generation not found',
        ),
      );

      expect(
        studentsFindManyMock,
      ).not.toHaveBeenCalled();
    });

    it('should throw when the selected major does not exist', async () => {
      majorFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          major_id: '999',
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'Major not found',
        ),
      );

      expect(
        studentsFindManyMock,
      ).not.toHaveBeenCalled();
    });

    it('should filter by effective year level and prefer the explicit academic record', async () => {
      /*
       * Generation calculation for this student would produce
       * year 1 in 2025-2026:
       *
       * starting year 1 + (2025 - 2025) = 1
       *
       * But the explicit academic record says year 2.
       * The explicit record must win.
       */
      const matching =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          year_level: 2,
        });

      expect(matching).toHaveLength(1);

      expect(
        matching[0].academic_context
          .effective_year_level,
      ).toBe(2);

      expect(
        matching[0].academic_context
          .year_level_source,
      ).toBe('ACADEMIC_RECORD');

      const notMatching =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          year_level: 1,
        });

      expect(notMatching).toEqual([]);
    });

    it('should use generation calculation when there is no explicit academic record for the selected year', async () => {
      const studentWithoutRecord = {
        ...createdStudent,

        student_academic_records: [],
      };

      studentsFindManyMock
        .mockResolvedValue([
          studentWithoutRecord,
        ]);

      academicYearFindUniqueMock
        .mockResolvedValue({
          id: BigInt(2),
          name: '2026-2027',
          start_year: 2026,
          is_active: true,
        });

      const result =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '2',
          year_level: 2,
        });

      expect(result).toHaveLength(1);

      expect(
        result[0].academic_context
          .calculated_year_level,
      ).toBe(2);

      expect(
        result[0].academic_context
          .effective_year_level,
      ).toBe(2);

      expect(
        result[0].academic_context
          .year_level_source,
      ).toBe(
        'GENERATION_CALCULATION',
      );
    });

    it('should filter students by major from the explicit academic record', async () => {
      const matching =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          major_id: '1',
        });

      expect(matching).toHaveLength(1);

      majorFindUniqueMock
        .mockResolvedValue({
          id: BigInt(2),
        });

      const notMatching =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          major_id: '2',
        });

      expect(notMatching).toEqual([]);
    });

    it('should filter class group case-insensitively and ignore surrounding spaces', async () => {
      const matching =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          class_group:
            '  ams2-a  ',
        });

      expect(matching).toHaveLength(1);

      const notMatching =
        await service.selectStudentsForEnrollment({
          generation_id: '1',
          academic_year_id: '1',
          class_group:
            'AMS2-B',
        });

      expect(notMatching).toEqual([]);
    });

    it('should support selection without a generation filter', async () => {
      const result =
        await service.selectStudentsForEnrollment({
          academic_year_id: '1',
          year_level: 2,
        });

      expect(result).toHaveLength(1);

      expect(
        studentGenerationFindUniqueMock,
      ).not.toHaveBeenCalled();

      expect(
        studentsFindManyMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            users: {
              is: {
                role: 'STUDENT',
                status: 'ACTIVE',
              },
            },
          },
        }),
      );
    });
  });
});