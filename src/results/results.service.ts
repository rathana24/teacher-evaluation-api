import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // ADMIN - ALL RESULTS
  // =========================================================

  async getAdminResults() {
    const evaluations =
      await this.prisma.evaluations.findMany({
        include: this.evaluationInclude(),

        orderBy: {
          created_at: 'desc',
        },
      });

    return evaluations.map((evaluation) =>
      this.buildEvaluationResult(evaluation),
    );
  }

  // =========================================================
  // ADMIN - RESULTS FOR ONE LECTURER
  // =========================================================

  async getAdminResultsByLecturer(
    lecturerId: bigint,
  ) {
    const lecturer =
      await this.prisma.users.findFirst({
        where: {
          id: lecturerId,
          role: 'LECTURER',
        },

        select: {
          id: true,
          full_name: true,
          email: true,
        },
      });

    if (!lecturer) {
      throw new NotFoundException(
        'Lecturer not found',
      );
    }

    const evaluations =
      await this.prisma.evaluations.findMany({
        where: {
          course_offerings: {
            lecturer_id: lecturerId,
          },
        },

        include: this.evaluationInclude(),

        orderBy: {
          created_at: 'desc',
        },
      });

    return {
      lecturer: {
        id: lecturer.id,
        full_name: lecturer.full_name,
        email: lecturer.email,
      },

      evaluations: evaluations.map(
        (evaluation) =>
          this.buildEvaluationResult(
            evaluation,
          ),
      ),
    };
  }

  // =========================================================
  // LECTURER - OWN RESULTS
  // =========================================================

  async getLecturerResults(
    lecturerId: bigint,
  ) {
    const lecturer =
      await this.prisma.users.findFirst({
        where: {
          id: lecturerId,
          role: 'LECTURER',
        },

        select: {
          id: true,
          full_name: true,
          email: true,
        },
      });

    if (!lecturer) {
      throw new NotFoundException(
        'Lecturer not found',
      );
    }

    const evaluations =
      await this.prisma.evaluations.findMany({
        where: {
          course_offerings: {
            lecturer_id: lecturerId,
          },
        },

        include: this.evaluationInclude(),

        orderBy: {
          created_at: 'desc',
        },
      });

    return {
      lecturer: {
        id: lecturer.id,
        full_name: lecturer.full_name,
        email: lecturer.email,
      },

      evaluations: evaluations.map(
        (evaluation) =>
          this.buildEvaluationResult(
            evaluation,
          ),
      ),
    };
  }

  // =========================================================
  // PRISMA INCLUDE
  // =========================================================

  private evaluationInclude() {
    return {
      course_offerings: {
        include: {
          courses: {
            include: {
              departments: true,
            },
          },

          users: {
            select: {
              id: true,
              full_name: true,
              email: true,
            },
          },

          semesters: {
            include: {
              academic_years: true,
            },
          },
        },
      },

      survey_versions: {
        include: {
          surveys: true,

          questions: {
            include: {
              question_options: {
                orderBy: {
                  display_order:
                    'asc' as const,
                },
              },
            },

            orderBy: {
              display_order:
                'asc' as const,
            },
          },
        },
      },

      responses: {
        include: {
          answers: {
            include: {
              answer_options: {
                include: {
                  question_options:
                    true,
                },
              },
            },
          },
        },
      },

      _count: {
        select: {
          evaluation_participants:
            true,
          responses: true,
        },
      },
    };
  }

  // =========================================================
  // BUILD ONE EVALUATION RESULT
  // =========================================================

  private buildEvaluationResult(
    evaluation: any,
  ) {
    const offering =
      evaluation.course_offerings;

    const semester =
      offering.semesters;

    const questions =
      evaluation.survey_versions
        .questions;

    const responses =
      evaluation.responses;

    return {
      evaluation: {
        id: evaluation.id,

        status:
          evaluation.status,

        start_at:
          evaluation.start_at,

        end_at:
          evaluation.end_at,
      },

      lecturer: {
        id:
          offering.users.id,

        full_name:
          offering.users.full_name,

        email:
          offering.users.email,
      },

      course: {
        id:
          offering.courses.id,

        code:
          offering.courses
            .course_code,

        name:
          offering.courses
            .course_name,

        section_code:
          offering.section_code,
      },

      department: {
        id:
          offering.courses
            .departments.id,

        code:
          offering.courses
            .departments.code,

        name:
          offering.courses
            .departments.name,
      },

      semester: {
        id:
          semester.id,

        name:
          semester.semester_name,

        academic_year: {
          id:
            semester.academic_years.id,

          name:
            semester.academic_years
              .name,
        },
      },

      survey: {
        id:
          evaluation.survey_versions
            .survey_id,

        title:
          evaluation.survey_versions
            .surveys.title,

        version_id:
          evaluation.survey_versions
            .id,

        version_no:
          evaluation.survey_versions
            .version_no,
      },

      participant_count:
        evaluation._count
          .evaluation_participants,

      submission_count:
        evaluation._count.responses,

      response_rate:
        this.calculateResponseRate(
          evaluation._count.responses,
          evaluation._count
            .evaluation_participants,
        ),

      questions:
        questions.map(
          (question: any) =>
            this.buildQuestionResult(
              question,
              responses,
            ),
        ),
    };
  }

  // =========================================================
  // BUILD QUESTION RESULT
  // =========================================================

  private buildQuestionResult(
    question: any,
    responses: any[],
  ) {
    /*
     * Get all anonymous answers for this question.
     *
     * We intentionally do not return:
     * - student_id
     * - participant_id
     * - response_id
     * - student name
     * - student email
     */
    const answers =
      responses.flatMap(
        (response: any) =>
          response.answers.filter(
            (answer: any) =>
              answer.question_id ===
              question.id,
          ),
      );

    const base = {
      question_id:
        question.id,

      question_text:
        question.question_text,

      question_text_km:
        question.question_text_km,

      question_type:
        question.question_type,

      category:
        question.category,

      display_order:
        question.display_order,

      answer_count:
        answers.length,
    };

    // =====================================================
    // RATING / AGREEMENT / FREQUENCY
    // =====================================================

    if (
      question.question_type ===
        'RATING' ||
      question.question_type ===
        'AGREEMENT' ||
      question.question_type ===
        'FREQUENCY'
    ) {
      const ratings: number[] =
        answers
          .map(
            (answer: any) =>
              answer.rating_value,
          )
          .filter(
            (
              value: number | null,
            ): value is number =>
              value !== null,
          );

      const average =
        ratings.length > 0
          ? ratings.reduce(
              (
                sum: number,
                value: number,
              ) => sum + value,
              0,
            ) / ratings.length
          : null;

      const distribution:
        Record<string, number> = {};

      /*
       * RATING, AGREEMENT and FREQUENCY
       * should have min/max values.
       *
       * We initialize every possible value
       * so the frontend can display zero-count
       * values too.
       */
      if (
        question.min_rating !==
          null &&
        question.max_rating !==
          null
      ) {
        for (
          let value =
            question.min_rating;
          value <=
          question.max_rating;
          value++
        ) {
          distribution[
            value.toString()
          ] = 0;
        }
      }

      for (const rating of ratings) {
        const key =
          rating.toString();

        distribution[key] =
          (distribution[key] ??
            0) + 1;
      }

      return {
        ...base,

        min_rating:
          question.min_rating,

        max_rating:
          question.max_rating,

        average:
          average === null
            ? null
            : Number(
                average.toFixed(2),
              ),

        distribution,
      };
    }

    // =====================================================
    // TEXT
    // =====================================================

    if (
      question.question_type ===
      'TEXT'
    ) {
      /*
       * Return anonymous written feedback.
       *
       * No student or response identity
       * is attached to each comment.
       */
      const feedback: string[] =
        answers
          .map(
            (answer: any) =>
              answer.text_value,
          )
          .filter(
            (
              value: string | null,
            ): value is string =>
              value !== null &&
              value.trim().length >
                0,
          );

      return {
        ...base,

        feedback,
      };
    }

    // =====================================================
    // MULTIPLE CHOICE / CHECKBOX
    // =====================================================

    if (
      question.question_type ===
        'MULTIPLE_CHOICE' ||
      question.question_type ===
        'CHECKBOX'
    ) {
      const options =
        question.question_options.map(
          (option: any) => {
            let count = 0;

            for (
              const answer of answers
            ) {
              const selected =
                answer.answer_options.some(
                  (
                    answerOption: any,
                  ) =>
                    answerOption
                      .option_id ===
                    option.id,
                );

              if (selected) {
                count++;
              }
            }

            return {
              option_id:
                option.id,

              option_text:
                option.option_text,

              display_order:
                option.display_order,

              count,
            };
          },
        );

      return {
        ...base,

        options,
      };
    }

    // =====================================================
    // FALLBACK
    // =====================================================

    return base;
  }

  // =========================================================
  // RESPONSE RATE
  // =========================================================

  private calculateResponseRate(
    submissionCount: number,
    participantCount: number,
  ) {
    if (
      participantCount === 0
    ) {
      return 0;
    }

    return Number(
      (
        (submissionCount /
          participantCount) *
        100
      ).toFixed(2),
    );
  }
}