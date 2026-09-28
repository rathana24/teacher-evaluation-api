import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { question_type, questions } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';
import {
  AnswerDto,
  SubmitResponseDto,
} from './dto/submit-response.dto';

type AnswerToSave = {
  question_id: bigint;
  rating_value: number | null;
  text_value: string | null;
  selected_option_ids: bigint[];
};

// Midnight UTC of today. Stored instead of the exact time so a participant row
// can never be matched to a response row by comparing timestamps.
function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

@Injectable()
export class SubmissionsService {
  constructor(
    private prisma: PrismaService,
    private studentAccess: StudentAccessService,
  ) {}

  async submit(
    evaluationId: bigint,
    studentId: bigint,
    dto: SubmitResponseDto,
  ) {
    // 1. Same eligibility rules as viewing the survey
    const { evaluation, participant } =
      await this.studentAccess.getAnswerableEvaluation(
        evaluationId,
        studentId,
      );

    // 2. Load all questions and their selectable options
    const questionList = await this.prisma.questions.findMany({
      where: {
        survey_version_id: evaluation.survey_version_id,
      },
      include: {
        question_options: true,
      },
    });

    // 3. Validate every answer before any write
    const answersToSave = this.buildAnswers(
      questionList,
      dto.answers,
    );

    // 4. All or nothing
    const day = startOfUtcDay(new Date());

    await this.prisma.$transaction(async (tx) => {
      // Re-check the evaluation is still open.
      const current = await tx.evaluations.findUnique({
        where: {
          id: evaluationId,
        },
        select: {
          status: true,
          start_at: true,
          end_at: true,
        },
      });

      const now = new Date();

      if (
        !current ||
        current.status !== 'OPEN' ||
        !current.start_at ||
        !current.end_at ||
        now < current.start_at ||
        now >= current.end_at
      ) {
        throw new ConflictException(
          'This evaluation is not open',
        );
      }

      // Mark as submitted ONLY if not already submitted.
      // This protects against double-clicks / concurrent submissions.
      const marked =
        await tx.evaluation_participants.updateMany({
          where: {
            id: participant.id,
            has_submitted: false,
          },
          data: {
            has_submitted: true,
            submitted_at: day,
          },
        });

      if (marked.count === 0) {
        throw new ConflictException(
          'You have already submitted this evaluation',
        );
      }

      // Anonymous response:
      // intentionally no student_id and no participant_id.
      const response = await tx.responses.create({
        data: {
          evaluation_id: evaluationId,
          submitted_at: day,
          created_at: day,
        },
      });

      /*
       * Create answers individually.
       *
       * We need each generated answer.id because MULTIPLE_CHOICE
       * and CHECKBOX selections reference it through answer_options.
       */
      for (const answerToSave of answersToSave) {
        const answer = await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: answerToSave.question_id,
            rating_value: answerToSave.rating_value,
            text_value: answerToSave.text_value,
            created_at: day,
          },
        });

        if (answerToSave.selected_option_ids.length > 0) {
          await tx.answer_options.createMany({
            data: answerToSave.selected_option_ids.map(
              (optionId) => ({
                answer_id: answer.id,
                option_id: optionId,
              }),
            ),
          });
        }
      }
    });

    return {
      evaluation_id: evaluationId,
      submitted: true,
      message: 'Evaluation submitted successfully.',
    };
  }

  private buildAnswers(
    questionList: Array<
      questions & {
        question_options: {
          id: bigint;
          question_id: bigint;
          option_text: string;
          display_order: number;
        }[];
      }
    >,
    answers: AnswerDto[],
  ): AnswerToSave[] {
    const byId = new Map(
      questionList.map((question) => [
        question.id.toString(),
        question,
      ]),
    );

    const seen = new Set<string>();
    const toSave: AnswerToSave[] = [];

    for (const answer of answers) {
      const key = BigInt(answer.question_id).toString();
      const question = byId.get(key);

      if (!question) {
        throw new BadRequestException(
          `Question ${answer.question_id} is not part of this survey`,
        );
      }

      if (seen.has(key)) {
        throw new BadRequestException(
          `Question ${answer.question_id} is answered more than once`,
        );
      }

      seen.add(key);

      switch (question.question_type) {
        case question_type.RATING:
          this.rejectTextAndOptions(answer, question.display_order);

          if (answer.rating_value === undefined) {
            break;
          }

          this.validateRating(
            question,
            answer.rating_value,
          );

          toSave.push({
            question_id: question.id,
            rating_value: answer.rating_value,
            text_value: null,
            selected_option_ids: [],
          });

          break;

        case question_type.AGREEMENT:
        case question_type.FREQUENCY:
          this.rejectTextAndOptions(answer, question.display_order);

          if (answer.rating_value === undefined) {
            break;
          }

          if (
            answer.rating_value < 1 ||
            answer.rating_value > 5
          ) {
            throw new BadRequestException(
              `Rating for question ${question.display_order} must be between 1 and 5`,
            );
          }

          toSave.push({
            question_id: question.id,
            rating_value: answer.rating_value,
            text_value: null,
            selected_option_ids: [],
          });

          break;

        case question_type.TEXT: {
          if (answer.rating_value !== undefined) {
            throw new BadRequestException(
              `Question ${question.display_order} takes text, not a rating`,
            );
          }

          if (answer.selected_option_ids !== undefined) {
            throw new BadRequestException(
              `Question ${question.display_order} takes text, not selected options`,
            );
          }

          const text = answer.text_value?.trim();

          // Empty optional text = unanswered.
          if (!text) {
            break;
          }

          toSave.push({
            question_id: question.id,
            rating_value: null,
            text_value: text,
            selected_option_ids: [],
          });

          break;
        }

        case question_type.MULTIPLE_CHOICE:
        case question_type.CHECKBOX: {
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

          const selected = answer.selected_option_ids;

          // No options = unanswered.
          if (!selected || selected.length === 0) {
            break;
          }

          const uniqueIds = new Set(
            selected.map((id) => BigInt(id).toString()),
          );

          if (uniqueIds.size !== selected.length) {
            throw new BadRequestException(
              `Question ${question.display_order} contains duplicate selected options`,
            );
          }

          if (
            question.question_type ===
              question_type.MULTIPLE_CHOICE &&
            selected.length !== 1
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

          const selectedIds = selected.map((id) => BigInt(id));

          for (const optionId of selectedIds) {
            if (!validOptionIds.has(optionId.toString())) {
              throw new BadRequestException(
                `Option ${optionId.toString()} does not belong to question ${question.display_order}`,
              );
            }
          }

          toSave.push({
            question_id: question.id,
            rating_value: null,
            text_value: null,
            selected_option_ids: selectedIds,
          });

          break;
        }

        default:
          throw new BadRequestException(
            `Unsupported question type for question ${question.display_order}`,
          );
      }
    }

    // Check all required questions after validating submitted answers.
    const answered = new Set(
      toSave.map((answer) =>
        answer.question_id.toString(),
      ),
    );

    const missing = questionList.filter(
      (question) =>
        question.is_required &&
        !answered.has(question.id.toString()),
    );

    if (missing.length > 0) {
      const numbers = missing
        .map((question) => question.display_order)
        .join(', ');

      throw new BadRequestException(
        `Required question(s) not answered: ${numbers}`,
      );
    }

    return toSave;
  }

  private validateRating(
    question: questions,
    ratingValue: number,
  ) {
    const min = question.min_rating ?? 1;
    const max = question.max_rating ?? 5;

    if (ratingValue < min || ratingValue > max) {
      throw new BadRequestException(
        `Rating for question ${question.display_order} must be between ${min} and ${max}`,
      );
    }
  }

  private rejectTextAndOptions(
    answer: AnswerDto,
    displayOrder: number,
  ) {
    if (answer.text_value !== undefined) {
      throw new BadRequestException(
        `Question ${displayOrder} takes a rating, not text`,
      );
    }

    if (answer.selected_option_ids !== undefined) {
      throw new BadRequestException(
        `Question ${displayOrder} takes a rating, not selected options`,
      );
    }
  }
}