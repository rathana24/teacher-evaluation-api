import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';

/**
 * A survey represents a named question set.
 *
 * A survey may have multiple immutable historical versions.
 * New question editing happens only through the appropriate
 * editable survey version.
 */
const surveyInclude = {
  users: {
    select: {
      id: true,
      full_name: true,
    },
  },

  survey_versions: {
    select: {
      id: true,
      version_no: true,
      status: true,
      locked_at: true,
      created_at: true,

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
  },
} satisfies Prisma.surveysInclude;

@Injectable()
export class SurveysService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // GET ALL QUESTION SETS
  // =========================================================

  /**
   * Returns both active and archived question sets.
   *
   * archived_at tells the frontend whether the set is active
   * or archived.
   *
   * Archived sets remain readable because they may be required
   * for historical evaluations and results.
   */
  findAll() {
    return this.prisma.surveys.findMany({
      include: surveyInclude,

      orderBy: {
        id: 'asc',
      },
    });
  }

  // =========================================================
  // GET ONE QUESTION SET
  // =========================================================

  async findOne(
    id: bigint,
  ) {
    const survey =
      await this.prisma.surveys.findUnique({
        where: {
          id,
        },

        include: surveyInclude,
      });

    if (!survey) {
      throw new NotFoundException(
        'Question set not found',
      );
    }

    return survey;
  }

  // =========================================================
  // CREATE QUESTION SET + VERSION 1
  // =========================================================

  /**
   * Creates:
   *
   *   Question Set
   *       +
   *   Version 1 (DRAFT)
   *
   * in one transaction.
   *
   * This prevents a question set from being created without
   * its initial version.
   */
  async create(
    dto: CreateSurveyDto,
    createdBy: bigint,
  ) {
    const title =
      this.normalizeTitle(dto.title);

    const description =
      this.normalizeDescription(
        dto.description,
      );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * Question-set titles are unique among all sets,
           * including archived sets.
           *
           * We intentionally do not allow an archived title
           * to be silently reused because that would make
           * historical result/report identification ambiguous.
           */
          const duplicate =
            await tx.surveys.findFirst({
              where: {
                title: {
                  equals: title,
                  mode: 'insensitive',
                },
              },

              select: {
                id: true,
                archived_at: true,
              },
            });

          if (duplicate) {
            throw new ConflictException(
              'A question set with this title already exists',
            );
          }

          const now = new Date();

          const survey =
            await tx.surveys.create({
              data: {
                title,
                description,
                created_by: createdBy,
                created_at: now,
                updated_at: now,
              },
            });

          /*
           * Every newly created question set starts with
           * Version 1 in DRAFT status.
           */
          await tx.survey_versions.create({
            data: {
              survey_id: survey.id,
              version_no: 1,
              status: 'DRAFT',
              created_by: createdBy,
              created_at: now,
            },
          });

          return tx.surveys.findUniqueOrThrow({
            where: {
              id: survey.id,
            },

            include: surveyInclude,
          });
        },
        {
          /*
           * Serializable protects the read-then-create title
           * check from concurrent creation requests.
           */
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        },
      );
    } catch (error: any) {
      /*
       * P2034 can occur when concurrent serializable
       * transactions conflict.
       *
       * The caller may safely review/retry the request.
       */
      if (error?.code === 'P2034') {
        throw new ConflictException(
          'The question set changed during creation. Please review the latest data and try again.',
        );
      }

      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A question set with this title already exists',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // UPDATE QUESTION SET METADATA
  // =========================================================

  /**
   * Updates question-set metadata only.
   *
   * Archived sets are read-only.
   */
  async update(
    id: bigint,
    dto: UpdateSurveyDto,
  ) {
    const existing =
      await this.prisma.surveys.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,
          description: true,
          archived_at: true,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Question set not found',
      );
    }

    if (existing.archived_at) {
      throw new ConflictException(
        'Archived question sets are read-only and cannot be updated',
      );
    }

    const title =
      dto.title !== undefined
        ? this.normalizeTitle(dto.title)
        : existing.title;

    const description =
      dto.description !== undefined
        ? this.normalizeDescription(
            dto.description,
          )
        : existing.description;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * Re-read inside the transaction so that an archive
           * operation that happened concurrently is not
           * silently ignored.
           */
          const current =
            await tx.surveys.findUnique({
              where: {
                id,
              },

              select: {
                id: true,
                archived_at: true,
              },
            });

          if (!current) {
            throw new NotFoundException(
              'Question set not found',
            );
          }

          if (current.archived_at) {
            throw new ConflictException(
              'Archived question sets are read-only and cannot be updated',
            );
          }

          const duplicate =
            await tx.surveys.findFirst({
              where: {
                id: {
                  not: id,
                },

                title: {
                  equals: title,
                  mode: 'insensitive',
                },
              },

              select: {
                id: true,
              },
            });

          if (duplicate) {
            throw new ConflictException(
              'A question set with this title already exists',
            );
          }

          await tx.surveys.update({
            where: {
              id,
            },

            data: {
              title,
              description,
              updated_at: new Date(),
            },
          });

          return tx.surveys.findUniqueOrThrow({
            where: {
              id,
            },

            include: surveyInclude,
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
          'The question set changed while it was being updated. Please review the latest data and try again.',
        );
      }

      if (error?.code === 'P2002') {
        throw new ConflictException(
          'A question set with this title already exists',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // ARCHIVE WHOLE QUESTION SET
  // =========================================================

  /**
   * Archives the whole named question set.
   *
   * Important:
   *
   * - historical versions are NOT deleted
   * - historical evaluations are NOT changed
   * - participant assignments are NOT changed
   * - drafts are NOT deleted
   * - responses/results are NOT deleted
   *
   * archived_at only retires the set from future use/editing.
   */
  async archive(
    id: bigint,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const survey =
            await tx.surveys.findUnique({
              where: {
                id,
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
              'Question set is already archived',
            );
          }

          const archivedAt =
            new Date();

          await tx.surveys.update({
            where: {
              id,
            },

            data: {
              archived_at: archivedAt,
              updated_at: archivedAt,
            },
          });

          return tx.surveys.findUniqueOrThrow({
            where: {
              id,
            },

            include: surveyInclude,
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
          'The question set changed while it was being archived. Please review the latest data and try again.',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // USAGE / DEPENDENCY INFORMATION
  // =========================================================

  /**
   * Returns authoritative usage counts for the whole named set.
   *
   * These counts are useful before archive/delete operations
   * and for admin confirmation UI.
   */
  async getUsage(
    id: bigint,
  ) {
    const survey =
      await this.prisma.surveys.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          title: true,
          archived_at: true,

          survey_versions: {
            select: {
              id: true,
              version_no: true,
              status: true,

              _count: {
                select: {
                  questions: true,
                  evaluations: true,
                  evaluation_participants:
                    true,
                  assessment_drafts: true,
                  responses: true,
                },
              },
            },

            orderBy: {
              version_no: 'asc',
            },
          },
        },
      });

    if (!survey) {
      throw new NotFoundException(
        'Question set not found',
      );
    }

    const totals =
      survey.survey_versions.reduce(
        (acc, version) => {
          acc.questions +=
            version._count.questions;

          acc.evaluations +=
            version._count.evaluations;

          acc.evaluation_participants +=
            version._count
              .evaluation_participants;

          acc.assessment_drafts +=
            version._count
              .assessment_drafts;

          acc.responses +=
            version._count.responses;

          return acc;
        },
        {
          questions: 0,
          evaluations: 0,
          evaluation_participants: 0,
          assessment_drafts: 0,
          responses: 0,
        },
      );

    const hasHistoricalUsage =
      totals.evaluations > 0 ||
      totals.evaluation_participants > 0 ||
      totals.assessment_drafts > 0 ||
      totals.responses > 0;

    return {
      survey_id:
        survey.id.toString(),

      title:
        survey.title,

      archived:
        survey.archived_at !== null,

      archived_at:
        survey.archived_at,

      version_count:
        survey.survey_versions.length,

      versions:
        survey.survey_versions,

      totals,

      has_historical_usage:
        hasHistoricalUsage,

      can_delete:
        !hasHistoricalUsage,
    };
  }

  // =========================================================
  // DELETE UNUSED QUESTION SET
  // =========================================================

  /**
   * Permanently deletes an UNUSED question set.
   *
   * A set cannot be deleted if any historical evaluation,
   * participant assignment, draft, or response references
   * any version belonging to the set.
   *
   * If unused, the following are removed atomically:
   *
   * question options
   *      ↓
   * questions
   *      ↓
   * survey versions
   *      ↓
   * survey
   */
  async remove(
    id: bigint,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const survey =
            await tx.surveys.findUnique({
              where: {
                id,
              },

              select: {
                id: true,
                title: true,

                survey_versions: {
                  select: {
                    id: true,

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
                },
              },
            });

          if (!survey) {
            throw new NotFoundException(
              'Question set not found',
            );
          }

          /*
           * Calculate usage inside the same transaction as
           * deletion.
           */
          const usedVersion =
            survey.survey_versions.find(
              (version) =>
                version._count.evaluations >
                  0 ||
                version._count
                  .evaluation_participants >
                  0 ||
                version._count
                  .assessment_drafts >
                  0 ||
                version._count.responses >
                  0,
            );

          if (usedVersion) {
            throw new ConflictException(
              'Question set is referenced by evaluation history, participants, drafts, or responses and cannot be deleted',
            );
          }

          const versionIds =
            survey.survey_versions.map(
              (version) =>
                version.id,
            );

          if (versionIds.length > 0) {
            const questions =
              await tx.questions.findMany({
                where: {
                  survey_version_id: {
                    in: versionIds,
                  },
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
                survey_version_id: {
                  in: versionIds,
                },
              },
            });

            await tx.survey_versions.deleteMany({
              where: {
                id: {
                  in: versionIds,
                },
              },
            });
          }

          await tx.surveys.delete({
            where: {
              id,
            },
          });

          return {
            deleted: true,

            survey_id:
              id.toString(),

            title:
              survey.title,
          };
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
          'The question set changed while deletion was being processed. Please review the latest data and try again.',
        );
      }

      if (error?.code === 'P2003') {
        throw new ConflictException(
          'Question set is referenced by historical data and cannot be deleted',
        );
      }

      throw error;
    }
  }

  // =========================================================
  // INTERNAL HELPERS
  // =========================================================

  /**
   * Titles:
   *
   * - trim surrounding whitespace
   * - cannot be blank
   * - maximum 200 characters
   */
  private normalizeTitle(
    value: string,
  ) {
    const title =
      value?.trim();

    if (!title) {
      throw new BadRequestException(
        'Question set title cannot be blank',
      );
    }

    if (title.length > 200) {
      throw new BadRequestException(
        'Question set title cannot exceed 200 characters',
      );
    }

    return title;
  }

  /**
   * Descriptions are trimmed.
   *
   * An empty description becomes undefined so whitespace-only
   * values are not stored.
   */
  private normalizeDescription(
    value?: string | null,
  ): string | undefined {
    if (
      value === undefined ||
      value === null
    ) {
      return undefined;
    }

    const description =
      value.trim();

    return description.length > 0
      ? description
      : undefined;
  }
}