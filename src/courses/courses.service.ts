import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.courses.findMany({
      include: {
        departments: true,
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const course = await this.prisma.courses.findUnique({
      where: { id },
      include: {
        departments: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async create(dto: CreateCourseDto) {
    await this.checkDepartment(BigInt(dto.department_id));

    const now = new Date();

    try {
      return await this.prisma.courses.create({
        data: {
          course_code: dto.course_code,
          course_name: dto.course_name,
          description: dto.description,
          department_id: BigInt(dto.department_id),
          created_at: now,
          updated_at: now,
        },
        include: {
          departments: true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('course_code already exists');
      }

      if (e.code === 'P2003') {
        throw new BadRequestException('Invalid department_id');
      }

      throw e;
    }
  }

  async update(id: bigint, dto: UpdateCourseDto) {
    await this.findOne(id);

    if (dto.department_id !== undefined) {
      await this.checkDepartment(BigInt(dto.department_id));
    }

    try {
      return await this.prisma.courses.update({
        where: { id },
        data: {
          course_code: dto.course_code,
          course_name: dto.course_name,
          description: dto.description,

          department_id:
            dto.department_id !== undefined
              ? BigInt(dto.department_id)
              : undefined,

          updated_at: new Date(),
        },
        include: {
          departments: true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('course_code already exists');
      }

      if (e.code === 'P2003') {
        throw new BadRequestException('Invalid department_id');
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.courses.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Course is currently in use and cannot be deleted',
        );
      }

      throw e;
    }
  }

  private async checkDepartment(id: bigint) {
    const department = await this.prisma.departments.findUnique({
      where: { id },
    });

    if (!department) {
      throw new BadRequestException('Department not found');
    }

    if (department.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot assign course to an inactive department',
      );
    }
  }
}