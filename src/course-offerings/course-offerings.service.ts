import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { class_type, Prisma } from '@prisma/client';

import { normalizeClassGroups } from '../common/utils/class-group.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { CourseOfferingGroupScopeDto } from './dto/course-offering-group-scope.dto';
import { LecturerCourseOfferingsQueryDto } from './dto/lecturer-course-offerings-query.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';

const groupScopeInclude = {
  academic_years: {
    select: {
      id: true,
      name: true,
      start_year: true,
      is_active: true,
    },
  },
  student_generations: {
    select: {
      id: true,
      name: true,
    },
  },
  majors: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.course_offering_group_scopesInclude;

const evaluationGroupTargetInclude = {
  academic_years: {
    select: {
      id: true,
      name: true,
      start_year: true,
      is_active: true,
    },
  },

  student_generations: {
    select: {
      id: true,
      name: true,
    },
  },

  majors: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.evaluation_group_targetsInclude;

// Related rows returned with each offering.
// section_code remains a display label and is not used
// as proof of student class-group assignment.
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
  group_scopes: {
    include: groupScopeInclude,
    orderBy: [
      {
        generation_id: 'asc' as const,
      },
      {
        major_id: 'asc' as const,
      },
      {
        year_level: 'asc' as const,
      },
      {
        class_group: 'asc' as const,
      },
    ],
  },
} satisfies Prisma.course_offeringsInclude;

const DUPLICATE_MESSAGE =
  'This course offering already exists';

type PrismaWriteClient =
  | PrismaService
  | Prisma.TransactionClient;

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

  async findOwnedByLecturer(
    lecturerId: bigint,
    query: LecturerCourseOfferingsQueryDto,
  ) {
    const search = query.search?.trim();

    const where: Prisma.course_offeringsWhereInput = {
      lecturer_id: lecturerId,

      semester_id:
        query.semester_id !== undefined
          ? BigInt(query.semester_id)
          : undefined,

      year_level: query.year_level,

      class_type: query.class_type,

      semesters:
        query.academic_year_id !== undefined
          ? {
              academic_year_id: BigInt(
                query.academic_year_id,
              ),
            }
          : undefined,

      OR:
        search && search.length > 0
          ? [
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
                section_code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ]
          : undefined,
    };

    const offerings =
      await this.prisma.course_offerings.findMany({
        where,

        include: {
          courses: true,

          semesters: {
            include: {
              academic_years: true,
            },
          },

          group_scopes: {
            include: groupScopeInclude,
            orderBy: [
              {
                generation_id: 'asc',
              },
              {
                major_id: 'asc',
              },
              {
                year_level: 'asc',
              },
              {
                class_group: 'asc',
              },
            ],
          },

          evaluations: {
            select: {
              id: true,
              status: true,
              start_at: true,
              end_at: true,
              survey_version_id: true,

              group_targets: {
                include:
                  evaluationGroupTargetInclude,

                orderBy: [
                  {
                    generation_id: 'asc',
                  },
                  {
                    major_id: 'asc',
                  },
                  {
                    year_level: 'asc',
                  },
                  {
                    class_group: 'asc',
                  },
                ],
              },
            },

            orderBy: {
              created_at: 'desc',
            },
          },
        },

        orderBy: {
          id: 'asc',
        },
      });

    return {
      items: offerings,
      total: offerings.length,
      complete: true,
    };
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
    return inSerializableTransaction(
      this.prisma,
      (db) => new CourseOfferingsService(db).createInTransaction(dto),
      (e: any) => {
        this.handleWriteError(e);
      },
    );
  }

  private async createInTransaction(dto: CreateCourseOfferingDto) {
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

    const classType = dto.class_type;

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
      yearLevel,
      classType ?? null,
    );

    await this.validateGroupScopes(
      semesterId,
      yearLevel,
      dto.group_scopes,
    );

    const now = new Date();

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const offering =
            await tx.course_offerings.create({
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
            });

          if (dto.group_scopes !== undefined) {
            await this.createGroupScopes(
              tx,
              offering.id,
              dto.group_scopes,
            );
          }

          return tx.course_offerings.findUniqueOrThrow({
            where: {
              id: offering.id,
            },
            include: offeringInclude,
          });
        },
      );
    } catch (e: any) {
      this.handleWriteError(e);
    }
  }

  async update(id: bigint, dto: UpdateCourseOfferingDto) {
    return inSerializableTransaction(
      this.prisma,
      (db) => new CourseOfferingsService(db).updateInTransaction(id, dto),
      (e: any) => {
        this.handleWriteError(e);
      },
    );
  }

  private async updateInTransaction(
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
      yearLevel,
      classType,
      id,
    );

    /*
     * If group_scopes is omitted, existing scopes are
     * preserved. But if the offering academic context itself
     * changes, those preserved scopes must still remain valid.
     */
    const scopesForValidation =
      dto.group_scopes !== undefined
        ? dto.group_scopes
        : existing.group_scopes.map((scope) => ({
            academic_year_id:
              scope.academic_year_id.toString(),
            generation_id:
              scope.generation_id.toString(),
            major_id: scope.major_id.toString(),
            year_level: scope.year_level,
            class_groups: [scope.class_group],
          }));

    await this.validateGroupScopes(
      semesterId,
      yearLevel,
      scopesForValidation,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.course_offerings.update({
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
          });

          if (dto.group_scopes !== undefined) {
            await tx.course_offering_group_scopes.deleteMany({
              where: {
                course_offering_id: id,
              },
            });

            await this.createGroupScopes(
              tx,
              id,
              dto.group_scopes,
            );
          }

          return tx.course_offerings.findUniqueOrThrow({
            where: {
              id,
            },
            include: offeringInclude,
          });
        },
      );
    } catch (e: any) {
      this.handleWriteError(e);
    }
  }

  async remove(id: bigint) {
    return inSerializableTransaction(
      this.prisma,
      (db) => new CourseOfferingsService(db).removeInTransaction(id),
      (e: any) => {
        if (e.code === 'P2003') {
          throw new ConflictException(
            'Course offering has enrollments or evaluations and cannot be deleted',
          );
        }
        throw e;
      },
    );
  }

  private async removeInTransaction(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Group-scope rows are configuration owned by the
           * offering. Remove them explicitly before deleting
           * an otherwise unused offering because the schema
           * intentionally uses NO ACTION foreign keys.
           */
          await tx.course_offering_group_scopes.deleteMany({
            where: {
              course_offering_id: id,
            },
          });

          await tx.course_offerings.delete({
            where: {
              id,
            },
          });
        },
      );
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Course offering has enrollments or evaluations and cannot be deleted',
        );
      }
      throw e;
    }
  }

  private async validateGroupScopes(
    semesterId: bigint,
    offeringYearLevel: number | null,
    scopes:
      | CourseOfferingGroupScopeDto[]
      | undefined,
  ) {
    if (scopes === undefined) {
      return;
    }

    const semester =
      await this.prisma.semesters.findUnique({
        where: {
          id: semesterId,
        },
        select: {
          academic_year_id: true,
        },
      });

    if (!semester) {
      throw new BadRequestException(
        'semester_id does not match any semester',
      );
    }

    const seen = new Set<string>();

    for (const scope of scopes) {
      const academicYearId = BigInt(
        scope.academic_year_id,
      );
      const generationId = BigInt(
        scope.generation_id,
      );
      const majorId = BigInt(scope.major_id);

      if (
        academicYearId !==
        semester.academic_year_id
      ) {
        throw new BadRequestException(
          'Group scope academic_year_id must match the course offering semester academic year',
        );
      }

      if (
        offeringYearLevel !== null &&
        scope.year_level !== offeringYearLevel
      ) {
        throw new BadRequestException(
          'Group scope year_level must match the course offering year_level',
        );
      }

      const normalizedGroups =
        normalizeClassGroups(
          scope.class_groups,
        );

      if (normalizedGroups.length === 0) {
        throw new BadRequestException(
          'Each group scope must contain at least one non-empty class group',
        );
      }

      const [academicYear, generation, major] =
        await Promise.all([
          this.prisma.academic_years.findUnique({
            where: {
              id: academicYearId,
            },
            select: {
              id: true,
            },
          }),

          this.prisma.student_generations.findUnique({
            where: {
              id: generationId,
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

      if (!academicYear) {
        throw new BadRequestException(
          'Group scope academic_year_id does not match any academic year',
        );
      }

      if (!generation) {
        throw new BadRequestException(
          'Group scope generation_id does not match any student generation',
        );
      }

      if (!major) {
        throw new BadRequestException(
          'Group scope major_id does not match any major',
        );
      }

      for (const classGroup of normalizedGroups) {
        const key = [
          academicYearId.toString(),
          generationId.toString(),
          majorId.toString(),
          scope.year_level.toString(),
          classGroup,
        ].join(':');

        if (seen.has(key)) {
          throw new BadRequestException(
            'Duplicate course offering group scope',
          );
        }

        seen.add(key);
      }
    }
  }

  private async createGroupScopes(
    prisma: PrismaWriteClient,
    offeringId: bigint,
    scopes: CourseOfferingGroupScopeDto[],
  ) {
    const rows = scopes.flatMap((scope) => {
      const normalizedGroups =
        normalizeClassGroups(
          scope.class_groups,
        );

      return normalizedGroups.map(
        (classGroup) => ({
          course_offering_id: offeringId,
          academic_year_id: BigInt(
            scope.academic_year_id,
          ),
          generation_id: BigInt(
            scope.generation_id,
          ),
          major_id: BigInt(
            scope.major_id,
          ),
          year_level: scope.year_level,
          class_group: classGroup,
        }),
      );
    });

    if (rows.length === 0) {
      return;
    }

    await prisma.course_offering_group_scopes.createMany({
      data: rows,
    });
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
    yearLevel: number | null,
    classType: class_type | null,
    excludeId?: bigint,
  ) {
    const duplicate =
      await this.prisma.course_offerings.findFirst({
        where: {
          course_id: courseId,
          lecturer_id: lecturerId,
          semester_id: semesterId,
          section_code: sectionCode,
          year_level: yearLevel,
          class_type: classType,

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

  private handleWriteError(e: any): never {
    if (e.code === 'P2002') {
      throw new ConflictException(
        DUPLICATE_MESSAGE,
      );
    }

    if (e.code === 'P2003') {
      throw new BadRequestException(
        'Invalid course offering group scope or course, lecturer, semester reference',
      );
    }

    throw e;
  }
}
