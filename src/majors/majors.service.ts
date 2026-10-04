import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMajorDto } from './dto/create-major.dto';
import { UpdateMajorDto } from './dto/update-major.dto';

@Injectable()
export class MajorsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.majors.findMany({
      include: {
        departments: true,
        _count: {
          select: {
            student_academic_records: true,
            course_year_rules: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const major = await this.prisma.majors.findUnique({
      where: {
        id,
      },
      include: {
        departments: true,
        _count: {
          select: {
            student_academic_records: true,
            course_year_rules: true,
          },
        },
      },
    });

    if (!major) {
      throw new NotFoundException('Major not found');
    }

    return major;
  }

  private async ensureDepartmentExists(
    departmentId: bigint,
  ) {
    const department =
      await this.prisma.departments.findUnique({
        where: {
          id: departmentId,
        },
        select: {
          id: true,
        },
      });

    if (!department) {
      throw new NotFoundException(
        'Department not found',
      );
    }
  }

  async create(dto: CreateMajorDto) {
    const departmentId = BigInt(dto.department_id);

    await this.ensureDepartmentExists(departmentId);

    try {
      return await this.prisma.majors.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          department_id: departmentId,
          created_at: new Date(),
          updated_at: new Date(),
        },
        include: {
          departments: true,
          _count: {
            select: {
              student_academic_records: true,
              course_year_rules: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Major code or name already exists',
        );
      }

      if (e.code === 'P2003') {
        throw new NotFoundException(
          'Department not found',
        );
      }

      throw e;
    }
  }

  async update(id: bigint, dto: UpdateMajorDto) {
    await this.findOne(id);

    let departmentId: bigint | undefined;

    if (dto.department_id !== undefined) {
      departmentId = BigInt(dto.department_id);
      await this.ensureDepartmentExists(departmentId);
    }

    try {
      return await this.prisma.majors.update({
        where: {
          id,
        },
        data: {
          code:
            dto.code !== undefined
              ? dto.code.trim().toUpperCase()
              : undefined,

          name:
            dto.name !== undefined
              ? dto.name.trim()
              : undefined,

          department_id: departmentId,

          updated_at: new Date(),
        },
        include: {
          departments: true,
          _count: {
            select: {
              student_academic_records: true,
              course_year_rules: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Major code or name already exists',
        );
      }

      if (e.code === 'P2003') {
        throw new ConflictException(
          'Major is currently in use',
        );
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    const major = await this.findOne(id);

    if (major._count.student_academic_records > 0) {
      throw new ConflictException(
        'Major has student academic records and cannot be deleted',
      );
    }

    if (major._count.course_year_rules > 0) {
      throw new ConflictException(
        'Major has course year rules and cannot be deleted',
      );
    }

    try {
      return await this.prisma.majors.delete({
        where: {
          id,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Major is currently in use and cannot be deleted',
        );
      }

      throw e;
    }
  }
}