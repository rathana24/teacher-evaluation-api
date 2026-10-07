import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyVersionDto } from './dto/create-survey-version.dto';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';

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
  // CREATE NEXT VERSION
  // =========================================================

  /**
   * Creates the next DRAFT version of an active question set.
   *
   * Rules:
   *
   * - archived question sets cannot receive new versions
   * - version number is always latest + 1
   * - optional question copying always copies from the
   *   latest version
   * - the transaction is serializable
   * - concurrent creation returns 409 instead of silently
   *   creating an unexpected version
   */
  async create(
    surveyId: bigint,
    dto: CreateSurveyVersionDto,
    createdBy: bigint,
  ) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new SurveyVersionsService(db).createInTransaction(
          surveyId,
          dto,
          createdBy,
        ),
      (error: any) => {
        if (error?.code === 'P2002') {
          throw new ConflictException(
            'Another survey version was created at the same time. Please review the latest version and try again.',
          );
        }

        if (error?.code === 'P2034') {
          throw new ConflictException(
            'The question set changed while the new version was being created. Please review the latest version and try again.',
          );
        }

        throw error;
      },
    );
  }

  private async createInTransaction(
    surveyId: bigint,
    dto: CreateSurveyVersionDto,
    createdBy: bigint,
  ) {
    await this.checkSurveyActive(
      surveyId,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * Re-read the question set inside the transaction.
           * This prevents creating a version after another
           * request archives the whole set.
           */
          const survey =
            await tx.surveys.findUnique({
              where: {
                id: surveyId,
              },

              select: {
                id: true,
                archived_at: true,
              },
            });

          if (!survey) {
            throw new NotFoundException(
              'Question set not found',
            );
          }

          if (survey.archived_at) {
            throw new ConflictException(
              'Archived question sets are read-only and cannot receive new versions',
            );
          }

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

          /*
           * Requirement 2 creates V1 atomically with the
           * question set itself.
           *
           * Therefore this endpoint creates V2, V3, ...
           * for normal newly created sets.
           *
           * The fallback still safely supports historical
           * data if an old set exists without a version.
           */
          const nextVersionNo =
            (latest?.version_no ?? 0) + 1;

          const now = new Date();

          const version =
            await tx.survey_versions.create({
              data: {
                survey_id: surveyId,
                version_no: nextVersionNo,
                status: 'DRAFT',
                created_by: createdBy,
                created_at: now,
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
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Another survey version was created at the same time. Please review the latest version and try again.',
        );
      }

      if (error?.code === 'P2034') {
        throw new ConflictException(
          'The question set changed while the new version was being created. Please review the latest version and try again.',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // APPLY VERSION TO UNFINISHED PARTICIPANTS
  // =========================================================

  /**
   * Applies an exact version of the SAME named question
   * set to safe unfinished participant assignments.
   *
   * Rules:
   *
   * - whole question set must still be active
   * - target must belong to surveyId
   * - target must contain questions
   * - DRAFT target can be applied and is then LOCKED
   * - LOCKED target can be safely retried/reconciled
   * - ARCHIVED target cannot be applied
   * - completed participants never move
   * - participants with saved drafts never move
   * - participants already on target do not move again
   * - only DRAFT/OPEN evaluations using the same named
   *   question set are considered
   * - evaluations.survey_version_id never changes
   * - no draft or historical submission is deleted
   *
   * Allowing a LOCKED target to pass through the same
   * reconciliation makes retries idempotent:
   *
   * first request:
   *   DRAFT -> reconcile -> LOCKED
   *
   * retry:
   *   LOCKED -> reconcile safely -> no duplicate move
   */
  async applyToUnfinished(surveyId: bigint, versionId: bigint) {
    return inSerializableTransaction(this.prisma, (db) =>
      new SurveyVersionsService(db).applyToUnfinishedInTransaction(
        surveyId,
        versionId,
      ),
    );
  }

  private async applyToUnfinishedInTransaction(
    surveyId: bigint,
    versionId: bigint,
  ) {
    await this.checkSurveyActive(
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
      targetVersion.status ===
      'ARCHIVED'
    ) {
      throw new ConflictException(
        'An ARCHIVED survey version cannot be applied to unfinished participants',
      );
    }

    if (
      targetVersion._count.questions ===
      0
    ) {
      throw new BadRequestException(
        'The survey version has no questions',
      );
    }

    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Re-read the whole set inside the transaction.
         * This prevents reconciliation from continuing if
         * the question set was archived concurrently.
         */
        const currentSurvey =
          await tx.surveys.findUnique({
            where: {
              id: surveyId,
            },

            select: {
              id: true,
              archived_at: true,
            },
          });

        if (!currentSurvey) {
          throw new NotFoundException(
            'Question set not found',
          );
        }

        if (currentSurvey.archived_at) {
          throw new ConflictException(
            'Archived question sets are read-only and cannot be applied to unfinished participants',
          );
        }

        /*
         * Re-read inside the transaction so that all
         * reconciliation decisions use current state.
         */
        const currentTarget =
          await tx.survey_versions.findFirst({
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

        if (!currentTarget) {
          throw new NotFoundException(
            'Survey version not found',
          );
        }

        if (
          currentTarget.status ===
          'ARCHIVED'
        ) {
          throw new ConflictException(
            'An ARCHIVED survey version cannot be applied to unfinished participants',
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

        const wasAlreadyLocked =
          currentTarget.status ===
          'LOCKED';

        const [latest] = await tx.survey_versions.findMany({
          where: { survey_id: surveyId },
          orderBy: { version_no: 'desc' },
          take: 1,
          select: { id: true },
        });
        if (!latest || latest.id !== versionId) {
          throw new ConflictException(
            'A newer question version exists. Review the latest version before applying updates; no participants were moved.',
          );
        }

        /*
         * Only evaluations whose ORIGINAL/base version
         * belongs to the same named set are considered.
         *
         * CLOSED evaluations are historical and are not
         * modified.
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
           * Completed participants are immutable
           * historical records.
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
           * Draft holders remain pinned to their
           * existing version.
           *
           * The draft is never reinterpreted,
           * overwritten or deleted.
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

                OR: [
                  { survey_version_id: null },
                  { survey_version_id: { not: versionId } },
                ],
              },
            });

          /*
           * This count is important for retries.
           *
           * Participants already moved by a previous
           * successful request are reported here and
           * will not be updated again.
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
           * Safe reconciliation.
           *
           * Only:
           * - unfinished
           * - no draft
           * - not already on target
           *
           * can move.
           *
           * Historical NULL participant version rows
           * may move only when they are unfinished and
           * have no draft.
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

                OR: [
                  { survey_version_id: null },
                  { survey_version_id: { not: versionId } },
                ],
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
         * A DRAFT target becomes immutable after
         * successful reconciliation.
         *
         * A LOCKED target means this may be a retry.
         * In that case we do not try to lock it again.
         */
        if (!wasAlreadyLocked) {
          const locked =
            await tx.survey_versions.updateMany({
              where: {
                id: versionId,
                survey_id:
                  surveyId,
                status: 'DRAFT',
              },

              data: {
                status:
                  'LOCKED',

                locked_at:
                  currentTarget.locked_at ??
                  now,
              },
            });

          /*
           * Another request may have changed the state
           * while this transaction was running.
           *
           * Throwing here causes this transaction's
           * participant updates to roll back.
           */
          if (
            locked.count === 0
          ) {
            throw new ConflictException(
              'The survey version changed while reconciliation was running. Please retry the operation.',
            );
          }
        }

        const totalSkipped =
          skippedSubmitted +
          skippedWithDraft +
          alreadyOnTarget;

        return {
          survey_id:
            surveyId.toString(),

          survey_version_id:
            versionId.toString(),

          version_no:
            currentTarget.version_no,

          status:
            'LOCKED',

          operation:
            wasAlreadyLocked
              ? 'RECONCILED_LOCKED_VERSION'
              : 'APPLIED_AND_LOCKED',

          retry_safe:
            true,

          was_already_locked:
            wasAlreadyLocked,

          eligible_evaluations:
            evaluationIds.length,

          moved_participants:
            updatedParticipants,

          /*
           * Keep the old response property too so
           * existing callers are not broken.
           */
          updated_participants:
            updatedParticipants,

          skipped_participants:
            totalSkipped,

          skipped_reasons: {
            submitted:
              skippedSubmitted,

            protected_draft:
              skippedWithDraft,

            already_on_target:
              alreadyOnTarget,
          },

          /*
           * Keep existing fields for backward
           * compatibility.
           */
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

  /**
   * Archives one version while keeping all historical
   * references intact.
   *
   * The parent question set itself must still be active.
   * Once the whole set is archived it becomes read-only.
   */
  async archive(surveyId: bigint, versionId: bigint) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new SurveyVersionsService(db).archiveInTransaction(surveyId, versionId),
      (error: any) => {
        if (error?.code === 'P2034') {
          throw new ConflictException(
            'The survey version changed while it was being archived. Please review the latest data and try again.',
          );
        }

        throw error;
      },
    );
  }

  private async archiveInTransaction(
    surveyId: bigint,
    versionId: bigint,
  ) {
    await this.checkSurveyActive(
      surveyId,
    );

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

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const survey =
            await tx.surveys.findUnique({
              where: {
                id: surveyId,
              },

              select: {
                archived_at: true,
              },
            });

          if (!survey) {
            throw new NotFoundException(
              'Question set not found',
            );
          }

          if (survey.archived_at) {
            throw new ConflictException(
              'Archived question sets are read-only',
            );
          }

          const current =
            await tx.survey_versions.findFirst({
              where: {
                id: versionId,
                survey_id: surveyId,
              },

              select: {
                id: true,
                status: true,
              },
            });

          if (!current) {
            throw new NotFoundException(
              'Survey version not found',
            );
          }

          if (
            current.status ===
            'ARCHIVED'
          ) {
            throw new ConflictException(
              'Survey version is already archived',
            );
          }

          return tx.survey_versions.update({
            where: {
              id: versionId,
            },

            data: {
              status: 'ARCHIVED',
            },
          });
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException(
          'The survey version changed while it was being archived. Please review the latest data and try again.',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // DELETE VERSION
  // =========================================================

  /**
   * Deletes an unused version only.
   *
   * Whole archived question sets are read-only.
   *
   * Historical evaluation, participant, draft, or response
   * references always prevent deletion.
   */
  async remove(surveyId: bigint, versionId: bigint) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new SurveyVersionsService(db).removeInTransaction(surveyId, versionId),
      (error: any) => {
        if (error?.code === 'P2034') {
          throw new ConflictException(
            'The survey version changed while deletion was being processed. Please review the latest data and try again.',
          );
        }

        if (error?.code === 'P2003') {
          throw new ConflictException(
            'Survey version is referenced by historical data and cannot be deleted',
          );
        }

        throw error;
      },
    );
  }

  private async removeInTransaction(
    surveyId: bigint,
    versionId: bigint,
  ) {
    await this.checkSurveyActive(
      surveyId,
    );

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

    try {
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Re-check parent state inside the transaction.
           */
          const survey =
            await tx.surveys.findUnique({
              where: {
                id: surveyId,
              },

              select: {
                archived_at: true,
              },
            });

          if (!survey) {
            throw new NotFoundException(
              'Question set not found',
            );
          }

          if (survey.archived_at) {
            throw new ConflictException(
              'Archived question sets are read-only and their versions cannot be deleted',
            );
          }

          /*
           * Re-check usage inside the same transaction as
           * deletion.
           */
          const current =
            await tx.survey_versions.findFirst({
              where: {
                id: versionId,
                survey_id: surveyId,
              },

              select: {
                id: true,
                status: true,

                _count: {
                  select: {
                    evaluations: true,
                    evaluation_participants:
                      true,
                    assessment_drafts: true,
                    responses: true,
                  },
                },
              },
            });

          if (!current) {
            throw new NotFoundException(
              'Survey version not found',
            );
          }

          if (
            current.status ===
            'LOCKED'
          ) {
            throw new ConflictException(
              'A locked survey version cannot be deleted',
            );
          }

          if (
            current._count.evaluations >
              0 ||
            current._count
              .evaluation_participants >
              0 ||
            current._count
              .assessment_drafts > 0 ||
            current._count.responses > 0
          ) {
            throw new ConflictException(
              'Survey version is already used by evaluations, participants, drafts, or responses and cannot be deleted',
            );
          }

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
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException(
          'The survey version changed while deletion was being processed. Please review the latest data and try again.',
        );
      }

      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Survey version is referenced by historical data and cannot be deleted',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // EDITABILITY CHECK
  // =========================================================

  /**
   * Used by the Questions feature before every question
   * mutation.
   *
   * A version is editable only when:
   *
   * - its parent question set is active
   * - it is the LATEST version of that named set
   * - it is still DRAFT
   * - no non-DRAFT evaluation directly uses it
   * - no participant is pinned to it
   * - no draft references it
   * - no submitted response references it
   *
   * This is also the stale-editor safeguard.
   *
   * Example:
   *
   * Admin A opens V2.
   * Admin B creates V3.
   * Admin A later tries to edit V2.
   *
   * V2 is no longer latest, so the request receives 409
   * and the admin must re-review the latest version.
   */
  async assertEditable(
    versionId: bigint,
    database: PrismaService = this.prisma,
  ) {
    const version =
      await database.survey_versions.findUnique({
        where: {
          id: versionId,
        },

        include: {
          surveys: {
            select: {
              id: true,
              archived_at: true,
            },
          },

          evaluations: {
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
      version.surveys.archived_at
    ) {
      throw new ConflictException(
        'Archived question sets are read-only and their questions cannot be changed',
      );
    }

    /*
     * Find the authoritative latest version at the moment
     * the edit request is processed.
     */
    const latest =
      await database.survey_versions.findFirst({
        where: {
          survey_id:
            version.survey_id,
        },

        orderBy: {
          version_no: 'desc',
        },

        select: {
          id: true,
          version_no: true,
        },
      });

    if (!latest) {
      throw new ConflictException(
        'The latest survey version could not be determined. Please reload the question set.',
      );
    }

    if (
      latest.id !== version.id
    ) {
      throw new ConflictException(
        `This is no longer the latest survey version. Version ${latest.version_no} is now the latest. Please reload and review the latest version before editing.`,
      );
    }

    if (
      version.status !== 'DRAFT'
    ) {
      throw new ConflictException(
        'Only the latest DRAFT survey version can be edited',
      );
    }

    if (
      version.evaluations.length > 0 ||
      version._count
        .evaluation_participants > 0 ||
      version._count
        .assessment_drafts > 0 ||
      version._count.responses > 0
    ) {
      throw new ConflictException(
        'This survey version is already referenced by participant or evaluation history and its questions cannot be changed',
      );
    }

    return version;
  }

  // =========================================================
  // INTERNAL HELPERS
  // =========================================================

  /**
   * Read helper.
   *
   * Archived question sets are still considered existing
   * because historical reads must continue to work.
   */
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
        'Question set not found',
      );
    }

    return survey;
  }

  /**
   * Mutation helper.
   *
   * Whole-set archive makes the named question set
   * read-only while preserving historical reads.
   */
  private async checkSurveyActive(
    surveyId: bigint,
  ) {
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
      throw new NotFoundException(
        'Question set not found',
      );
    }

    if (survey.archived_at) {
      throw new ConflictException(
        'Archived question sets are read-only',
      );
    }

    return survey;
  }
}
