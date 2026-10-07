import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  question_type,
  questions,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import {
  DraftAnswerDto,
  SaveAssessmentDraftDto,
} from './dto/save-assessment-draft.dto';

type QuestionWithOptions = questions & {
  question_options: {
    id: bigint;
    question_id: bigint;
    option_text: string;
    display_order: number;
  }[];
};

type ValidatedDraftAnswer = {
  question_id: string;
  rating_value?: number;
  text_value?: string;
  selected_option_ids?: string[];
};

@Injectable()
export class AssessmentDraftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccess: StudentAccessService,
  ) {}

  /**
   * Save a new draft or replace the student's existing draft.
   *
   * Drafts may be incomplete, but every answer that is present
   * must be valid for the participant's effective survey version.
   *
   * One participant can have only one draft because
   * assessment_drafts.participant_id is unique.
   *
   * The draft also stores the exact survey version used when
   * its answers were validated. This prevents saved answers
   * from being silently reinterpreted against another version.
   */
  async save(
    evaluationId: bigint,
    studentId: bigint,
    dto: SaveAssessmentDraftDto,
  ) {
    return inSerializableTransaction(this.prisma, (db) =>
      new AssessmentDraftsService(db, this.studentAccess).saveInTransaction(
        evaluationId,
        studentId,
        dto,
      ),
    );
  }

  private async saveInTransaction(
    evaluationId: bigint,
    studentId: bigint,
    dto: SaveAssessmentDraftDto,
  ) {
    const {
      participant,
      effectiveSurveyVersionId,
    } =
      await this.studentAccess.getAnswerableEvaluation(
        evaluationId,
        studentId,
        this.prisma,
      );

    if (participant.has_submitted) {
      throw new ConflictException(
        'You have already submitted this evaluation',
      );
    }

    /*
     * If a historical draft already exists, make sure that it
     * belongs to the participant's current effective version.
     *
     * A NULL survey_version_id represents a draft created before
     * draft-version tracking was introduced. We do not silently
     * attach or reinterpret such a draft here.
     */
    const existingDraft =
      await this.prisma.assessment_drafts.findUnique({
        where: {
          participant_id: participant.id,
        },
        select: {
          id: true,
          survey_version_id: true,
        },
      });

    if (
      existingDraft &&
      existingDraft.survey_version_id !== null &&
      existingDraft.survey_version_id !==
        effectiveSurveyVersionId
    ) {
      throw new ConflictException(
        'The saved draft belongs to a different survey version and cannot be overwritten automatically',
      );
    }

    if (
      existingDraft &&
      existingDraft.survey_version_id === null
    ) {
      throw new ConflictException(
        'The saved draft was created before survey-version tracking and must be reviewed before it can be updated',
      );
    }

    const questionList =
      await this.prisma.questions.findMany({
        where: {
          survey_version_id:
            effectiveSurveyVersionId,
        },
        include: {
          question_options: true,
        },
      });

    const validatedAnswers =
      this.validateDraftAnswers(
        questionList,
        dto.answers,
      );

    const now = new Date();

    const answersJson =
      validatedAnswers.map((answer) => ({
        question_id: answer.question_id,

        ...(answer.rating_value !== undefined
          ? {
              rating_value:
                answer.rating_value,
            }
          : {}),

        ...(answer.text_value !== undefined
          ? {
              text_value:
                answer.text_value,
            }
          : {}),

        ...(answer.selected_option_ids !== undefined
          ? {
              selected_option_ids:
                answer.selected_option_ids,
            }
          : {}),
      })) as Prisma.InputJsonValue;

    const draft =
      await this.prisma.assessment_drafts.upsert({
        where: {
          participant_id: participant.id,
        },

        update: {
          survey_version_id:
            effectiveSurveyVersionId,

          answers_json: answersJson,
          updated_at: now,
        },

        create: {
          participant_id: participant.id,

          survey_version_id:
            effectiveSurveyVersionId,

          answers_json: answersJson,
          created_at: now,
          updated_at: now,
        },
      });

    return {
      evaluation_id: evaluationId,

      survey_version_id:
        effectiveSurveyVersionId,

      draft: {
        id: draft.id,

        survey_version_id:
          draft.survey_version_id,

        answers: draft.answers_json,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
      },
    };
  }

  /**
   * Load the current student's saved draft.
   *
   * The saved draft must belong to the same effective survey
   * version that the participant is currently allowed to answer.
   */
  async findMyDraft(
    evaluationId: bigint,
    studentId: bigint,
  ) {
    const {
      participant,
      effectiveSurveyVersionId,
    } =
      await this.studentAccess.getAnswerableEvaluation(
        evaluationId,
        studentId,
      );

    const draft =
      await this.prisma.assessment_drafts.findUnique({
        where: {
          participant_id: participant.id,
        },
      });

    if (!draft) {
      throw new NotFoundException(
        'No saved draft was found for this evaluation',
      );
    }

    /*
     * Do not silently reinterpret an old draft whose exact
     * version was never recorded.
     */
    if (draft.survey_version_id === null) {
      throw new ConflictException(
        'The saved draft was created before survey-version tracking and cannot be loaded automatically',
      );
    }

    /*
     * A participant may later become eligible for a newer version.
     * If that happens, the old draft must not be interpreted using
     * the newer question IDs/options.
     */
    if (
      draft.survey_version_id !==
      effectiveSurveyVersionId
    ) {
      throw new ConflictException(
        'The saved draft belongs to a different survey version and cannot be loaded automatically',
      );
    }

    return {
      evaluation_id: evaluationId,

      survey_version_id:
        effectiveSurveyVersionId,

      draft: {
        id: draft.id,

        survey_version_id:
          draft.survey_version_id,

        answers: draft.answers_json,
        created_at: draft.created_at,
        updated_at: draft.updated_at,
      },
    };
  }

  /**
   * Delete the current student's saved draft.
   *
   * Access is rechecked before deletion. Deleting the draft is
   * explicit; no version-update process silently removes it.
   */
  async remove(evaluationId: bigint, studentId: bigint) {
    return inSerializableTransaction(this.prisma, (db) =>
      new AssessmentDraftsService(db, this.studentAccess).removeInTransaction(
        evaluationId,
        studentId,
      ),
    );
  }

  private async removeInTransaction(
    evaluationId: bigint,
    studentId: bigint,
  ) {
    const { participant } =
      await this.studentAccess.getAnswerableEvaluation(
        evaluationId,
        studentId,
        this.prisma,
      );

    const result =
      await this.prisma.assessment_drafts.deleteMany({
        where: {
          participant_id: participant.id,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'No saved draft was found for this evaluation',
      );
    }

    return {
      evaluation_id: evaluationId,
      deleted: true,

      message:
        'Assessment draft deleted successfully.',
    };
  }

  /**
   * Validate only the answers that currently exist in the draft.
   *
   * Unlike final submission, this intentionally does NOT check
   * whether all required questions have been answered.
   */
  private validateDraftAnswers(
    questionList: QuestionWithOptions[],
    answers: DraftAnswerDto[],
  ): ValidatedDraftAnswer[] {
    const questionsById = new Map(
      questionList.map((question) => [
        question.id.toString(),
        question,
      ]),
    );

    const seenQuestionIds = new Set<string>();

    const validatedAnswers: ValidatedDraftAnswer[] =
      [];

    for (const answer of answers) {
      const questionId = BigInt(
        answer.question_id,
      ).toString();

      const question =
        questionsById.get(questionId);

      if (!question) {
        throw new BadRequestException(
          `Question ${answer.question_id} is not part of this survey`,
        );
      }

      if (seenQuestionIds.has(questionId)) {
        throw new BadRequestException(
          `Question ${answer.question_id} is answered more than once`,
        );
      }

      seenQuestionIds.add(questionId);

      switch (question.question_type) {
        case question_type.RATING:
          this.validateRatingDraft(
            question,
            answer,
          );
          break;

        case question_type.AGREEMENT:
        case question_type.FREQUENCY:
          this.validateFixedRatingDraft(
            question,
            answer,
          );
          break;

        case question_type.TEXT:
          this.validateTextDraft(
            question,
            answer,
          );
          break;

        case question_type.MULTIPLE_CHOICE:
        case question_type.CHECKBOX:
          this.validateOptionDraft(
            question,
            answer,
          );
          break;

        default:
          throw new BadRequestException(
            `Unsupported question type for question ${question.display_order}`,
          );
      }

      validatedAnswers.push(
        this.toValidatedDraftAnswer(
          question,
          answer,
        ),
      );
    }

    return validatedAnswers;
  }

  private validateRatingDraft(
    question: QuestionWithOptions,
    answer: DraftAnswerDto,
  ) {
    if (answer.text_value !== undefined) {
      throw new BadRequestException(
        `Question ${question.display_order} takes a rating, not text`,
      );
    }

    if (
      answer.selected_option_ids !== undefined
    ) {
      throw new BadRequestException(
        `Question ${question.display_order} takes a rating, not selected options`,
      );
    }

    if (answer.rating_value === undefined) {
      return;
    }

    const min = question.min_rating ?? 1;
    const max = question.max_rating ?? 5;

    if (
      answer.rating_value < min ||
      answer.rating_value > max
    ) {
      throw new BadRequestException(
        `Rating for question ${question.display_order} must be between ${min} and ${max}`,
      );
    }
  }

  private validateFixedRatingDraft(
    question: QuestionWithOptions,
    answer: DraftAnswerDto,
  ) {
    if (answer.text_value !== undefined) {
      throw new BadRequestException(
        `Question ${question.display_order} takes a rating, not text`,
      );
    }

    if (
      answer.selected_option_ids !== undefined
    ) {
      throw new BadRequestException(
        `Question ${question.display_order} takes a rating, not selected options`,
      );
    }

    if (answer.rating_value === undefined) {
      return;
    }

    if (
      answer.rating_value < 1 ||
      answer.rating_value > 5
    ) {
      throw new BadRequestException(
        `Rating for question ${question.display_order} must be between 1 and 5`,
      );
    }
  }

  private validateTextDraft(
    question: QuestionWithOptions,
    answer: DraftAnswerDto,
  ) {
    if (answer.rating_value !== undefined) {
      throw new BadRequestException(
        `Question ${question.display_order} takes text, not a rating`,
      );
    }

    if (
      answer.selected_option_ids !== undefined
    ) {
      throw new BadRequestException(
        `Question ${question.display_order} takes text, not selected options`,
      );
    }
  }

  private validateOptionDraft(
    question: QuestionWithOptions,
    answer: DraftAnswerDto,
  ) {
    if (answer.rating_value !== undefined) {
      throw new BadRequestException(
        `Question ${question.display_order} takes selected options, not a rating`,
      );
    }

    if (answer.text_value !== undefined) {
      throw new BadRequestException(
        `Question ${question.display_order} takes selected options, not text`,
      );
    }

    if (
      answer.selected_option_ids === undefined ||
      answer.selected_option_ids.length === 0
    ) {
      return;
    }

    if (
      question.question_type ===
        question_type.MULTIPLE_CHOICE &&
      answer.selected_option_ids.length !== 1
    ) {
      throw new BadRequestException(
        `Question ${question.display_order} allows exactly one option`,
      );
    }

    const validOptionIds = new Set(
      question.question_options.map((option) =>
        option.id.toString(),
      ),
    );

    for (const selectedOptionId of
      answer.selected_option_ids) {
      const normalizedId = BigInt(
        selectedOptionId,
      ).toString();

      if (!validOptionIds.has(normalizedId)) {
        throw new BadRequestException(
          `Option ${selectedOptionId} does not belong to question ${question.display_order}`,
        );
      }
    }
  }

  private toValidatedDraftAnswer(
    question: QuestionWithOptions,
    answer: DraftAnswerDto,
  ): ValidatedDraftAnswer {
    const result: ValidatedDraftAnswer = {
      question_id: question.id.toString(),
    };

    if (answer.rating_value !== undefined) {
      result.rating_value =
        answer.rating_value;
    }

    if (answer.text_value !== undefined) {
      result.text_value =
        answer.text_value.trim();
    }

    if (
      answer.selected_option_ids !== undefined
    ) {
      result.selected_option_ids =
        answer.selected_option_ids.map(
          (optionId) =>
            BigInt(optionId).toString(),
        );
    }

    return result;
  }
}
