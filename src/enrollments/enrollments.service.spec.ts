import { jest } from '@jest/globals';

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { EnrollmentsService } from './enrollments.service';

type OfferingResult = {
  id: bigint;
};

type UserResult = {
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
  status: 'ACTIVE' | 'INACTIVE';
};

type ExistingEnrollmentResult = {
  student_id: bigint;
};

type EnrollmentResult = {
  id: bigint;
  student_id: bigint;
  course_offering_id: bigint;
  enrolled_at: Date;
  users: {
    id: bigint;
    full_name: string;
    email: string | null;
  };
};

type EnrollmentForRemoval = {
  id: bigint;
};

type SelectedStudent = {
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

  academic_context: {
    academic_year: {
      id: bigint;
      name: string;
      start_year: number | null;
      is_active: boolean;
    };

    academic_record: {
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
    } | null;

    calculated_year_level: number | null;
    effective_year_level: number | null;
    year_level_source:
      | 'ACADEMIC_RECORD'
      | 'GENERATION_CALCULATION'
      | 'NOT_STARTED'
      | 'UNAVAILABLE';
  };
};

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const offeringFindUniqueMock =
    jest.fn<
      () => Promise<OfferingResult | null>
    >();

  const userFindUniqueMock =
    jest.fn<
      () => Promise<UserResult | null>
    >();

  const enrollmentFindManyMock =
    jest.fn<
      () => Promise<unknown[]>
    >();

  const enrollmentCreateMock =
    jest.fn<
      () => Promise<EnrollmentResult>
    >();

  const enrollmentCreateManyMock =
    jest.fn<
      () => Promise<{ count: number }>
    >();

  const enrollmentFindFirstMock =
    jest.fn<
      () => Promise<EnrollmentForRemoval | null>
    >();

  const enrollmentDeleteMock =
    jest.fn<
      () => Promise<unknown>
    >();

  const selectStudentsForEnrollmentMock =
    jest.fn<
      () => Promise<SelectedStudent[]>
    >();

  const prismaMock = {
    course_offerings: {
      findUnique: offeringFindUniqueMock,
    },

    users: {
      findUnique: userFindUniqueMock,
    },

    enrollments: {
      findMany: enrollmentFindManyMock,
      create: enrollmentCreateMock,
      createMany: enrollmentCreateManyMock,
      findFirst: enrollmentFindFirstMock,
      delete: enrollmentDeleteMock,
    },
  };

  const studentsServiceMock = {
    selectStudentsForEnrollment:
      selectStudentsForEnrollmentMock,
  };

  const selectedStudent1: SelectedStudent = {
    id: BigInt(10),
    user_id: BigInt(100),
    student_code: 'e20230001',
    generation_id: BigInt(1),
    notes: null,
    created_at: new Date(
      '2026-01-01T00:00:00.000Z',
    ),
    updated_at: new Date(
      '2026-01-01T00:00:00.000Z',
    ),

    users: {
      id: BigInt(100),
      email: 'student1@itc.edu.kh',
      full_name: 'Student One',
      gender: 'MALE',
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: new Date(
        '2026-01-01T00:00:00.000Z',
      ),
      updated_at: new Date(
        '2026-01-01T00:00:00.000Z',
      ),
    },

    student_generations: {
      id: BigInt(1),
      name: 'Generation 43',
      entry_academic_year_id: BigInt(1),
      starting_year_level: 1,

      entry_academic_year: {
        id: BigInt(1),
        name: '2023-2024',
        start_year: 2023,
        is_active: false,
      },
    },

    student_academic_records: [
      {
        id: BigInt(1000),
        academic_year_id: BigInt(2),
        year_level: 4,
        major_id: BigInt(1),
        class_group: 'AMS1-A',
        created_at: new Date(
          '2026-01-01T00:00:00.000Z',
        ),
        updated_at: new Date(
          '2026-01-01T00:00:00.000Z',
        ),

        academic_years: {
          id: BigInt(2),
          name: '2026-2027',
          start_year: 2026,
          is_active: true,
        },

        majors: {
          id: BigInt(1),
          code: 'AMS',
          name:
            'Applied Mathematics and Statistics',
          department_id: BigInt(1),
        },
      },
    ],

    academic_context: {
      academic_year: {
        id: BigInt(2),
        name: '2026-2027',
        start_year: 2026,
        is_active: true,
      },

      academic_record: {
        id: BigInt(1000),
        academic_year_id: BigInt(2),
        year_level: 4,
        major_id: BigInt(1),
        class_group: 'AMS1-A',
        created_at: new Date(
          '2026-01-01T00:00:00.000Z',
        ),
        updated_at: new Date(
          '2026-01-01T00:00:00.000Z',
        ),

        academic_years: {
          id: BigInt(2),
          name: '2026-2027',
          start_year: 2026,
          is_active: true,
        },

        majors: {
          id: BigInt(1),
          code: 'AMS',
          name:
            'Applied Mathematics and Statistics',
          department_id: BigInt(1),
        },
      },

      calculated_year_level: 4,
      effective_year_level: 4,
      year_level_source:
        'ACADEMIC_RECORD',
    },
  };

  const selectedStudent2: SelectedStudent = {
    ...selectedStudent1,

    id: BigInt(11),
    user_id: BigInt(101),
    student_code: 'e20230002',

    users: {
      ...selectedStudent1.users,
      id: BigInt(101),
      email: 'student2@itc.edu.kh',
      full_name: 'Student Two',
    },
  };

  const selectedStudent3: SelectedStudent = {
    ...selectedStudent1,

    id: BigInt(12),
    user_id: BigInt(102),
    student_code: 'e20230003',

    users: {
      ...selectedStudent1.users,
      id: BigInt(102),
      email: 'student3@itc.edu.kh',
      full_name: 'Student Three',
    },
  };

  const groupDto = {
    academic_year_id: '2',
    generation_id: '1',
    year_level: 4,
    major_id: '1',
    class_group: ' AMS1-A ',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          EnrollmentsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: StudentsService,
            useValue: studentsServiceMock,
          },
        ],
      }).compile();

    service =
      module.get<EnrollmentsService>(
        EnrollmentsService,
      );

    offeringFindUniqueMock.mockResolvedValue({
      id: BigInt(1),
    });

    userFindUniqueMock.mockResolvedValue({
      role: 'STUDENT',
      status: 'ACTIVE',
    });

    enrollmentFindManyMock.mockResolvedValue(
      [],
    );

    enrollmentCreateMock.mockResolvedValue({
      id: BigInt(1),
      student_id: BigInt(100),
      course_offering_id: BigInt(1),
      enrolled_at: new Date(
        '2026-10-01T00:00:00.000Z',
      ),

      users: {
        id: BigInt(100),
        full_name: 'Student One',
        email: 'student1@itc.edu.kh',
      },
    });

    enrollmentCreateManyMock.mockResolvedValue({
      count: 0,
    });

    enrollmentFindFirstMock.mockResolvedValue({
      id: BigInt(1),
    });

    enrollmentDeleteMock.mockResolvedValue({
      id: BigInt(1),
    });

    selectStudentsForEnrollmentMock
      .mockResolvedValue([
        selectedStudent1,
        selectedStudent2,
        selectedStudent3,
      ]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllForOffering', () => {
    it('should verify the offering and return its enrollments', async () => {
      const enrollments = [
        {
          id: BigInt(1),
          student_id: BigInt(100),
        },
      ];

      enrollmentFindManyMock
        .mockResolvedValue(enrollments);

      const result =
        await service.findAllForOffering(
          BigInt(1),
        );

      expect(
        offeringFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
        select: {
          id: true,
        },
      });

      expect(
        enrollmentFindManyMock,
      ).toHaveBeenCalledWith({
        where: {
          course_offering_id: BigInt(1),
        },
        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
        orderBy: {
          id: 'asc',
        },
      });

      expect(result).toEqual(enrollments);
    });

    it('should throw when the course offering does not exist', async () => {
      offeringFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.findAllForOffering(
          BigInt(999),
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'Course offering not found',
        ),
      );

      expect(
        enrollmentFindManyMock,
      ).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should enroll an ACTIVE STUDENT account', async () => {
      const result = await service.create(
        BigInt(1),
        {
          student_id: '100',
        },
      );

      expect(
        userFindUniqueMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(100),
        },
        select: {
          role: true,
          status: true,
        },
      });

      expect(
        enrollmentCreateMock,
      ).toHaveBeenCalledWith({
        data: {
          student_id: BigInt(100),
          course_offering_id: BigInt(1),
          enrolled_at: expect.any(Date),
        },

        include: {
          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },
        },
      });

      expect(result.student_id).toBe(
        BigInt(100),
      );
    });

    it('should reject a user that is not a STUDENT', async () => {
      userFindUniqueMock.mockResolvedValue({
        role: 'LECTURER',
        status: 'ACTIVE',
      });

      await expect(
        service.create(BigInt(1), {
          student_id: '100',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'student_id must refer to a user with role STUDENT',
        ),
      );

      expect(
        enrollmentCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should reject a missing user', async () => {
      userFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.create(BigInt(1), {
          student_id: '999',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'student_id must refer to a user with role STUDENT',
        ),
      );

      expect(
        enrollmentCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should reject an inactive student account', async () => {
      userFindUniqueMock.mockResolvedValue({
        role: 'STUDENT',
        status: 'INACTIVE',
      });

      await expect(
        service.create(BigInt(1), {
          student_id: '100',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Student account must be ACTIVE',
        ),
      );

      expect(
        enrollmentCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should map a duplicate enrollment to ConflictException', async () => {
      const prismaError =
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion: '6.19.3',
          },
        );

      enrollmentCreateMock
        .mockRejectedValue(prismaError);

      await expect(
        service.create(BigInt(1), {
          student_id: '100',
        }),
      ).rejects.toThrow(
        new ConflictException(
          'Student is already enrolled in this course offering',
        ),
      );
    });

    it('should rethrow a non-duplicate Prisma error', async () => {
      const error =
        new Error('Database unavailable');

      enrollmentCreateMock
        .mockRejectedValue(error);

      await expect(
        service.create(BigInt(1), {
          student_id: '100',
        }),
      ).rejects.toThrow(
        'Database unavailable',
      );
    });
  });

  describe('previewGroup', () => {
    it('should resolve the selected group without creating enrollments', async () => {
      const result =
        await service.previewGroup(
          BigInt(1),
          groupDto,
        );

      expect(
        selectStudentsForEnrollmentMock,
      ).toHaveBeenCalledWith(groupDto);

      expect(
        enrollmentCreateManyMock,
      ).not.toHaveBeenCalled();

      expect(result.matched_count).toBe(3);

      expect(
        result.already_enrolled_count,
      ).toBe(0);

      expect(
        result.new_enrollment_count,
      ).toBe(3);

      expect(result.students).toHaveLength(
        3,
      );

      expect(
        result.students.every(
          (student) =>
            student.already_enrolled ===
            false,
        ),
      ).toBe(true);
    });

    it('should mark students that are already enrolled', async () => {
      enrollmentFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(101),
          } satisfies ExistingEnrollmentResult,
        ]);

      const result =
        await service.previewGroup(
          BigInt(1),
          groupDto,
        );

      expect(
        enrollmentFindManyMock,
      ).toHaveBeenCalledWith({
        where: {
          course_offering_id: BigInt(1),

          student_id: {
            in: [
              BigInt(100),
              BigInt(101),
              BigInt(102),
            ],
          },
        },

        select: {
          student_id: true,
        },
      });

      expect(result.matched_count).toBe(3);

      expect(
        result.already_enrolled_count,
      ).toBe(1);

      expect(
        result.new_enrollment_count,
      ).toBe(2);

      const student100 =
        result.students.find(
          (student) =>
            student.user_id ===
            BigInt(100),
        );

      const student101 =
        result.students.find(
          (student) =>
            student.user_id ===
            BigInt(101),
        );

      expect(
        student100?.already_enrolled,
      ).toBe(false);

      expect(
        student101?.already_enrolled,
      ).toBe(true);
    });

    it('should return an empty preview when no students match', async () => {
      selectStudentsForEnrollmentMock
        .mockResolvedValue([]);

      const result =
        await service.previewGroup(
          BigInt(1),
          groupDto,
        );

      expect(result.matched_count).toBe(0);

      expect(
        result.already_enrolled_count,
      ).toBe(0);

      expect(
        result.new_enrollment_count,
      ).toBe(0);

      expect(result.students).toEqual([]);

      expect(
        enrollmentFindManyMock,
      ).not.toHaveBeenCalled();
    });

    it('should normalize the class group in the preview selection summary', async () => {
      const result =
        await service.previewGroup(
          BigInt(1),
          groupDto,
        );

      expect(result.selection).toEqual({
        academic_year_id: '2',
        generation_id: '1',
        year_level: 4,
        major_id: '1',
        class_group: 'AMS1-A',
      });
    });

    it('should return null for optional selection filters that are not provided', async () => {
      selectStudentsForEnrollmentMock
        .mockResolvedValue([]);

      const result =
        await service.previewGroup(
          BigInt(1),
          {
            academic_year_id: '2',
          },
        );

      expect(result.selection).toEqual({
        academic_year_id: '2',
        generation_id: null,
        year_level: null,
        major_id: null,
        class_group: null,
      });
    });
  });

  describe('bulkCreate', () => {
    it('should create explicit enrollments for all matching students', async () => {
      enrollmentCreateManyMock
        .mockResolvedValue({
          count: 3,
        });

      const result =
        await service.bulkCreate(
          BigInt(1),
          groupDto,
        );

      expect(
        selectStudentsForEnrollmentMock,
      ).toHaveBeenCalledWith(groupDto);

      expect(
        enrollmentCreateManyMock,
      ).toHaveBeenCalledWith({
        data: [
          {
            student_id: BigInt(100),
            course_offering_id: BigInt(1),
            enrolled_at: expect.any(Date),
          },
          {
            student_id: BigInt(101),
            course_offering_id: BigInt(1),
            enrolled_at: expect.any(Date),
          },
          {
            student_id: BigInt(102),
            course_offering_id: BigInt(1),
            enrolled_at: expect.any(Date),
          },
        ],

        skipDuplicates: true,
      });

      expect(result).toEqual({
        course_offering_id: BigInt(1),
        matched_count: 3,
        enrolled_count: 3,
        already_enrolled_count: 0,
      });
    });

    it('should skip students that are already enrolled', async () => {
      enrollmentFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(101),
          } satisfies ExistingEnrollmentResult,
        ]);

      enrollmentCreateManyMock
        .mockResolvedValue({
          count: 2,
        });

      const result =
        await service.bulkCreate(
          BigInt(1),
          groupDto,
        );

      expect(
        enrollmentCreateManyMock,
      ).toHaveBeenCalledWith({
        data: [
          {
            student_id: BigInt(100),
            course_offering_id: BigInt(1),
            enrolled_at: expect.any(Date),
          },
          {
            student_id: BigInt(102),
            course_offering_id: BigInt(1),
            enrolled_at: expect.any(Date),
          },
        ],

        skipDuplicates: true,
      });

      expect(result).toEqual({
        course_offering_id: BigInt(1),
        matched_count: 3,
        enrolled_count: 2,
        already_enrolled_count: 1,
      });
    });

    it('should not create anything when every matching student is already enrolled', async () => {
      enrollmentFindManyMock
        .mockResolvedValue([
          {
            student_id: BigInt(100),
          },
          {
            student_id: BigInt(101),
          },
          {
            student_id: BigInt(102),
          },
        ]);

      const result =
        await service.bulkCreate(
          BigInt(1),
          groupDto,
        );

      expect(
        enrollmentCreateManyMock,
      ).not.toHaveBeenCalled();

      expect(result).toEqual({
        course_offering_id: BigInt(1),
        matched_count: 3,
        enrolled_count: 0,
        already_enrolled_count: 3,
      });
    });

    it('should return zero counts when no students match the selection', async () => {
      selectStudentsForEnrollmentMock
        .mockResolvedValue([]);

      const result =
        await service.bulkCreate(
          BigInt(1),
          groupDto,
        );

      expect(
        enrollmentFindManyMock,
      ).not.toHaveBeenCalled();

      expect(
        enrollmentCreateManyMock,
      ).not.toHaveBeenCalled();

      expect(result).toEqual({
        course_offering_id: BigInt(1),
        matched_count: 0,
        enrolled_count: 0,
        already_enrolled_count: 0,
      });
    });

    it('should re-resolve the student group during confirmation', async () => {
      await service.bulkCreate(
        BigInt(1),
        groupDto,
      );

      expect(
        selectStudentsForEnrollmentMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        selectStudentsForEnrollmentMock,
      ).toHaveBeenCalledWith(groupDto);
    });
  });

  describe('remove', () => {
    it('should remove an existing enrollment', async () => {
      await service.remove(
        BigInt(1),
        BigInt(100),
      );

      expect(
        enrollmentFindFirstMock,
      ).toHaveBeenCalledWith({
        where: {
          course_offering_id: BigInt(1),
          student_id: BigInt(100),
        },
      });

      expect(
        enrollmentDeleteMock,
      ).toHaveBeenCalledWith({
        where: {
          id: BigInt(1),
        },
      });
    });

    it('should throw when the student is not enrolled', async () => {
      enrollmentFindFirstMock
        .mockResolvedValue(null);

      await expect(
        service.remove(
          BigInt(1),
          BigInt(100),
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'Student is not enrolled in this course offering',
        ),
      );

      expect(
        enrollmentDeleteMock,
      ).not.toHaveBeenCalled();
    });
  });

  describe('course offering validation', () => {
    it('should reject preview when the course offering does not exist', async () => {
      offeringFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.previewGroup(
          BigInt(999),
          groupDto,
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'Course offering not found',
        ),
      );

      expect(
        selectStudentsForEnrollmentMock,
      ).not.toHaveBeenCalled();
    });

    it('should reject bulk enrollment when the course offering does not exist', async () => {
      offeringFindUniqueMock
        .mockResolvedValue(null);

      await expect(
        service.bulkCreate(
          BigInt(999),
          groupDto,
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'Course offering not found',
        ),
      );

      expect(
        selectStudentsForEnrollmentMock,
      ).not.toHaveBeenCalled();

      expect(
        enrollmentCreateManyMock,
      ).not.toHaveBeenCalled();
    });
  });
});