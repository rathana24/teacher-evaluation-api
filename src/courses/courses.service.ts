import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import {
  CourseCreationService,
  lockCourseCodes,
} from './course-creation.service';

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

  async create(dto: CreateCourseDto, actorId: bigint, key?: string) {
    return new CourseCreationService(this.prisma).create(dto, actorId, key);
  }

  async creationReceipt(actorId: bigint, key: string) {
    return new CourseCreationService(this.prisma).receipt(actorId, key);
  }

  async update(id: bigint, dto: UpdateCourseDto) {
    try {
      return await this.prisma.$transaction(
        async (db) => {
          await lockCourseCodes(db);
          const service = new CoursesService(db as PrismaService);
          await service.findOne(id);
          if (dto.department_id !== undefined)
            await service.checkDepartment(BigInt(dto.department_id));
          return db.courses.update({
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
        },
        { maxWait: 5000, timeout: 20000 },
      );
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
