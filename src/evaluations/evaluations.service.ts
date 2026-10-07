import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import {

  BadRequestException,

  ConflictException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import {
  evaluation_participant_scope,
  Prisma,
} from '@prisma/client';

import {
  normalizeClassGroup,
  normalizeClassGroups,
} from '../common/utils/class-group.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import {
  EvaluationGroupScopeDto,
} from './dto/evaluation-group-scope.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

import { ListEvaluationsQueryDto } from './dto/list-evaluations-query.dto';

import { PreviewEvaluationParticipantsDto } from './dto/preview-evaluation-participants.dto';

const evaluationInclude = {

  course_offerings: {

    select: {

      id: true,

      section_code: true,

      year_level: true,

      class_type: true,

      courses: {

        select: {

          id: true,

          course_code: true,

          course_name: true,

        },

      },

      semesters: {

        select: {

          id: true,

          semester_name: true,

          semester_number: true,

          academic_year_id: true,

          academic_years: {

            select: {

              id: true,

              name: true,

              start_year: true,

            },

          },

        },

      },

      users: {

        select: {

          id: true,

          full_name: true,

        },

      },

    },

  },

  survey_versions: {

    select: {

      id: true,

      version_no: true,

      status: true,

      surveys: {

        select: {

          id: true,

          title: true,

        },

      },

    },

  },

  generation_targets: {

    select: {

      generation_id: true,

      student_generations: {

        select: {

          id: true,

          name: true,

        },

      },

    },

    orderBy: {
      generation_id: 'asc' as const,
    },
  },

  group_targets: {
    select: {
      academic_year_id: true,
      generation_id: true,
      major_id: true,
      year_level: true,
      class_group: true,

      academic_years: {
        select: {
          id: true,
          name: true,
          start_year: true,
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
          name: true,
        },
      },
    },

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

  _count: {

    select: {

      evaluation_participants: true,

      responses: true,

    },

  },

} satisfies Prisma.evaluationsInclude;

type EligibleStudent = {
  user_id: bigint;
  student_id: bigint;
  student_code: string;
  full_name: string;
  generation_id: bigint;
  generation_name: string;
  effective_year_level: number | null;
  year_level_source:
    | 'ACADEMIC_RECORD'
    | 'GENERATION_CALCULATION'
    | 'NOT_STARTED'
    | 'BEYOND_PROGRAM'
    | 'UNAVAILABLE';
  placement_academic_year_id: bigint;
  placement_major_id: bigint | null;
  class_group: string | null;
};

type EligibilityResult = {
  participant_scope: evaluation_participant_scope;
  generation_ids: bigint[];
  group_scope: {
    academic_year_id: bigint;
    generation_id: bigint;
    major_id: bigint;
    year_level: number;
    class_groups: string[];
  } | null;
  eligible_students: EligibleStudent[];
  enrolled_count: number;
  ineligible_count: number;
  ineligible_reasons: {
    not_active_student: number;
    missing_student_profile: number;
    generation_not_selected: number;
    year_level_mismatch: number;
    year_level_unavailable: number;
    group_generation_mismatch: number;
    group_major_mismatch: number;
    group_year_level_mismatch: number;
    group_missing_placement: number;
    class_group_mismatch: number;
  };
};

type ResolvedEvaluationGroupScope = {
  academic_year_id: bigint;
  generation_id: bigint;
  major_id: bigint;
  year_level: number;
  class_groups: string[];
};

@Injectable()

export class EvaluationsService {

  constructor(

    private readonly prisma: PrismaService,

  ) {}

  findAll(query: ListEvaluationsQueryDto) {

    return this.prisma.evaluations.findMany({

      where: {

        status: query.status,

      },

      include: evaluationInclude,

      orderBy: {

        id: 'asc',

      },

    });

  }

  async findOne(id: bigint) {

    const evaluation =

      await this.prisma.evaluations.findUnique({

        where: {

          id,

        },

        include: evaluationInclude,

      });

    if (!evaluation) {

      throw new NotFoundException(

        'Evaluation not found',

      );

    }

    return evaluation;

  }

  async previewParticipants(dto: PreviewEvaluationParticipantsDto) {
    return inSerializableTransaction(this.prisma, (db) =>
      new EvaluationsService(db).previewParticipantsInTransaction(dto),
    );
  }

  private async previewParticipantsInTransaction(

    dto: PreviewEvaluationParticipantsDto,

  ) {

    const offeringId = BigInt(

      dto.course_offering_id,

    );

    const scope =

      dto.participant_scope ??

      evaluation_participant_scope.ALL_ENROLLED;

    const generationIds =

      this.parseGenerationIds(

        scope,

        dto.generation_ids,

      );

    const result =

      await this.resolveEligibleStudents(

        offeringId,

        scope,

        generationIds,

        dto.group_scope,

      );

    return {

      course_offering_id:

        offeringId.toString(),

      participant_scope:

        result.participant_scope,

      generation_ids:

        result.generation_ids.map(

          (id) => id.toString(),

        ),

      group_scope:
        result.group_scope === null
          ? null
          : {
              academic_year_id:
                result.group_scope.academic_year_id.toString(),
              generation_id:
                result.group_scope.generation_id.toString(),
              major_id:
                result.group_scope.major_id.toString(),
              year_level:
                result.group_scope.year_level,
              class_groups:
                result.group_scope.class_groups,
            },

      enrolled_count:

        result.enrolled_count,

      eligible_count:

        result.eligible_students.length,

      ineligible_count:

        result.ineligible_count,

      ineligible_reasons:
        {
          not_active_student:
            result.ineligible_reasons.not_active_student,
          missing_student_profile:
            result.ineligible_reasons.missing_student_profile,
          generation_not_selected:
            result.ineligible_reasons.generation_not_selected,
          year_level_mismatch:
            result.ineligible_reasons.year_level_mismatch,
          year_level_unavailable:
            result.ineligible_reasons.year_level_unavailable,
          group_generation_mismatch:
            result.ineligible_reasons.group_generation_mismatch,
          group_major_mismatch:
            result.ineligible_reasons.group_major_mismatch,
          group_year_level_mismatch:
            result.ineligible_reasons.group_year_level_mismatch,
          group_missing_placement:
            result.ineligible_reasons.group_missing_placement,
          class_group_mismatch:
            result.ineligible_reasons.class_group_mismatch,
        },

      eligible_students:

        result.eligible_students.map(

          (student) => ({

            user_id:

              student.user_id.toString(),

            student_id:

              student.student_id.toString(),

            student_code:

              student.student_code,

            full_name:

              student.full_name,

            generation_id:

              student.generation_id.toString(),

            generation_name:

              student.generation_name,

            effective_year_level:

              student.effective_year_level,

            year_level_source:
              student.year_level_source,

            placement_academic_year_id:
              student.placement_academic_year_id.toString(),

            placement_major_id:
              student.placement_major_id?.toString() ??
              null,

            class_group:
              student.class_group,

          }),

        ),

      confirmed_student_ids:

        result.eligible_students.map(

          (student) =>

            student.user_id.toString(),

        ),

    };

  }

  async create(dto: CreateEvaluationDto, createdBy: bigint) {
    return inSerializableTransaction(
      this.prisma,
      (db) => new EvaluationsService(db).createInTransaction(dto, createdBy),
      (e: any) => {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          throw new ConflictException(
            'This course offering already has an evaluation using this survey version',
          );
        }

        throw e;
      },
    );
  }

  private async createInTransaction(

    dto: CreateEvaluationDto,

    createdBy: bigint,

  ) {

    const offeringId = BigInt(

      dto.course_offering_id,

    );

    const offering =

      await this.prisma.course_offerings.findUnique({

        where: {

          id: offeringId,

        },

        select: {

          id: true,

        },

      });

    if (!offering) {

      throw new BadRequestException(

        'course_offering_id does not match any course offering',

      );

    }

    const versionId =

      await this.resolveSurveyVersion(dto);

    const startAt = dto.start_at

      ? new Date(dto.start_at)

      : null;

    const endAt = dto.end_at

      ? new Date(dto.end_at)

      : null;

    this.checkWindow(

      startAt,

      endAt,

    );

    const scope =

      dto.participant_scope ??

      evaluation_participant_scope.ALL_ENROLLED;

    const generationIds =

      this.parseGenerationIds(

        scope,

        dto.generation_ids,

      );

    const requiresConfirmedParticipants =

      scope ===

        evaluation_participant_scope.SELECTED_GENERATIONS ||

      dto.group_scope !== undefined ||

      dto.confirmed_student_ids !== undefined;

    let eligibility:

      | EligibilityResult

      | null = null;

    if (requiresConfirmedParticipants) {

      if (

        dto.confirmed_student_ids === undefined

      ) {

        throw new BadRequestException(

          'confirmed_student_ids is required after previewing the selected participant scope',

        );

      }

      eligibility =

        await this.resolveEligibleStudents(

          offeringId,

          scope,

          generationIds,

          dto.group_scope,

        );

      if (

        eligibility.eligible_students.length === 0

      ) {

        throw new BadRequestException(

          'No eligible students match the selected participant scope',

        );

      }

      this.assertConfirmedStudentsUnchanged(

        dto.confirmed_student_ids,

        eligibility.eligible_students.map(

          (student) => student.user_id,

        ),

      );

    }

    const now = new Date();

    try {

      const evaluationId =

        await this.prisma.$transaction(

          async (tx) => {

            let transactionEligibility =
              eligibility;

            if (requiresConfirmedParticipants) {
              transactionEligibility =
                await this.resolveEligibleStudents(
                  offeringId,
                  scope,
                  generationIds,
                  dto.group_scope,
                  tx,
                );

              this.assertConfirmedStudentsUnchanged(
                dto.confirmed_student_ids!,
                transactionEligibility.eligible_students.map(
                  (student) => student.user_id,
                ),
              );

              if (
                transactionEligibility.eligible_students
                  .length === 0
              ) {
                throw new BadRequestException(
                  'No eligible students match the selected participant scope',
                );
              }
            }

            const created =

              await tx.evaluations.create({

                data: {

                  course_offering_id:

                    offeringId,

                  survey_version_id:

                    versionId,

                  participant_scope:

                    scope,

                  status:

                    'DRAFT',

                  start_at:

                    startAt,

                  end_at:

                    endAt,

                  created_by:

                    createdBy,

                  created_at:

                    now,

                  updated_at:

                    now,

                },

                select: {

                  id: true,

                },

              });

            if (

              generationIds.length > 0

            ) {

              await tx.evaluation_generation_targets.createMany({

                data: generationIds.map(

                  (generationId) => ({

                    evaluation_id:

                      created.id,

                    generation_id:

                      generationId,

                    created_at:

                      now,

                  }),

                ),

              });

            }

            if (
              transactionEligibility?.group_scope !==
                null &&
              transactionEligibility?.group_scope !==
                undefined
            ) {
              const frozenGroupScope =
                transactionEligibility.group_scope;

              await tx.evaluation_group_targets.createMany({
                data:
                  frozenGroupScope.class_groups.map(
                    (classGroup) => ({
                      evaluation_id:
                        created.id,

                      academic_year_id:
                        frozenGroupScope.academic_year_id,

                      generation_id:
                        frozenGroupScope.generation_id,

                      major_id:
                        frozenGroupScope.major_id,

                      year_level:
                        frozenGroupScope.year_level,

                      class_group:
                        classGroup,

                      created_at:
                        now,
                    }),
                  ),
              });
            }

            if (

              transactionEligibility !== null

            ) {

              await tx.evaluation_participants.createMany({

                data:

                  transactionEligibility.eligible_students.map(

                    (student) => ({

                      evaluation_id:

                        created.id,

                      student_id:

                        student.user_id,

                      survey_version_id:

                        versionId,

                      has_submitted:

                        false,

                      created_at:

                        now,

                    }),

                  ),

              });

            }

            return created.id;

          },

        );

      return this.findOne(

        evaluationId,

      );

    } catch (e: unknown) {

      if (

        e instanceof

          Prisma.PrismaClientKnownRequestError &&

        e.code === 'P2002'

      ) {

        throw new ConflictException(

          'This course offering already has an evaluation using this survey version',

        );

      }

      throw e;

    }

  }

  async updateSchedule(id: bigint, dto: UpdateScheduleDto) {
    return inSerializableTransaction(this.prisma, (db) =>
      new EvaluationsService(db).updateScheduleInTransaction(id, dto),
    );
  }

  private async updateScheduleInTransaction(

    id: bigint,

    dto: UpdateScheduleDto,

  ) {

    const evaluation =

      await this.findOne(id);

    if (

      evaluation.status !== 'DRAFT'

    ) {

      throw new ConflictException(

        'The schedule can only be changed while the evaluation is a DRAFT',

      );

    }

    const startAt =

      dto.start_at !== undefined

        ? new Date(dto.start_at)

        : evaluation.start_at;

    const endAt =

      dto.end_at !== undefined

        ? new Date(dto.end_at)

        : evaluation.end_at;

    this.checkWindow(

      startAt,

      endAt,

    );

    return this.prisma.evaluations.update({

      where: {

        id,

      },

      data: {

        start_at:

          startAt,

        end_at:

          endAt,

        updated_at:

          new Date(),

      },

      include:

        evaluationInclude,

    });

  }

  async open(id: bigint) {
    return inSerializableTransaction(this.prisma, (db) =>
      new EvaluationsService(db).openInTransaction(id),
    );
  }

  private async openInTransaction(id: bigint) {

    const evaluation =

      await this.prisma.evaluations.findUnique({

        where: {

          id,

        },

        include: {

          survey_versions: {

            include: {

              _count: {

                select: {

                  questions: true,

                },

              },

            },

          },

          generation_targets: {

            select: {

              generation_id: true,

            },

          },

          group_targets: {
            select: {
              academic_year_id: true,
              generation_id: true,
              major_id: true,
              year_level: true,
              class_group: true,
            },
          },

          _count: {

            select: {

              evaluation_participants:

                true,

            },

          },

        },

      });

    if (!evaluation) {

      throw new NotFoundException(

        'Evaluation not found',

      );

    }

    if (

      evaluation.status !== 'DRAFT'

    ) {

      throw new ConflictException(

        'Only a DRAFT evaluation can be opened',

      );

    }

    if (

      !evaluation.start_at ||

      !evaluation.end_at

    ) {

      throw new BadRequestException(

        'Set start_at and end_at before opening the evaluation',

      );

    }

    if (

      evaluation.end_at <=

      new Date()

    ) {

      throw new BadRequestException(

        'end_at is already in the past',

      );

    }

    if (

      evaluation.survey_versions

        .status === 'ARCHIVED'

    ) {

      throw new BadRequestException(

        'The survey version is archived',

      );

    }

    if (

      evaluation.survey_versions

        ._count.questions === 0

    ) {

      throw new BadRequestException(

        'The survey version has no questions',

      );

    }

    const latestVersion = await this.prisma.survey_versions.findFirst({
      where: { survey_id: evaluation.survey_versions.survey_id },
      orderBy: { version_no: 'desc' },
      select: { id: true },
    });
    if (!latestVersion || latestVersion.id !== evaluation.survey_version_id) {
      throw new ConflictException(
        'A newer question version exists. Review this draft before opening; its assigned version has been preserved.',
      );
    }

    const hasFrozenGroupTargets =
      evaluation.group_targets.length > 0;

    const isTargetedEvaluation =
      evaluation.participant_scope ===
        evaluation_participant_scope.SELECTED_GENERATIONS ||
      hasFrozenGroupTargets;

    if (

      evaluation._count

        .evaluation_participants === 0 &&

      isTargetedEvaluation

    ) {

      throw new BadRequestException(

        'This targeted evaluation has no confirmed participants. Preview and confirm the eligible students before opening.',

      );

    }

    let legacyParticipantIds:

      bigint[] = [];

    if (

      evaluation._count

        .evaluation_participants === 0 &&

      evaluation.participant_scope ===

        evaluation_participant_scope.ALL_ENROLLED &&

      !hasFrozenGroupTargets

    ) {

      const eligibility =

        await this.resolveEligibleStudents(

          evaluation.course_offering_id,

          evaluation_participant_scope.ALL_ENROLLED,

          [],

        );

      legacyParticipantIds =

        eligibility.eligible_students.map(

          (student) =>

            student.user_id,

        );

      if (

        legacyParticipantIds.length === 0

      ) {

        throw new BadRequestException(

          'No eligible students are enrolled in this course offering',

        );

      }

    }

    const now = new Date();

    await this.prisma.$transaction(

      async (tx) => {

        const changed =

          await tx.evaluations.updateMany({

            where: {

              id,

              status: 'DRAFT',

            },

            data: {

              status: 'OPEN',

              updated_at: now,

            },

          });

        if (

          changed.count === 0

        ) {

          throw new ConflictException(

            'Only a DRAFT evaluation can be opened',

          );

        }

        await tx.survey_versions.update({

          where: {

            id:

              evaluation.survey_version_id,

          },

          data: {

            status: 'LOCKED',

            locked_at:

              evaluation.survey_versions

                .locked_at ?? now,

          },

        });

        if (

          legacyParticipantIds.length > 0

        ) {

          await tx.evaluation_participants.createMany({

            data:

              legacyParticipantIds.map(

                (studentId) => ({

                  evaluation_id:

                    id,

                  student_id:

                    studentId,

                  survey_version_id:

                    evaluation.survey_version_id,

                  has_submitted:

                    false,

                  created_at:

                    now,

                }),

              ),

            skipDuplicates:

              true,

          });

        }

      },

    );

    return this.findOne(id);

  }

  async close(id: bigint) {
    return inSerializableTransaction(this.prisma, (db) =>
      new EvaluationsService(db).closeInTransaction(id),
    );
  }

  private async closeInTransaction(id: bigint) {

    await this.findOne(id);

    const changed =

      await this.prisma.evaluations.updateMany({

        where: {

          id,

          status: 'OPEN',

        },

        data: {

          status: 'CLOSED',

          updated_at: new Date(),

        },

      });

    if (

      changed.count === 0

    ) {

      throw new ConflictException(

        'Only an OPEN evaluation can be closed',

      );

    }

    return this.findOne(id);

  }

  async remove(id: bigint) {
    return inSerializableTransaction(this.prisma, (db) =>
      new EvaluationsService(db).removeInTransaction(id),
    );
  }

  private async removeInTransaction(id: bigint) {

    const evaluation =

      await this.findOne(id);

    if (

      evaluation.status !== 'DRAFT'

    ) {

      throw new ConflictException(

        'Only a DRAFT evaluation can be deleted',

      );

    }

    await this.prisma.$transaction(

      async (tx) => {

        await tx.evaluation_participants.deleteMany({

          where: {

            evaluation_id:

              id,

          },

        });

        await tx.evaluation_generation_targets.deleteMany({

          where: {

            evaluation_id:

              id,

          },

        });

        await tx.evaluation_group_targets.deleteMany({
          where: {
            evaluation_id:
              id,
          },
        });

        await tx.evaluations.delete({

          where: {

            id,

          },

        });

      },

    );

  }

  private resolveEvaluationGroupScope(
    rawGroupScope:
      | EvaluationGroupScopeDto
      | undefined,
    offering: {
      year_level: number | null;
      semesters: {
        academic_year_id: bigint;
      };
      group_scopes: Array<{
        academic_year_id: bigint;
        generation_id: bigint;
        major_id: bigint;
        year_level: number;
        class_group: string;
      }>;
    },
  ): ResolvedEvaluationGroupScope | null {
    if (rawGroupScope === undefined) {
      return null;
    }

    const academicYearId = BigInt(
      rawGroupScope.academic_year_id,
    );
    const generationId = BigInt(
      rawGroupScope.generation_id,
    );
    const majorId = BigInt(
      rawGroupScope.major_id,
    );

    const classGroups = normalizeClassGroups(
      rawGroupScope.class_groups,
    );

    if (classGroups.length === 0) {
      throw new BadRequestException(
        'Evaluation group scope must contain at least one non-empty class group',
      );
    }

    if (
      academicYearId !==
      offering.semesters.academic_year_id
    ) {
      throw new BadRequestException(
        'Evaluation group scope academic_year_id must match the course offering academic year',
      );
    }

    if (
      offering.year_level !== null &&
      rawGroupScope.year_level !==
        offering.year_level
    ) {
      throw new BadRequestException(
        'Evaluation group scope year_level must match the course offering year_level',
      );
    }

    if (offering.group_scopes.length === 0) {
      throw new BadRequestException(
        'This course offering has no explicit group scope and cannot be used for group-targeted evaluation',
      );
    }

    const allowedGroups = new Set(
      offering.group_scopes
        .filter(
          (scope) =>
            scope.academic_year_id ===
              academicYearId &&
            scope.generation_id ===
              generationId &&
            scope.major_id === majorId &&
            scope.year_level ===
              rawGroupScope.year_level,
        )
        .map((scope) =>
          normalizeClassGroup(
            scope.class_group,
          ),
        )
        .filter(
          (value): value is string =>
            value !== null,
        ),
    );

    const invalidGroups =
      classGroups.filter(
        (classGroup) =>
          !allowedGroups.has(classGroup),
      );

    if (invalidGroups.length > 0) {
      throw new BadRequestException(
        `The course offering does not serve the requested group scope: ${invalidGroups.join(', ')}`,
      );
    }

    return {
      academic_year_id: academicYearId,
      generation_id: generationId,
      major_id: majorId,
      year_level:
        rawGroupScope.year_level,
      class_groups: classGroups,
    };
  }

  private async resolveEligibleStudents(

    offeringId: bigint,

    scope: evaluation_participant_scope,

    generationIds: bigint[],

    rawGroupScope?: EvaluationGroupScopeDto,

    tx?: Prisma.TransactionClient,

  ): Promise<EligibilityResult> {

    const prisma = tx ?? this.prisma;

    const offering =

      await prisma.course_offerings.findUnique({

        where: {

          id: offeringId,

        },

        select: {

          id: true,

          year_level: true,

          group_scopes: {
            select: {
              academic_year_id: true,
              generation_id: true,
              major_id: true,
              year_level: true,
              class_group: true,
            },
          },

          semesters: {

            select: {

              academic_year_id: true,

              academic_years: {

                select: {

                  id: true,

                  name: true,

                  start_year: true,

                },

              },

            },

          },

        },

      });

    if (!offering) {

      throw new NotFoundException(

        'Course offering not found',

      );

    }

    const groupScope =
      this.resolveEvaluationGroupScope(
        rawGroupScope,
        offering,
      );

    await this.validateGenerationIds(

      scope,

      generationIds,

      tx,

    );

    const enrollments =

      await prisma.enrollments.findMany({

        where: {

          course_offering_id:

            offeringId,

        },

        select: {

          student_id: true,

          users: {

            select: {

              id: true,

              full_name: true,

              role: true,

              status: true,

              student: {

                select: {

                  id: true,

                  student_code: true,

                  generation_id: true,

                  student_generations: {

                    select: {

                      id: true,

                      name: true,

                      starting_year_level:

                        true,

                      entry_academic_year: {

                        select: {

                          id: true,

                          start_year: true,

                        },

                      },

                    },

                  },

                  student_academic_records: {

                    where: {

                      academic_year_id:

                        offering.semesters

                          .academic_year_id,

                    },

                    select: {

                      academic_year_id:

                        true,

                      year_level:

                        true,

                      major_id:

                        true,

                      class_group:

                        true,

                    },

                    take: 1,

                  },

                },

              },

            },

          },

        },

        orderBy: {

          student_id: 'asc',

        },

      });

    const selectedGenerationSet =

      new Set(

        generationIds.map(

          (id) => id.toString(),

        ),

      );

    const reasons = {

      not_active_student: 0,

      missing_student_profile: 0,

      generation_not_selected: 0,

      year_level_mismatch: 0,

      year_level_unavailable: 0,

      group_generation_mismatch: 0,

      group_major_mismatch: 0,

      group_year_level_mismatch: 0,

      group_missing_placement: 0,

      class_group_mismatch: 0,

    };

    const eligibleStudents:

      EligibleStudent[] = [];

    for (

      const enrollment of enrollments

    ) {

      const user =

        enrollment.users;

      if (

        user.role !== 'STUDENT' ||

        user.status !== 'ACTIVE'

      ) {

        reasons.not_active_student += 1;

        continue;

      }

      const student =

        user.student;

      if (!student) {

        reasons.missing_student_profile += 1;

        continue;

      }

      if (

        scope ===

          evaluation_participant_scope.SELECTED_GENERATIONS &&

        !selectedGenerationSet.has(

          student.generation_id.toString(),

        )

      ) {

        reasons.generation_not_selected += 1;

        continue;

      }

      const academicRecord =

        student.student_academic_records[0] ??

        null;

      if (groupScope !== null) {
        if (
          student.generation_id !==
          groupScope.generation_id
        ) {
          reasons.group_generation_mismatch += 1;
          continue;
        }

        if (academicRecord === null) {
          reasons.group_missing_placement += 1;
          continue;
        }

        if (
          academicRecord.academic_year_id !==
          groupScope.academic_year_id
        ) {
          reasons.group_missing_placement += 1;
          continue;
        }

        if (
          academicRecord.major_id !==
          groupScope.major_id
        ) {
          reasons.group_major_mismatch += 1;
          continue;
        }

        if (
          academicRecord.year_level !==
          groupScope.year_level
        ) {
          reasons.group_year_level_mismatch += 1;
          continue;
        }

        const studentClassGroup =
          normalizeClassGroup(
            academicRecord.class_group,
          );

        if (
          studentClassGroup === null ||
          !groupScope.class_groups.includes(
            studentClassGroup,
          )
        ) {
          reasons.class_group_mismatch += 1;
          continue;
        }
      }

      let calculatedYearLevel:

        number | null = null;

      let yearLevelSource:

        EligibleStudent['year_level_source'] =

          'UNAVAILABLE';

      const selectedStartYear =

        offering.semesters

          .academic_years.start_year;

      const entryStartYear =

        student.student_generations

          .entry_academic_year.start_year;

      if (

        academicRecord !== null

      ) {

        yearLevelSource =

          'ACADEMIC_RECORD';

      } else if (

        selectedStartYear !== null &&

        entryStartYear !== null

      ) {

        const yearDifference =

          selectedStartYear -

          entryStartYear;

        if (

          yearDifference < 0

        ) {

          yearLevelSource =

            'NOT_STARTED';

        } else {

          const candidateYearLevel =

            student.student_generations

              .starting_year_level +

            yearDifference;

          if (

            candidateYearLevel >= 1 &&

            candidateYearLevel <= 5

          ) {

            calculatedYearLevel =

              candidateYearLevel;

            yearLevelSource =

              'GENERATION_CALCULATION';

          } else {

            yearLevelSource =

              'BEYOND_PROGRAM';

          }

        }

      }

      const effectiveYearLevel =

        academicRecord?.year_level ??

        calculatedYearLevel;

      if (

        offering.year_level !== null

      ) {

        if (

          effectiveYearLevel === null

        ) {

          reasons.year_level_unavailable += 1;

          continue;

        }

        if (

          effectiveYearLevel !==

          offering.year_level

        ) {

          reasons.year_level_mismatch += 1;

          continue;

        }

      }

      eligibleStudents.push({

        user_id:

          user.id,

        student_id:

          student.id,

        student_code:

          student.student_code,

        full_name:

          user.full_name,

        generation_id:

          student.generation_id,

        generation_name:

          student.student_generations.name,

        effective_year_level:

          effectiveYearLevel,

        year_level_source:

          yearLevelSource,

        placement_academic_year_id:

          offering.semesters.academic_year_id,

        placement_major_id:

          academicRecord?.major_id ?? null,

        class_group:

          normalizeClassGroup(
            academicRecord?.class_group,
          ),

      });

    }

    return {

      participant_scope:

        scope,

      generation_ids:

        generationIds,

      group_scope:

        groupScope,

      eligible_students:

        eligibleStudents,

      enrolled_count:

        enrollments.length,

      ineligible_count:

        enrollments.length -

        eligibleStudents.length,

      ineligible_reasons:

        reasons,

    };

  }

  private parseGenerationIds(

    scope: evaluation_participant_scope,

    rawGenerationIds?: string[],

  ): bigint[] {

    const values =

      rawGenerationIds ?? [];

    if (

      scope ===

        evaluation_participant_scope.ALL_ENROLLED

    ) {

      if (

        values.length > 0

      ) {

        throw new BadRequestException(

          'generation_ids can only be used when participant_scope is SELECTED_GENERATIONS',

        );

      }

      return [];

    }

    if (

      scope ===

        evaluation_participant_scope.SELECTED_GENERATIONS

    ) {

      if (

        values.length === 0

      ) {

        throw new BadRequestException(

          'At least one generation_id is required when participant_scope is SELECTED_GENERATIONS',

        );

      }

      const uniqueIds =

        new Map<string, bigint>();

      for (

        const value of values

      ) {

        if (

          !/^[1-9]\d*$/.test(value)

        ) {

          throw new BadRequestException(

            'Each generation_id must be a positive integer',

          );

        }

        const id =

          BigInt(value);

        uniqueIds.set(

          id.toString(),

          id,

        );

      }

      return Array.from(

        uniqueIds.values(),

      );

    }

    throw new BadRequestException(

      'Invalid participant_scope',

    );

  }

  private async validateGenerationIds(

    scope: evaluation_participant_scope,

    generationIds: bigint[],

    tx?: Prisma.TransactionClient,

  ) {

    const prisma = tx ?? this.prisma;

    if (

      scope !==

        evaluation_participant_scope.SELECTED_GENERATIONS

    ) {

      return;

    }

    const generations =

      await prisma.student_generations.findMany({

        where: {

          id: {

            in:

              generationIds,

          },

        },

        select: {

          id: true,

        },

      });

    const foundIds =

      new Set(

        generations.map(

          (generation) =>

            generation.id.toString(),

        ),

      );

    const missingIds =

      generationIds.filter(

        (id) =>

          !foundIds.has(

            id.toString(),

          ),

      );

    if (

      missingIds.length > 0

    ) {

      throw new NotFoundException(

        `Student generation not found: ${missingIds

          .map((id) => id.toString())

          .join(', ')}`,

      );

    }

  }

  private assertConfirmedStudentsUnchanged(

    confirmedStudentIds: string[],

    currentStudentIds: bigint[],

  ) {

    const confirmed =

      Array.from(

        new Set(

          confirmedStudentIds.map(

            (id) => id.trim(),

          ),

        ),

      ).sort();

    const current =

      Array.from(

        new Set(

          currentStudentIds.map(

            (id) => id.toString(),

          ),

        ),

      ).sort();

    const unchanged =

      confirmed.length ===

        current.length &&

      confirmed.every(

        (id, index) =>

          id === current[index],

      );

    if (!unchanged) {

      throw new ConflictException(

        'Eligible students changed after the preview. Preview and review the participant list again before creating the evaluation.',

      );

    }

  }

  private async resolveSurveyVersion(
    dto: CreateEvaluationDto,
  ): Promise<bigint> {
    const surveyId =
      dto.survey_id !== undefined
        ? BigInt(dto.survey_id)
        : null;

    const explicitVersionId =
      dto.survey_version_id !== undefined
        ? BigInt(dto.survey_version_id)
        : null;

    if (explicitVersionId !== null) {
      const version =
        await this.prisma.survey_versions.findFirst({
          where: {
            id: explicitVersionId,

            ...(surveyId !== null && {
              survey_id: surveyId,
            }),
          },

          select: {
            id: true,
            survey_id: true,
            status: true,

            surveys: {
              select: {
                archived_at: true,
              },
            },

            _count: {
              select: {
                questions: true,
              },
            },
          },
        });

      if (!version) {
        if (surveyId !== null) {
          const surveyExists =
            await this.prisma.surveys.findUnique({
              where: {
                id: surveyId,
              },

              select: {
                id: true,
                archived_at: true,
              },
            });

          if (!surveyExists) {
            throw new BadRequestException(
              'survey_id does not match any named question set',
            );
          }

          if (surveyExists.archived_at) {
            throw new BadRequestException(
              'An archived question set cannot be used for a new evaluation',
            );
          }

          throw new BadRequestException(
            'survey_version_id does not belong to the selected survey',
          );
        }

        throw new BadRequestException(
          'survey_version_id does not match any survey version',
        );
      }

      if (version.surveys.archived_at) {
        throw new BadRequestException(
          'An archived question set cannot be used for a new evaluation',
        );
      }

      const latest = await this.prisma.survey_versions.findFirst({
        where: { survey_id: version.survey_id },
        orderBy: { version_no: 'desc' },
        select: { id: true },
      });
      if (!latest || latest.id !== explicitVersionId) {
        throw new ConflictException(
          'The question set has a newer version. Reload and review its latest version before creating this evaluation.',
        );
      }

      this.assertVersionUsable(
        version.status,
        version._count.questions,
      );

      return version.id;
    }

    if (surveyId === null) {
      throw new BadRequestException(
        'Either survey_id or survey_version_id is required',
      );
    }

    const survey =
      await this.prisma.surveys.findUnique({
        where: {
          id: surveyId,
        },

        select: {
          id: true,
          archived_at: true,
        },
      });

    if (!survey) {
      throw new BadRequestException(
        'survey_id does not match any named question set',
      );
    }

    if (survey.archived_at) {
      throw new BadRequestException(
        'An archived question set cannot be used for a new evaluation',
      );
    }

    const latestVersion =
      await this.prisma.survey_versions.findFirst({
        where: {
          survey_id: surveyId,
        },

        orderBy: {
          version_no: 'desc',
        },

        select: {
          id: true,
          status: true,
          _count: { select: { questions: true } },
        },
      });

    if (!latestVersion) {
      throw new BadRequestException(
        'The selected question set has no survey version',
      );
    }

    this.assertVersionUsable(latestVersion.status, latestVersion._count.questions);
    return latestVersion.id;
  }

  private assertVersionUsable(

    status: string,

    questionCount: number,

  ) {

    if (

      status === 'ARCHIVED'

    ) {

      throw new BadRequestException(

        'An archived survey version cannot be used for a new evaluation',

      );

    }

    if (

      questionCount === 0

    ) {

      throw new BadRequestException( 

        'The survey version has no questions',

      );

    }

  }

  private checkWindow(

    startAt: Date | null,

    endAt: Date | null,

  ) {

    if (

      startAt &&

      endAt &&

      endAt <= startAt

    ) {

      throw new BadRequestException(

        'end_at must be after start_at',

      );

    }

  }

}
