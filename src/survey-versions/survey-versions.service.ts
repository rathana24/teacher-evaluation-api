import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyVersionDto } from './dto/create-survey-version.dto';

@Injectable()
export class SurveyVersionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // GET ALL VERSIONS FOR SURVEY
  // =========================================================

  async findAllForSurvey(
    surveyId: bigint,
  ) {
    await this.checkSurveyExists(
      surveyId,
    );

    return this.prisma.survey_versions.findMany({
      where: {
        survey_id: surveyId,
      },

      include: {
        _count: {
          select: {
            questions: true,
            evaluations: true,
            evaluation_participants: true,
            assessment_drafts: true,
            responses: true,
          },
        },
      },

      orderBy: {
        version_no: 'asc',
      },
    });
  }

  // =========================================================
  // GET ONE VERSION
  // =========================================================

  async findOne(
    surveyId: bigint,
    versionId: bigint,
  ) {
    const version =
      await this.prisma.survey_versions.findFirst({
        where: {
          id: versionId,
          survey_id: surveyId,
        },

        include: {
          questions: {
            include: {
              question_options: {
                orderBy: {
                  display_order: 'asc',
                },
              },
            },

            orderBy: {
              display_order: 'asc',
            },
          },

          _count: {
            select: {
              evaluations: true,
              evaluation_participants: true,
              assessment_drafts: true,
              responses: true,
            },
          },
        },
      });

    if (!version) {
      throw new NotFoundException(
        'Survey version not found',
      );
    }

    return version;
  }

  // =========================================================
  // CREATE VERSION
  // =========================================================

  async create(
    surveyId: bigint,
    dto: CreateSurveyVersionDto,
    createdBy: bigint,
  ) {
    await this.checkSurveyExists(
      surveyId,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const latest =
            await tx.survey_versions.findFirst({
              where: {
                survey_id: surveyId,
              },

              orderBy: {
                version_no: 'desc',
              },

              include: {
                questions: {
                  include: {
                    question_options: {
                      orderBy: {
                        display_order: 'asc',
                      },
                    },
                  },

                  orderBy: {
                    display_order: 'asc',
                  },
                },
              },
            });

          const now = new Date();

          const version =
            await tx.survey_versions.create({
              data: {
                survey_id: surveyId,

                version_no:
                  (latest?.version_no ?? 0) +
                  1,

                status: 'DRAFT',

                created_by:
                  createdBy,

                created_at:
                  now,
              },
            });

          if (
            dto.copy_questions &&
            latest &&
            latest.questions.length > 0
          ) {
            for (
              const question of
              latest.questions
            ) {
              await tx.questions.create({
                data: {
                  survey_version_id:
                    version.id,

                  question_text:
                    question.question_text,

                  question_text_km:
                    question.question_text_km,

                  question_type:
                    question.question_type,

                  category:
                    question.category,

                  is_required:
                    question.is_required,

                  min_rating:
                    question.min_rating,

                  max_rating:
                    question.max_rating,

                  display_order:
                    question.display_order,

                  created_at:
                    now,

                  updated_at:
                    now,

                  question_options:
                    question.question_options
                      .length > 0
                      ? {
                          create:
                            question.question_options.map(
                              (option) => ({
                                option_text:
                                  option.option_text,

                                display_order:
                                  option.display_order,
                              }),
                            ),
                        }
                      : undefined,
                },
              });
            }
          }

          return tx.survey_versions.findUniqueOrThrow({
            where: {
              id: version.id,
            },

            include: {
              questions: {
                include: {
                  question_options: {
                    orderBy: {
                      display_order:
                        'asc',
                    },
                  },
                },

                orderBy: {
                  display_order:
                    'asc',
                },
              },
            },
          });
        },
      );
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Another version was created at the same time, please try again',
        );
      }

      throw e;
    }
  }

  // =========================================================
  // APPLY VERSION TO UNFINISHED PARTICIPANTS
  // =========================================================

  /**
   * Safely applies a newer version of the SAME named
   * question set to unfinished participant assignments.
   *
   * Important rules:
   *
   * - the target version must belong to surveyId
   * - the target version must still be DRAFT
   * - the target version must contain questions
   * - completed participants never move
   * - participants with saved drafts never move
   * - only unfinished participants without drafts move
   * - only evaluations belonging to this same named set
   *   are considered
   * - evaluations.survey_version_id is NOT changed
   * - the target version is locked after reconciliation
   *
   * Keeping the evaluation's base version unchanged
   * preserves the original evaluation context.
   *
   * The participant-level survey_version_id is the
   * effective version used by student access, drafts,
   * and submissions.
   */
  async applyToUnfinished(
    surveyId: bigint,
    versionId: bigint,
  ) {
    await this.checkSurveyExists(
      surveyId,
    );

    const targetVersion =
      await this.prisma.survey_versions.findFirst({
        where: {
          id: versionId,
          survey_id: surveyId,
        },

        select: {
          id: true,
          survey_id: true,
          version_no: true,
          status: true,
          locked_at: true,

          _count: {
            select: {
              questions: true,
            },
          },
        },
      });

    if (!targetVersion) {
      throw new NotFoundException(
        'Survey version not found',
      );
    }

    if (
      targetVersion.status !== 'DRAFT'
    ) {
      throw new ConflictException(
        'Only a DRAFT survey version can be applied to unfinished participants',
      );
    }

    if (
      targetVersion._count.questions === 0
    ) {
      throw new BadRequestException(
        'The survey version has no questions',
      );
    }

    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Re-read the target version inside the transaction.
         *
         * This prevents a stale pre-transaction check from
         * silently applying a version whose state changed.
         */
        const currentTarget =
          await tx.survey_versions.findFirst({
            where: {
              id: versionId,
              survey_id: surveyId,
            },

            select: {
              id: true,
              version_no: true,
              status: true,
              locked_at: true,

              _count: {
                select: {
                  questions: true,
                },
              },
            },
          });

        if (!currentTarget) {
          throw new NotFoundException(
            'Survey version not found',
          );
        }

        if (
          currentTarget.status !==
          'DRAFT'
        ) {
          throw new ConflictException(
            'Only a DRAFT survey version can be applied to unfinished participants',
          );
        }

        if (
          currentTarget._count
            .questions === 0
        ) {
          throw new BadRequestException(
            'The survey version has no questions',
          );
        }

        /*
         * Find evaluations whose BASE survey version
         * belongs to this same named question set.
         *
         * CLOSED evaluations are intentionally excluded.
         *
         * DRAFT and OPEN evaluations can still contain
         * unfinished participant assignments that may
         * safely move forward.
         *
         * We never change evaluations.survey_version_id.
         */
        const evaluations =
          await tx.evaluations.findMany({
            where: {
              status: {
                in: [
                  'DRAFT',
                  'OPEN',
                ],
              },

              survey_versions: {
                survey_id:
                  surveyId,
              },
            },

            select: {
              id: true,
            },
          });

        const evaluationIds =
          evaluations.map(
            (evaluation) =>
              evaluation.id,
          );

        let updatedParticipants = 0;
        let skippedSubmitted = 0;
        let skippedWithDraft = 0;
        let alreadyOnTarget = 0;

        if (
          evaluationIds.length > 0
        ) {
          /*
           * Count completed assignments.
           *
           * They are historical records and must never
           * move to another question-set version.
           */
          skippedSubmitted =
            await tx.evaluation_participants.count({
              where: {
                evaluation_id: {
                  in: evaluationIds,
                },

                has_submitted:
                  true,
              },
            });

          /*
           * Count unfinished participants that already
           * have a saved server-side draft.
           *
           * Their answers reference the exact question
           * IDs of their current version, so we must not
           * reinterpret or silently discard that draft.
           */
          skippedWithDraft =
            await tx.evaluation_participants.count({
              where: {
                evaluation_id: {
                  in: evaluationIds,
                },

                has_submitted:
                  false,

                assessment_drafts: {
                  isNot: null,
                },

                NOT: {
                  survey_version_id:
                    versionId,
                },
              },
            });

          /*
           * Some participant rows may already point to
           * the target version. They require no update.
           */
          alreadyOnTarget =
            await tx.evaluation_participants.count({
              where: {
                evaluation_id: {
                  in: evaluationIds,
                },

                has_submitted:
                  false,

                survey_version_id:
                  versionId,
              },
            });

          /*
           * Safe migration:
           *
           * - unfinished only
           * - no saved draft
           * - not already on the target version
           *
           * Historical rows with NULL survey_version_id
           * are also eligible when they have no draft.
           * After this update they become explicitly
           * pinned to the target version.
           */
          const changed =
            await tx.evaluation_participants.updateMany({
              where: {
                evaluation_id: {
                  in: evaluationIds,
                },

                has_submitted:
                  false,

                assessment_drafts: {
                  is: null,
                },

                NOT: {
                  survey_version_id:
                    versionId,
                },
              },

              data: {
                survey_version_id:
                  versionId,
              },
            });

          updatedParticipants =
            changed.count;
        }

        /*
         * Lock the target version only after the safe
         * participant reconciliation succeeds.
         *
         * The conditional update also protects against
         * another request changing the version state
         * concurrently.
         */
        const locked =
          await tx.survey_versions.updateMany({
            where: {
              id: versionId,
              survey_id: surveyId,
              status: 'DRAFT',
            },

            data: {
              status: 'LOCKED',
              locked_at:
                currentTarget.locked_at ??
                now,
            },
          });

        if (
          locked.count === 0
        ) {
          throw new ConflictException(
            'The survey version changed while reconciliation was running. Please try again.',
          );
        }

        return {
          survey_id:
            surveyId.toString(),

          survey_version_id:
            versionId.toString(),

          version_no:
            currentTarget.version_no,

          status:
            'LOCKED',

          eligible_evaluations:
            evaluationIds.length,

          updated_participants:
            updatedParticipants,

          skipped_submitted:
            skippedSubmitted,

          skipped_with_draft:
            skippedWithDraft,

          already_on_target:
            alreadyOnTarget,
        };
      },
    );
  }

  // =========================================================
  // ARCHIVE VERSION
  // =========================================================

  async archive(
    surveyId: bigint,
    versionId: bigint,
  ) {
    const version =
      await this.findOne(
        surveyId,
        versionId,
      );

    if (
      version.status === 'ARCHIVED'
    ) {
      throw new ConflictException(
        'Survey version is already archived',
      );
    }

    return this.prisma.survey_versions.update({
      where: {
        id: versionId,
      },

      data: {
        status: 'ARCHIVED',
      },
    });
  }

  // =========================================================
  // DELETE VERSION
  // =========================================================

  async remove(
    surveyId: bigint,
    versionId: bigint,
  ) {
    const version =
      await this.findOne(
        surveyId,
        versionId,
      );

    if (
      version.status === 'LOCKED'
    ) {
      throw new ConflictException(
        'A locked survey version cannot be deleted',
      );
    }

    /*
     * A version is considered used if ANY persisted
     * evaluation history references it.
     *
     * This includes:
     *
     * - evaluation base version
     * - participant effective version
     * - saved draft version
     * - submitted response version
     *
     * Checking all four prevents historical data from
     * being orphaned or deleted.
     */
    if (
      version._count.evaluations > 0 ||
      version._count
        .evaluation_participants > 0 ||
      version._count
        .assessment_drafts > 0 ||
      version._count.responses > 0
    ) {
      throw new ConflictException(
        'Survey version is already used by evaluations, participants, drafts, or responses and cannot be deleted',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        const questions =
          await tx.questions.findMany({
            where: {
              survey_version_id:
                versionId,
            },

            select: {
              id: true,
            },
          });

        const questionIds =
          questions.map(
            (question) =>
              question.id,
          );

        if (
          questionIds.length > 0
        ) {
          await tx.question_options.deleteMany({
            where: {
              question_id: {
                in: questionIds,
              },
            },
          });
        }

        await tx.questions.deleteMany({
          where: {
            survey_version_id:
              versionId,
          },
        });

        await tx.survey_versions.delete({
          where: {
            id: versionId,
          },
        });
      },
    );
  }

  // =========================================================
  // EDITABILITY CHECK
  // =========================================================

  /**
   * Used by the Questions feature.
   *
   * A version is editable only when:
   *
   * - it is still DRAFT
   * - no non-DRAFT evaluation directly uses it
   * - no participant is pinned to it
   * - no draft references it
   * - no submitted response references it
   *
   * Once participant/history data references the
   * version, questions must remain immutable.
   */
  async assertEditable(
    versionId: bigint,
  ) {
    const version =
      await this.prisma.survey_versions.findUnique({
        where: {
          id: versionId,
        },

        include: {
          evaluations: {
            where: {
              status: {
                not: 'DRAFT',
              },
            },

            select: {
              id: true,
            },
          },

          _count: {
            select: {
              evaluation_participants:
                true,

              assessment_drafts:
                true,

              responses:
                true,
            },
          },
        },
      });

    if (!version) {
      throw new NotFoundException(
        'Survey version not found',
      );
    }

    if (
      version.status !== 'DRAFT' ||
      version.evaluations.length > 0 ||
      version._count
        .evaluation_participants > 0 ||
      version._count
        .assessment_drafts > 0 ||
      version._count.responses > 0
    ) {
      throw new ConflictException(
        'This survey version is locked or already referenced by participant history and its questions cannot be changed',
      );
    }

    return version;
  }

  // =========================================================
  // INTERNAL HELPERS
  // =========================================================

  private async checkSurveyExists(
    surveyId: bigint,
  ) {
    const survey =
      await this.prisma.surveys.findUnique({
        where: {
          id: surveyId,
        },

        select: {
          id: true,
        },
      });

    if (!survey) {
      throw new NotFoundException(
        'Survey not found',
      );
    }
  }
}