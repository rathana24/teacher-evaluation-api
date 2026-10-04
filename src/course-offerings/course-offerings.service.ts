import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';

// Related rows returned with each offering.
// The lecturer is limited to safe fields, so password_hash is never sent back.
const offeringInclude = {
  courses: true,
  semesters: {
    include: {
      academic_years: true,
    },
  },
  users: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
} satisfies Prisma.course_offeringsInclude;

const DUPLICATE_MESSAGE =
  'This course offering already exists';

@Injectable()
export class CourseOfferingsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.course_offerings.findMany({
      include: offeringInclude,
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const offering =
      await this.prisma.course_offerings.findUnique({
        where: {
          id,
        },
        include: offeringInclude,
      });

    if (!offering) {
      throw new NotFoundException(
        'Course offering not found',
      );
    }

    return offering;
  }

  async create(dto: CreateCourseOfferingDto) {
    const courseId = BigInt(dto.course_id);
    const lecturerId = BigInt(dto.lecturer_id);
    const semesterId = BigInt(dto.semester_id);

    const sectionCode =
      dto.section_code !== undefined
        ? dto.section_code.trim()
        : null;

    const yearLevel =
      dto.year_level !== undefined
        ? dto.year_level
        : null;

    const classType =
      dto.class_type !== undefined
        ? dto.class_type
        : null;

    await this.checkReferences(
      courseId,
      lecturerId,
      semesterId,
    );

    await this.checkNotDuplicate(
      courseId,
      lecturerId,
      semesterId,
      sectionCode,
    );

    const now = new Date();

    try {
      return await this.prisma.course_offerings.create({
        data: {
          course_id: courseId,
          lecturer_id: lecturerId,
          semester_id: semesterId,
          section_code: sectionCode,
          year_level: yearLevel,
          class_type: classType,
          created_at: now,
          updated_at: now,
        },
        include: offeringInclude,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          DUPLICATE_MESSAGE,
        );
      }

      if (e.code === 'P2003') {
        throw new BadRequestException(
          'Invalid course, lecturer, or semester reference',
        );
      }

      throw e;
    }
  }

  async update(
    id: bigint,
    dto: UpdateCourseOfferingDto,
  ) {
    const existing = await this.findOne(id);

    const courseId =
      dto.course_id !== undefined
        ? BigInt(dto.course_id)
        : existing.course_id;

    const lecturerId =
      dto.lecturer_id !== undefined
        ? BigInt(dto.lecturer_id)
        : existing.lecturer_id;

    const semesterId =
      dto.semester_id !== undefined
        ? BigInt(dto.semester_id)
        : existing.semester_id;

    const sectionCode =
      dto.section_code !== undefined
        ? dto.section_code.trim()
        : existing.section_code;

    const yearLevel =
      dto.year_level !== undefined
        ? dto.year_level
        : existing.year_level;

    const classType =
      dto.class_type !== undefined
        ? dto.class_type
        : existing.class_type;

    await this.checkReferences(
      courseId,
      lecturerId,
      semesterId,
    );

    await this.checkNotDuplicate(
      courseId,
      lecturerId,
      semesterId,
      sectionCode,
      id,
    );

    try {
      return await this.prisma.course_offerings.update({
        where: {
          id,
        },
        data: {
          course_id: courseId,
          lecturer_id: lecturerId,
          semester_id: semesterId,
          section_code: sectionCode,
          year_level: yearLevel,
          class_type: classType,
          updated_at: new Date(),
        },
        include: offeringInclude,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          DUPLICATE_MESSAGE,
        );
      }

      if (e.code === 'P2003') {
        throw new BadRequestException(
          'Invalid course, lecturer, or semester reference',
        );
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.course_offerings.delete({
        where: {
          id,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Course offering has enrollments or evaluations and cannot be deleted',
        );
      }

      throw e;
    }
  }

  private async checkReferences(
    courseId: bigint,
    lecturerId: bigint,
    semesterId: bigint,
  ) {
    const [course, lecturer, semester] =
      await Promise.all([
        this.prisma.courses.findUnique({
          where: {
            id: courseId,
          },
        }),

        this.prisma.users.findUnique({
          where: {
            id: lecturerId,
          },
          select: {
            role: true,
            status: true,
          },
        }),

        this.prisma.semesters.findUnique({
          where: {
            id: semesterId,
          },
        }),
      ]);

    if (!course) {
      throw new BadRequestException(
        'course_id does not match any course',
      );
    }

    if (!semester) {
      throw new BadRequestException(
        'semester_id does not match any semester',
      );
    }

    if (!lecturer || lecturer.role !== 'LECTURER') {
      throw new BadRequestException(
        'lecturer_id must refer to a user with role LECTURER',
      );
    }

    if (lecturer.status !== 'ACTIVE') {
      throw new BadRequestException(
        'lecturer_id must refer to an ACTIVE lecturer',
      );
    }
  }

  private async checkNotDuplicate(
    courseId: bigint,
    lecturerId: bigint,
    semesterId: bigint,
    sectionCode: string | null,
    excludeId?: bigint,
  ) {
    const duplicate =
      await this.prisma.course_offerings.findFirst({
        where: {
          course_id: courseId,
          lecturer_id: lecturerId,
          semester_id: semesterId,
          section_code: sectionCode,

          id:
            excludeId !== undefined
              ? {
                  not: excludeId,
                }
              : undefined,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        DUPLICATE_MESSAGE,
      );
    }
  }
}