import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { question_type } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { SurveyVersionsService } from '../survey-versions/survey-versions.service';

import {
  CreateQuestionDto,
  QuestionOptionDto,
} from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ReorderQuestionsDto } from './dto/reorder-questions.dto';

const OPTION_TYPES: question_type[] = [
  question_type.MULTIPLE_CHOICE,
  question_type.CHECKBOX,
];

@Injectable()
export class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private surveyVersions: SurveyVersionsService,
  ) {}

  // =========================================================
  // GET ALL QUESTIONS FOR VERSION
  // =========================================================

  async findAllForVersion(versionId: bigint) {
    const version =
      await this.prisma.survey_versions.findUnique({
        where: {
          id: versionId,
        },
        select: {
          id: true,
        },
      });

    if (!version) {
      throw new NotFoundException(
        'Survey version not found',
      );
    }

    return this.prisma.questions.findMany({
      where: {
        survey_version_id: versionId,
      },

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
    });
  }

  // =========================================================
  // CREATE QUESTION
  // =========================================================

  async create(versionId: bigint, dto: CreateQuestionDto) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new QuestionsService(db, this.surveyVersions).createInTransaction(
          versionId,
          dto,
        ),
      (e: any) => {
        if (e.code === 'P2002') {
          throw new ConflictException(
            'display_order is already used for this question or its options',
          );
        }

        throw e;
      },
    );
  }

  private async createInTransaction(
    versionId: bigint,
    dto: CreateQuestionDto,
  ) {
    await this.surveyVersions.assertEditable(
      versionId,
      this.prisma,
    );

    const range = this.resolveRatingRange(
      dto.question_type,
      dto.min_rating,
      dto.max_rating,
    );

    this.validateOptions(
      dto.question_type,
      dto.options,
    );

    const questionCount =
      await this.prisma.questions.count({
        where: {
          survey_version_id: versionId,
        },
      });

    /*
     * If display_order is omitted:
     * append to the end.
     *
     * If supplied:
     * it must be between 1 and count + 1.
     */
    const displayOrder =
      dto.display_order ?? questionCount + 1;

    if (
      displayOrder < 1 ||
      displayOrder > questionCount + 1
    ) {
      throw new BadRequestException(
        `display_order must be between 1 and ${
          questionCount + 1
        }`,
      );
    }

    const now = new Date();

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * If inserting somewhere before the end,
           * shift all questions from that position
           * one place to the right.
           *
           * Example:
           *
           * 1 A
           * 2 B
           * 3 C
           *
           * Insert at 2:
           *
           * 1 A
           * 2 NEW
           * 3 B
           * 4 C
           *
           * Because display_order is unique inside
           * the survey version, we first move the
           * affected rows to temporary negative values.
           */

          const questionsToShift =
            await tx.questions.findMany({
              where: {
                survey_version_id: versionId,

                display_order: {
                  gte: displayOrder,
                },
              },

              select: {
                id: true,
                display_order: true,
              },

              orderBy: {
                display_order: 'asc',
              },
            });

          // Phase 1:
          // move affected questions to temporary
          // negative positions.
          for (
            let index = 0;
            index < questionsToShift.length;
            index++
          ) {
            const question =
              questionsToShift[index];

            await tx.questions.update({
              where: {
                id: question.id,
              },

              data: {
                display_order:
                  -(index + 1),
                updated_at: now,
              },
            });
          }

          // Phase 2:
          // move each old question one position right.
          for (const question of questionsToShift) {
            await tx.questions.update({
              where: {
                id: question.id,
              },

              data: {
                display_order:
                  question.display_order + 1,
                updated_at: now,
              },
            });
          }

          // Phase 3:
          // create the new question in the free slot.
          return tx.questions.create({
            data: {
              survey_version_id:
                versionId,

              question_text:
                dto.question_text,

              question_text_km:
                dto.question_text_km,

              question_type:
                dto.question_type,

              category:
                dto.category,

              is_required:
                dto.is_required ?? true,

              min_rating:
                range.min,

              max_rating:
                range.max,

              display_order:
                displayOrder,

              created_at:
                now,

              updated_at:
                now,

              question_options:
                dto.options
                  ? {
                      create:
                        dto.options.map(
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

            include: {
              question_options: {
                orderBy: {
                  display_order: 'asc',
                },
              },
            },
          });
        },
      );
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'display_order is already used for this question or its options',
        );
      }

      throw e;
    }
  }

  // =========================================================
  // REORDER QUESTIONS
  // =========================================================

  /**
   * Reorder every question in a survey version.
   *
   * The frontend must send the complete list of questions
   * belonging to the version.
   *
   * Example:
   *
   * {
   *   "questions": [
   *     {
   *       "question_id": "12",
   *       "display_order": 1
   *     },
   *     {
   *       "question_id": "15",
   *       "display_order": 2
   *     }
   *   ]
   * }
   *
   * Validation:
   * - survey version must be editable
   * - complete question list is required
   * - question IDs must be unique
   * - display orders must be unique
   * - display orders must be exactly 1..N
   * - every question must belong to this version
   *
   * Two-phase update avoids unique-order conflicts.
   */
  async reorder(versionId: bigint, dto: ReorderQuestionsDto) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new QuestionsService(db, this.surveyVersions).reorderInTransaction(
          versionId,
          dto,
        ),
      (e: any) => {
        if (e.code === 'P2002') {
          throw new ConflictException(
            'Unable to reorder questions because a display_order conflict occurred',
          );
        }

        throw e;
      },
    );
  }

  private async reorderInTransaction(
    versionId: bigint,
    dto: ReorderQuestionsDto,
  ) {
    await this.surveyVersions.assertEditable(
      versionId,
      this.prisma,
    );

    const existingQuestions =
      await this.prisma.questions.findMany({
        where: {
          survey_version_id: versionId,
        },

        select: {
          id: true,
          display_order: true,
        },

        orderBy: {
          display_order: 'asc',
        },
      });

    if (existingQuestions.length === 0) {
      throw new BadRequestException(
        'Survey version has no questions to reorder',
      );
    }

    if (
      dto.questions.length !==
      existingQuestions.length
    ) {
      throw new BadRequestException(
        'The complete question list is required when reordering',
      );
    }

    const requestedIds =
      dto.questions.map(
        (item) => item.question_id,
      );

    if (
      new Set(requestedIds).size !==
      requestedIds.length
    ) {
      throw new BadRequestException(
        'Each question_id must be unique',
      );
    }

    const requestedOrders =
      dto.questions.map(
        (item) => item.display_order,
      );

    if (
      new Set(requestedOrders).size !==
      requestedOrders.length
    ) {
      throw new BadRequestException(
        'Each display_order must be unique',
      );
    }

    const expectedOrders =
      Array.from(
        {
          length:
            existingQuestions.length,
        },
        (_, index) => index + 1,
      );

    const sortedRequestedOrders = [
      ...requestedOrders,
    ].sort((a, b) => a - b);

    const hasValidSequence =
      sortedRequestedOrders.every(
        (order, index) =>
          order === expectedOrders[index],
      );

    if (!hasValidSequence) {
      throw new BadRequestException(
        `display_order must contain every position from 1 to ${existingQuestions.length}`,
      );
    }

    const existingIdSet =
      new Set(
        existingQuestions.map(
          (question) =>
            question.id.toString(),
        ),
      );

    for (const item of dto.questions) {
      if (
        !existingIdSet.has(
          item.question_id,
        )
      ) {
        throw new BadRequestException(
          `Question ${item.question_id} does not belong to this survey version`,
        );
      }
    }

    const now = new Date();

    try {
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Phase 1:
           * Move every question to a temporary
           * negative display_order.
           */
          for (
            let index = 0;
            index <
            existingQuestions.length;
            index++
          ) {
            const question =
              existingQuestions[index];

            await tx.questions.update({
              where: {
                id: question.id,
              },

              data: {
                display_order:
                  -(index + 1),

                updated_at:
                  now,
              },
            });
          }

          /*
           * Phase 2:
           * Assign requested final positions.
           */
          for (
            const item of dto.questions
          ) {
            await tx.questions.update({
              where: {
                id: BigInt(
                  item.question_id,
                ),
              },

              data: {
                display_order:
                  item.display_order,

                updated_at:
                  now,
              },
            });
          }
        },
      );
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Unable to reorder questions because a display_order conflict occurred',
        );
      }

      throw e;
    }

    return this.prisma.questions.findMany({
      where: {
        survey_version_id:
          versionId,
      },

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
    });
  }

  // =========================================================
  // UPDATE QUESTION
  // =========================================================

  async update(questionId: bigint, dto: UpdateQuestionDto) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new QuestionsService(db, this.surveyVersions).updateInTransaction(
          questionId,
          dto,
        ),
      (e: any) => {
        if (e.code === 'P2002') {
          throw new ConflictException(
            'display_order is already used for this question or its options',
          );
        }

        if (e.code === 'P2003') {
          throw new ConflictException(
            'Question options are already referenced by submitted answers',
          );
        }

        throw e;
      },
    );
  }

  private async updateInTransaction(
    questionId: bigint,
    dto: UpdateQuestionDto,
  ) {
    const question =
      await this.findQuestion(
        questionId,
      );

    await this.surveyVersions.assertEditable(
      question.survey_version_id,
      this.prisma,
    );

    const type =
      dto.question_type ??
      question.question_type;

    const typeChanged =
      type !== question.question_type;

    const min =
      dto.min_rating ??
      (typeChanged
        ? undefined
        : question.min_rating ??
          undefined);

    const max =
      dto.max_rating ??
      (typeChanged
        ? undefined
        : question.max_rating ??
          undefined);

    const range =
      this.resolveRatingRange(
        type,
        min,
        max,
      );

    this.validateOptionsForUpdate(
      type,
      dto.options,
      typeChanged,
    );

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          /*
           * If options are explicitly supplied,
           * replace the old option list.
           */
          if (
            dto.options !== undefined
          ) {
            await tx.question_options.deleteMany({
              where: {
                question_id:
                  questionId,
              },
            });

            await tx.question_options.createMany({
              data: dto.options.map(
                (option) => ({
                  question_id:
                    questionId,

                  option_text:
                    option.option_text,

                  display_order:
                    option.display_order,
                }),
              ),
            });
          }

          /*
           * If changing from an option-based
           * question to a non-option question,
           * remove the old options.
           */
          if (
            typeChanged &&
            !this.isOptionType(type) &&
            dto.options === undefined
          ) {
            await tx.question_options.deleteMany({
              where: {
                question_id:
                  questionId,
              },
            });
          }

          return tx.questions.update({
            where: {
              id: questionId,
            },

            data: {
              question_text:
                dto.question_text,

              question_text_km:
                dto.question_text_km,

              question_type:
                type,

              category:
                dto.category,

              is_required:
                dto.is_required,

              min_rating:
                range.min,

              max_rating:
                range.max,

              display_order:
                dto.display_order,

              updated_at:
                new Date(),
            },

            include: {
              question_options: {
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
          'display_order is already used for this question or its options',
        );
      }

      if (e.code === 'P2003') {
        throw new ConflictException(
          'Question options are already referenced by submitted answers',
        );
      }

      throw e;
    }
  }

  // =========================================================
  // DELETE QUESTION
  // =========================================================

  async remove(questionId: bigint) {
    return inSerializableTransaction(
      this.prisma,
      (db) =>
        new QuestionsService(db, this.surveyVersions).removeInTransaction(
          questionId,
        ),
      (e: any) => {
        if (e.code === 'P2003') {
          throw new ConflictException(
            'Question already has answers and cannot be deleted',
          );
        }

        if (e.code === 'P2002') {
          throw new ConflictException(
            'Unable to compact question ordering because a display_order conflict occurred',
          );
        }

        throw e;
      },
    );
  }

  private async removeInTransaction(questionId: bigint) {
    const question =
      await this.findQuestion(
        questionId,
      );

    await this.surveyVersions.assertEditable(
      question.survey_version_id,
      this.prisma,
    );

    const now = new Date();

    try {
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Example:
           *
           * 1 A
           * 2 B <- delete
           * 3 C
           * 4 D
           *
           * Result:
           *
           * 1 A
           * 2 C
           * 3 D
           */

          // Find questions that come after
          // the question being deleted.
          const questionsToShift =
            await tx.questions.findMany({
              where: {
                survey_version_id:
                  question.survey_version_id,

                display_order: {
                  gt:
                    question.display_order,
                },
              },

              select: {
                id: true,
                display_order: true,
              },

              orderBy: {
                display_order: 'asc',
              },
            });

          // Remove options first.
          await tx.question_options.deleteMany({
            where: {
              question_id:
                questionId,
            },
          });

          // Delete the question.
          await tx.questions.delete({
            where: {
              id: questionId,
            },
          });

          /*
           * Phase 1:
           * Move later questions temporarily
           * to negative positions.
           */
          for (
            let index = 0;
            index <
            questionsToShift.length;
            index++
          ) {
            const item =
              questionsToShift[index];

            await tx.questions.update({
              where: {
                id: item.id,
              },

              data: {
                display_order:
                  -(index + 1),

                updated_at:
                  now,
              },
            });
          }

          /*
           * Phase 2:
           * Compact them by one position.
           */
          for (
            const item of questionsToShift
          ) {
            await tx.questions.update({
              where: {
                id: item.id,
              },

              data: {
                display_order:
                  item.display_order - 1,

                updated_at:
                  now,
              },
            });
          }
        },
      );
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Question already has answers and cannot be deleted',
        );
      }

      if (e.code === 'P2002') {
        throw new ConflictException(
          'Unable to compact question ordering because a display_order conflict occurred',
        );
      }

      throw e;
    }
  }

  // =========================================================
  // INTERNAL HELPERS
  // =========================================================

  private async findQuestion(
    questionId: bigint,
  ) {
    const question =
      await this.prisma.questions.findUnique({
        where: {
          id: questionId,
        },
      });

    if (!question) {
      throw new NotFoundException(
        'Question not found',
      );
    }

    return question;
  }

  /*
   * Only RATING uses configurable
   * min_rating / max_rating.
   *
   * AGREEMENT and FREQUENCY use
   * the fixed 1–5 scale.
   *
   * TEXT, MULTIPLE_CHOICE and CHECKBOX
   * do not use min_rating / max_rating.
   */
  private resolveRatingRange(
    type: question_type,
    min?: number,
    max?: number,
  ) {
    if (
      type === question_type.RATING
    ) {
      const low = min ?? 1;
      const high = max ?? 5;

      if (low >= high) {
        throw new BadRequestException(
          'min_rating must be less than max_rating',
        );
      }

      return {
        min: low,
        max: high,
      };
    }

    if (
      type ===
        question_type.AGREEMENT ||
      type ===
        question_type.FREQUENCY
    ) {
      if (
        min !== undefined ||
        max !== undefined
      ) {
        throw new BadRequestException(
          'AGREEMENT and FREQUENCY use a fixed 1-5 scale; min_rating and max_rating must not be provided',
        );
      }

      return {
        min: 1,
        max: 5,
      };
    }

    if (
      min !== undefined ||
      max !== undefined
    ) {
      throw new BadRequestException(
        'min_rating and max_rating are only allowed for RATING questions',
      );
    }

    return {
      min: null,
      max: null,
    };
  }

  /*
   * Creation:
   *
   * MULTIPLE_CHOICE / CHECKBOX
   * -> options required
   *
   * Other question types
   * -> options not allowed
   */
  private validateOptions(
    type: question_type,
    options?: QuestionOptionDto[],
  ) {
    if (this.isOptionType(type)) {
      if (
        !options ||
        options.length === 0
      ) {
        throw new BadRequestException(
          'options are required for MULTIPLE_CHOICE and CHECKBOX questions',
        );
      }

      this.validateOptionDisplayOrders(
        options,
      );

      return;
    }

    if (options !== undefined) {
      throw new BadRequestException(
        'options are only allowed for MULTIPLE_CHOICE and CHECKBOX questions',
      );
    }
  }

  /*
   * Update:
   *
   * Existing option question + no options
   * -> keep existing options.
   *
   * Changing a non-option question into
   * MULTIPLE_CHOICE / CHECKBOX
   * -> new options are required.
   */
  private validateOptionsForUpdate(
    type: question_type,
    options:
      | QuestionOptionDto[]
      | undefined,
    typeChanged: boolean,
  ) {
    if (
      typeChanged &&
      this.isOptionType(type) &&
      options === undefined
    ) {
      throw new BadRequestException(
        'options are required when changing a question to MULTIPLE_CHOICE or CHECKBOX',
      );
    }

    if (options === undefined) {
      return;
    }

    if (!this.isOptionType(type)) {
      throw new BadRequestException(
        'options are only allowed for MULTIPLE_CHOICE and CHECKBOX questions',
      );
    }

    if (options.length === 0) {
      throw new BadRequestException(
        'MULTIPLE_CHOICE and CHECKBOX questions must have at least one option',
      );
    }

    this.validateOptionDisplayOrders(
      options,
    );
  }

  private validateOptionDisplayOrders(
    options: QuestionOptionDto[],
  ) {
    const orders =
      options.map(
        (option) =>
          option.display_order,
      );

    if (
      new Set(orders).size !==
      orders.length
    ) {
      throw new BadRequestException(
        'Each option must have a unique display_order',
      );
    }
  }

  private isOptionType(
    type: question_type,
  ) {
    return OPTION_TYPES.includes(
      type,
    );
  }

  private async nextDisplayOrder(
    versionId: bigint,
  ) {
    const result =
      await this.prisma.questions.aggregate({
        where: {
          survey_version_id:
            versionId,
        },

        _max: {
          display_order: true,
        },
      });

    return (
      (result._max.display_order ?? 0) +
      1
    );
  }
}