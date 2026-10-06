import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { normalizeClassGroup } from '../common/utils/class-group.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentAcademicRecordDto } from './dto/create-student-academic-record.dto';
import { UpdateStudentAcademicRecordDto } from './dto/update-student-academic-record.dto';

const academicRecordSelect = {
  id: true,
  student_id: true,
  academic_year_id: true,
  year_level: true,
  major_id: true,
  class_group: true,
  created_at: true,
  updated_at: true,

  students: {
    select: {
      id: true,
      student_code: true,
      user_id: true,
      generation_id: true,

      users: {
        select: {
          id: true,
          full_name: true,
          email: true,
          gender: true,
          status: true,
        },
      },

      student_generations: {
        select: {
          id: true,
          name: true,
          entry_academic_year_id: true,
          starting_year_level: true,
        },
      },
    },
  },

  academic_years: {
    select: {
      id: true,
      name: true,
      start_year: true,
      is_active: true,
    },
  },

  majors: {
    select: {
      id: true,
      code: true,
      name: true,
      department_id: true,

      departments: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      },
    },
  },
} satisfies Prisma.student_academic_recordsSelect;

@Injectable()
export class StudentAcademicRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.student_academic_records.findMany({
      select: academicRecordSelect,
      orderBy: [
        {
          academic_year_id: 'desc',
        },
        {
          student_id: 'asc',
        },
      ],
    });
  }

  async findOne(id: bigint) {
    const record =
      await this.prisma.student_academic_records.findUnique({
        where: {
          id,
        },
        select: academicRecordSelect,
      });

    if (!record) {
      throw new NotFoundException(
        'Student academic record not found',
      );
    }

    return record;
  }

  private async ensureStudentExists(studentId: bigint) {
    const student = await this.prisma.students.findUnique({
      where: {
        id: studentId,
      },
      select: {
        id: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }
  }

  private async ensureAcademicYearExists(
    academicYearId: bigint,
  ) {
    const academicYear =
      await this.prisma.academic_years.findUnique({
        where: {
          id: academicYearId,
        },
        select: {
          id: true,
        },
      });

    if (!academicYear) {
      throw new NotFoundException(
        'Academic year not found',
      );
    }
  }

  private async ensureMajorExists(majorId: bigint) {
    const major = await this.prisma.majors.findUnique({
      where: {
        id: majorId,
      },
      select: {
        id: true,
      },
    });

    if (!major) {
      throw new NotFoundException('Major not found');
    }
  }

  private async ensureReferencesExist(
    studentId: bigint,
    academicYearId: bigint,
    majorId: bigint,
  ) {
    await Promise.all([
      this.ensureStudentExists(studentId),
      this.ensureAcademicYearExists(academicYearId),
      this.ensureMajorExists(majorId),
    ]);
  }

  async create(dto: CreateStudentAcademicRecordDto) {
    const studentId = BigInt(dto.student_id);
    const academicYearId = BigInt(dto.academic_year_id);
    const majorId = BigInt(dto.major_id);

    await this.ensureReferencesExist(
      studentId,
      academicYearId,
      majorId,
    );

    try {
      return await this.prisma.student_academic_records.create({
        data: {
          student_id: studentId,
          academic_year_id: academicYearId,
          year_level: dto.year_level,
          major_id: majorId,
          class_group: normalizeClassGroup(
            dto.class_group,
          ),
        },
        select: academicRecordSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(
    id: bigint,
    dto: UpdateStudentAcademicRecordDto,
  ) {
    const existingRecord =
      await this.prisma.student_academic_records.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
          student_id: true,
          academic_year_id: true,
          major_id: true,
        },
      });

    if (!existingRecord) {
      throw new NotFoundException(
        'Student academic record not found',
      );
    }

    const studentId =
      dto.student_id !== undefined
        ? BigInt(dto.student_id)
        : existingRecord.student_id;

    const academicYearId =
      dto.academic_year_id !== undefined
        ? BigInt(dto.academic_year_id)
        : existingRecord.academic_year_id;

    const majorId =
      dto.major_id !== undefined
        ? BigInt(dto.major_id)
        : existingRecord.major_id;

    await this.ensureReferencesExist(
      studentId,
      academicYearId,
      majorId,
    );

    try {
      return await this.prisma.student_academic_records.update({
        where: {
          id,
        },
        data: {
          ...(dto.student_id !== undefined && {
            student_id: studentId,
          }),

          ...(dto.academic_year_id !== undefined && {
            academic_year_id: academicYearId,
          }),

          ...(dto.year_level !== undefined && {
            year_level: dto.year_level,
          }),

          ...(dto.major_id !== undefined && {
            major_id: majorId,
          }),

          ...(dto.class_group !== undefined && {
            class_group: normalizeClassGroup(
              dto.class_group,
            ),
          }),
        },
        select: academicRecordSelect,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: bigint) {
    const existingRecord =
      await this.prisma.student_academic_records.findUnique({
        where: {
          id,
        },
        select: {
          id: true,
        },
      });

    if (!existingRecord) {
      throw new NotFoundException(
        'Student academic record not found',
      );
    }

    try {
      await this.prisma.student_academic_records.delete({
        where: {
          id,
        },
      });

      return {
        message: 'Student academic record deleted successfully',
      };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError
    ) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'An academic record already exists for this student and academic year',
        );
      }

      if (error.code === 'P2003') {
        throw new ConflictException(
          'Student academic record cannot be changed or deleted because related records exist',
        );
      }
    }

    throw error;
  }
}