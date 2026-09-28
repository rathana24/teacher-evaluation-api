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

  async findAllForVersion(versionId: bigint) {
    const version = await this.prisma.survey_versions.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!version) {
      throw new NotFoundException('Survey version not found');
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

  async create(versionId: bigint, dto: CreateQuestionDto) {
    await this.surveyVersions.assertEditable(versionId);

    const range = this.resolveRatingRange(
      dto.question_type,
      dto.min_rating,
      dto.max_rating,
    );

    this.validateOptions(dto.question_type, dto.options);

    const displayOrder =
      dto.display_order ??
      (await this.nextDisplayOrder(versionId));

    const now = new Date();

    try {
      return await this.prisma.questions.create({
        data: {
          survey_version_id: versionId,
          question_text: dto.question_text,
          question_type: dto.question_type,
          category: dto.category,
          is_required: dto.is_required ?? true,
          min_rating: range.min,
          max_rating: range.max,
          display_order: displayOrder,
          created_at: now,
          updated_at: now,

          question_options: dto.options
            ? {
                create: dto.options.map((option) => ({
                  option_text: option.option_text,
                  display_order: option.display_order,
                })),
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
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'display_order is already used for this question or its options',
        );
      }

      throw e;
    }
  }

  async update(
    questionId: bigint,
    dto: UpdateQuestionDto,
  ) {
    const question = await this.findQuestion(questionId);

    await this.surveyVersions.assertEditable(
      question.survey_version_id,
    );

    const type =
      dto.question_type ?? question.question_type;

    const typeChanged =
      type !== question.question_type;

    const min =
      dto.min_rating ??
      (typeChanged
        ? undefined
        : question.min_rating ?? undefined);

    const max =
      dto.max_rating ??
      (typeChanged
        ? undefined
        : question.max_rating ?? undefined);

    const range = this.resolveRatingRange(
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
          if (dto.options !== undefined) {
            await tx.question_options.deleteMany({
              where: {
                question_id: questionId,
              },
            });

            await tx.question_options.createMany({
              data: dto.options.map((option) => ({
                question_id: questionId,
                option_text: option.option_text,
                display_order: option.display_order,
              })),
            });
          }

          /*
           * If the question changes from an option-based
           * type to a non-option type, remove old options.
           */
          if (
            typeChanged &&
            !this.isOptionType(type) &&
            dto.options === undefined
          ) {
            await tx.question_options.deleteMany({
              where: {
                question_id: questionId,
              },
            });
          }

          return tx.questions.update({
            where: {
              id: questionId,
            },

            data: {
              question_text: dto.question_text,
              question_type: type,
              category: dto.category,
              is_required: dto.is_required,
              min_rating: range.min,
              max_rating: range.max,
              display_order: dto.display_order,
              updated_at: new Date(),
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

      if (e.code === 'P2003') {
        throw new ConflictException(
          'Question options are already referenced by submitted answers',
        );
      }

      throw e;
    }
  }

  async remove(questionId: bigint) {
    const question =
      await this.findQuestion(questionId);

    await this.surveyVersions.assertEditable(
      question.survey_version_id,
    );

    try {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.question_options.deleteMany({
            where: {
              question_id: questionId,
            },
          });

          await tx.questions.delete({
            where: {
              id: questionId,
            },
          });
        },
      );
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Question already has answers and cannot be deleted',
        );
      }

      throw e;
    }
  }

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
    if (type === question_type.RATING) {
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
      type === question_type.AGREEMENT ||
      type === question_type.FREQUENCY
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
   * → options required
   *
   * Other question types
   * → options not allowed
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
   * → keep existing options.
   *
   * Changing a non-option question into
   * MULTIPLE_CHOICE / CHECKBOX
   * → new options are required.
   */
  private validateOptionsForUpdate(
    type: question_type,
    options: QuestionOptionDto[] | undefined,
    typeChanged: boolean,
  ) {
    /*
     * Important:
     * TEXT/RATING/etc. -> MULTIPLE_CHOICE/CHECKBOX
     * cannot happen without providing options.
     */
    if (
      typeChanged &&
      this.isOptionType(type) &&
      options === undefined
    ) {
      throw new BadRequestException(
        'options are required when changing a question to MULTIPLE_CHOICE or CHECKBOX',
      );
    }

    /*
     * Nothing supplied:
     * keep existing options.
     */
    if (options === undefined) {
      return;
    }

    /*
     * Non-option question types must not
     * receive an options array.
     */
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
    const orders = options.map(
      (option) => option.display_order,
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
    return OPTION_TYPES.includes(type);
  }

  private async nextDisplayOrder(
    versionId: bigint,
  ) {
    const result =
      await this.prisma.questions.aggregate({
        where: {
          survey_version_id: versionId,
        },
        _max: {
          display_order: true,
        },
      });

    return (
      (result._max.display_order ?? 0) + 1
    );
  }
}