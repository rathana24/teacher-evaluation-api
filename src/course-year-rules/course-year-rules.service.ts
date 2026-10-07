import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseYearRuleDto } from './dto/create-course-year-rule.dto';
import { UpdateCourseYearRuleDto } from './dto/update-course-year-rule.dto';

const courseYearRuleInclude = {
  courses: true,
  majors: {
    include: {
      departments: true,
    },
  },
} satisfies Prisma.course_year_rulesInclude;

const DUPLICATE_MESSAGE =
  'A curriculum rule already exists for this course, major, and year level';

@Injectable()
export class CourseYearRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: {
    course_id?: string;
    major_id?: string;
    year_level?: number;
    search?: string;
  }) {
    let courseId: bigint | undefined;
    let majorId: bigint | undefined;

    try {
      courseId =
        filters?.course_id !== undefined
          ? BigInt(filters.course_id)
          : undefined;

      majorId =
        filters?.major_id !== undefined
          ? BigInt(filters.major_id)
          : undefined;
    } catch {
      throw new BadRequestException(
        'course_id and major_id must be valid positive integer IDs',
      );
    }

    if (
      courseId !== undefined &&
      courseId <= BigInt(0)
    ) {
      throw new BadRequestException(
        'course_id must be a valid positive integer ID',
      );
    }

    if (
      majorId !== undefined &&
      majorId <= BigInt(0)
    ) {
      throw new BadRequestException(
        'major_id must be a valid positive integer ID',
      );
    }

    if (
      filters?.year_level !== undefined &&
      (!Number.isInteger(filters.year_level) ||
        filters.year_level < 1 ||
        filters.year_level > 5)
    ) {
      throw new BadRequestException(
        'year_level must be an integer between 1 and 5',
      );
    }

    const search = filters?.search?.trim();
    const where: Prisma.course_year_rulesWhereInput = {
      course_id: courseId,
      major_id: majorId,
      year_level: filters?.year_level,

      ...(search
        ? {
            OR: [
              {
                courses: {
                  is: {
                    course_code: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                courses: {
                  is: {
                    course_name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                majors: {
                  is: {
                    code: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                majors: {
                  is: {
                    name: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.course_year_rules.findMany({
      where,
      include: courseYearRuleInclude,
      orderBy: [
        {
          major_id: 'asc',
        },
        {
          year_level: 'asc',
        },
        {
          course_id: 'asc',
        },
      ],
    });
  }

  async findOne(id: bigint) {
    const rule =
      await this.prisma.course_year_rules.findUnique({
        where: {
          id,
        },
        include: courseYearRuleInclude,
      });

    if (!rule) {
      throw new NotFoundException(
        'Course year rule not found',
      );
    }

    return rule;
  }

  async create(dto: CreateCourseYearRuleDto) {
    const courseId = BigInt(dto.course_id);
    const majorId = BigInt(dto.major_id);

    await this.checkReferences(courseId, majorId);

    await this.checkNotDuplicate(
      courseId,
      majorId,
      dto.year_level,
    );

    try {
      return await this.prisma.course_year_rules.create({
        data: {
          course_id: courseId,
          major_id: majorId,
          year_level: dto.year_level,
        },
        include: courseYearRuleInclude,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          DUPLICATE_MESSAGE,
        );
      }

      if (e.code === 'P2003') {
        throw new BadRequestException(
          'Invalid course or major reference',
        );
      }

      throw e;
    }
  }

  async update(
    id: bigint,
    dto: UpdateCourseYearRuleDto,
  ) {
    const existing = await this.findOne(id);

    const courseId =
      dto.course_id !== undefined
        ? BigInt(dto.course_id)
        : existing.course_id;

    const majorId =
      dto.major_id !== undefined
        ? BigInt(dto.major_id)
        : existing.major_id;

    const yearLevel =
      dto.year_level !== undefined
        ? dto.year_level
        : existing.year_level;

    await this.checkReferences(courseId, majorId);

    await this.checkNotDuplicate(
      courseId,
      majorId,
      yearLevel,
      id,
    );

    try {
      return await this.prisma.course_year_rules.update({
        where: {
          id,
        },
        data: {
          course_id: courseId,
          major_id: majorId,
          year_level: yearLevel,
        },
        include: courseYearRuleInclude,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          DUPLICATE_MESSAGE,
        );
      }

      if (e.code === 'P2003') {
        throw new BadRequestException(
          'Invalid course or major reference',
        );
      }

      if (e.code === 'P2025') {
        throw new NotFoundException(
          'Course year rule not found',
        );
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    await this.findOne(id);

    try {
      return await this.prisma.course_year_rules.delete({
        where: {
          id,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2025') {
        throw new NotFoundException(
          'Course year rule not found',
        );
      }

      throw e;
    }
  }

  private async checkReferences(
    courseId: bigint,
    majorId: bigint,
  ) {
    const [course, major] = await Promise.all([
      this.prisma.courses.findUnique({
        where: {
          id: courseId,
        },
        select: {
          id: true,
        },
      }),

      this.prisma.majors.findUnique({
        where: {
          id: majorId,
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!course) {
      throw new BadRequestException(
        'course_id does not match any course',
      );
    }

    if (!major) {
      throw new BadRequestException(
        'major_id does not match any major',
      );
    }
  }

  private async checkNotDuplicate(
    courseId: bigint,
    majorId: bigint,
    yearLevel: number,
    excludeId?: bigint,
  ) {
    const duplicate =
      await this.prisma.course_year_rules.findFirst({
        where: {
          course_id: courseId,
          major_id: majorId,
          year_level: yearLevel,
          id:
            excludeId !== undefined
              ? {
                  not: excludeId,
                }
              : undefined,
        },
        select: {
          id: true,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        DUPLICATE_MESSAGE,
      );
    }
  }
}