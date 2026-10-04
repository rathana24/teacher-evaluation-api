import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentGenerationDto } from './dto/create-student-generation.dto';
import { UpdateStudentGenerationDto } from './dto/update-student-generation.dto';

@Injectable()
export class StudentGenerationsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.student_generations.findMany({
      include: {
        entry_academic_year: true,
        _count: {
          select: {
            students: true,
            evaluation_targets: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const generation =
      await this.prisma.student_generations.findUnique({
        where: {
          id,
        },
        include: {
          entry_academic_year: true,
          _count: {
            select: {
              students: true,
              evaluation_targets: true,
            },
          },
        },
      });

    if (!generation) {
      throw new NotFoundException(
        'Student generation not found',
      );
    }

    return generation;
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
          name: true,
          start_year: true,
        },
      });

    if (!academicYear) {
      throw new NotFoundException(
        'Academic year not found',
      );
    }

    return academicYear;
  }

  async create(dto: CreateStudentGenerationDto) {
    const academicYearId = BigInt(
      dto.entry_academic_year_id,
    );

    await this.ensureAcademicYearExists(
      academicYearId,
    );

    const normalizedName = dto.name
      .trim()
      .replace(/\s+/g, ' ');

    try {
      return await this.prisma.student_generations.create({
        data: {
          name: normalizedName,
          entry_academic_year_id: academicYearId,
          starting_year_level:
            dto.starting_year_level ?? 1,
          created_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          entry_academic_year: true,
          _count: {
            select: {
              students: true,
              evaluation_targets: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Student generation already exists',
        );
      }

      if (e.code === 'P2003') {
        throw new NotFoundException(
          'Academic year not found',
        );
      }

      throw e;
    }
  }

  async update(
    id: bigint,
    dto: UpdateStudentGenerationDto,
  ) {
    await this.findOne(id);

    let academicYearId: bigint | undefined;

    if (dto.entry_academic_year_id !== undefined) {
      academicYearId = BigInt(
        dto.entry_academic_year_id,
      );

      await this.ensureAcademicYearExists(
        academicYearId,
      );
    }

    try {
      return await this.prisma.student_generations.update({
        where: {
          id,
        },
        data: {
          name:
            dto.name !== undefined
              ? dto.name.trim().replace(/\s+/g, ' ')
              : undefined,

          entry_academic_year_id: academicYearId,

          starting_year_level:
            dto.starting_year_level,

          updated_at: new Date(),
        },
        include: {
          entry_academic_year: true,
          _count: {
            select: {
              students: true,
              evaluation_targets: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Student generation already exists',
        );
      }

      if (e.code === 'P2003') {
        throw new ConflictException(
          'Student generation is currently in use',
        );
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    const generation = await this.findOne(id);

    if (generation._count.students > 0) {
      throw new ConflictException(
        'Student generation has students and cannot be deleted',
      );
    }

    if (generation._count.evaluation_targets > 0) {
      throw new ConflictException(
        'Student generation is used by evaluations and cannot be deleted',
      );
    }

    try {
      return await this.prisma.student_generations.delete({
        where: {
          id,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Student generation is currently in use and cannot be deleted',
        );
      }

      throw e;
    }
  }
}