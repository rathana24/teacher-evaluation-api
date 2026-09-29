import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyVersionDto } from './dto/create-survey-version.dto';

@Injectable()
export class SurveyVersionsService {
  constructor(
    private prisma: PrismaService,
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

  // The version must belong to the survey
  // in the URL, otherwise it is "not found".
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
      /*
       * Everything happens in one transaction.
       *
       * If copying any question or option fails,
       * the new survey version is also rolled back.
       */
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * Find the latest version.
           *
           * Include:
           * - questions
           * - Khmer question text
           * - display order
           * - question options
           */
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

          // -----------------------------------------
          // Create new survey version
          // -----------------------------------------

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

          // -----------------------------------------
          // Copy questions from latest version
          // -----------------------------------------

          if (
            dto.copy_questions &&
            latest &&
            latest.questions.length > 0
          ) {
            /*
             * We use create() instead of
             * createMany() here because every
             * copied question may also contain
             * nested question_options.
             */
            for (
              const question of
              latest.questions
            ) {
              await tx.questions.create({
                data: {
                  survey_version_id:
                    version.id,

                  // English question
                  question_text:
                    question.question_text,

                  // Khmer question
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

                  // Preserve exact ordering
                  display_order:
                    question.display_order,

                  created_at:
                    now,

                  updated_at:
                    now,

                  // Copy question options
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

          // -----------------------------------------
          // Return complete new version
          // -----------------------------------------

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

    if (
      version._count.evaluations > 0
    ) {
      throw new ConflictException(
        'Survey version is used by evaluations and cannot be deleted',
      );
    }

    /*
     * Delete options first, then questions,
     * then the survey version.
     *
     * This avoids foreign-key problems if
     * question_options do not use cascade delete.
     */
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

  /*
   * Used by the Questions feature.
   *
   * Editable only while:
   *
   * - survey version is DRAFT
   * - no evaluation using it has been opened
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
        },
      });

    if (!version) {
      throw new NotFoundException(
        'Survey version not found',
      );
    }

    if (
      version.status !== 'DRAFT' ||
      version.evaluations.length > 0
    ) {
      throw new ConflictException(
        'This survey version is locked and its questions cannot be changed',
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