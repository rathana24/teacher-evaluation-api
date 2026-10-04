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

import { PrismaService } from '../prisma/prisma.service';

import { CreateEvaluationDto } from './dto/create-evaluation.dto';
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
    | 'UNAVAILABLE';
};

type EligibilityResult = {
  participant_scope: evaluation_participant_scope;
  generation_ids: bigint[];
  eligible_students: EligibleStudent[];
  enrolled_count: number;
  ineligible_count: number;
  ineligible_reasons: {
    not_active_student: number;
    missing_student_profile: number;
    generation_not_selected: number;
    year_level_mismatch: number;
    year_level_unavailable: number;
  };
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

  async previewParticipants(
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

      enrolled_count:
        result.enrolled_count,

      eligible_count:
        result.eligible_students.length,

      ineligible_count:
        result.ineligible_count,

      ineligible_reasons:
        result.ineligible_reasons,

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
          }),
        ),

      confirmed_student_ids:
        result.eligible_students.map(
          (student) =>
            student.user_id.toString(),
        ),
    };
  }

  async create(
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
      dto.confirmed_student_ids !== undefined;

    let eligibility:
      | EligibilityResult
      | null = null;

    if (requiresConfirmedParticipants) {
      if (
        dto.confirmed_student_ids === undefined
      ) {
        throw new BadRequestException(
          'confirmed_student_ids is required after previewing SELECTED_GENERATIONS',
        );
      }

      eligibility =
        await this.resolveEligibleStudents(
          offeringId,
          scope,
          generationIds,
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
              eligibility !== null
            ) {
              await tx.evaluation_participants.createMany({
                data:
                  eligibility.eligible_students.map(
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

  async updateSchedule(
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

    if (
      evaluation._count
        .evaluation_participants === 0 &&
      evaluation.participant_scope ===
        evaluation_participant_scope.SELECTED_GENERATIONS
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
        evaluation_participant_scope.ALL_ENROLLED
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

        await tx.evaluations.delete({
          where: {
            id,
          },
        });
      },
    );
  }

  private async resolveEligibleStudents(
    offeringId: bigint,
    scope: evaluation_participant_scope,
    generationIds: bigint[],
  ): Promise<EligibilityResult> {
    const offering =
      await this.prisma.course_offerings.findUnique({
        where: {
          id: offeringId,
        },

        select: {
          id: true,
          year_level: true,

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

    await this.validateGenerationIds(
      scope,
      generationIds,
    );

    const enrollments =
      await this.prisma.enrollments.findMany({
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
          calculatedYearLevel =
            student.student_generations
              .starting_year_level +
            yearDifference;

          yearLevelSource =
            'GENERATION_CALCULATION';
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
      });
    }

    return {
      participant_scope:
        scope,

      generation_ids:
        generationIds,

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
  ) {
    if (
      scope !==
        evaluation_participant_scope.SELECTED_GENERATIONS
    ) {
      return;
    }

    const generations =
      await this.prisma.student_generations.findMany({
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

    if (
      explicitVersionId !== null
    ) {
      const version =
        await this.prisma.survey_versions.findFirst({
          where: {
            id:
              explicitVersionId,

            ...(surveyId !== null && {
              survey_id:
                surveyId,
            }),
          },

          select: {
            id: true,
            survey_id: true,
            status: true,

            _count: {
              select: {
                questions: true,
              },
            },
          },
        });

      if (!version) {
        if (
          surveyId !== null
        ) {
          const surveyExists =
            await this.prisma.surveys.findUnique({
              where: {
                id:
                  surveyId,
              },

              select: {
                id: true,
              },
            });

          if (
            !surveyExists
          ) {
            throw new BadRequestException(
              'survey_id does not match any named question set',
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

      this.assertVersionUsable(
        version.status,
        version._count.questions,
      );

      return version.id;
    }

    if (
      surveyId === null
    ) {
      throw new BadRequestException(
        'Either survey_id or survey_version_id is required',
      );
    }

    const survey =
      await this.prisma.surveys.findUnique({
        where: {
          id:
            surveyId,
        },

        select: {
          id: true,
        },
      });

    if (!survey) {
      throw new BadRequestException(
        'survey_id does not match any named question set',
      );
    }

    const latestUsableVersion =
      await this.prisma.survey_versions.findFirst({
        where: {
          survey_id:
            surveyId,

          status: {
            not:
              'ARCHIVED',
          },

          questions: {
            some: {},
          },
        },

        orderBy: {
          version_no:
            'desc',
        },

        select: {
          id: true,
        },
      });

    if (
      !latestUsableVersion
    ) {
      throw new BadRequestException(
        'The selected question set has no usable survey version with questions',
      );
    }

    return latestUsableVersion.id;
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