import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  progressionStudentSelect,
  resolveStudentPlacement,
} from '../common/utils/student-placement.util';
import { PrismaService } from '../prisma/prisma.service';

// Display metadata only: list responses do not expose questionnaire internal IDs.
const surveyDescriptorSelect = {
  version_no: true,
  surveys: { select: { title: true } },
} satisfies Prisma.survey_versionsSelect;

// Only what a student needs to see about an evaluation
const contextSelect = {
  id: true,
  status: true,
  start_at: true,
  end_at: true,
  survey_version_id: true,
  course_offering_id: true,

  course_offerings: {
    select: {
      section_code: true,
      class_type: true,

      courses: {
        select: {
          course_code: true,
          course_name: true,
        },
      },

      semesters: {
        select: {
          semester_name: true,
          semester_number: true,
          academic_year_id: true,

          academic_years: {
            select: {
              id: true,
              name: true,
              start_year: true,
              is_active: true,
            },
          },
        },
      },

      users: {
        select: {
          full_name: true,
        },
      },
    },
  },

  survey_versions: {
    select: surveyDescriptorSelect,
  },
} satisfies Prisma.evaluationsSelect;

type EvaluationContext = Prisma.evaluationsGetPayload<{
  select: typeof contextSelect;
}>;

type PlacementStudent = Prisma.studentsGetPayload<{
  select: typeof progressionStudentSelect;
}>;

export const studentAnswerabilityReasons = [
  'INACTIVE_STUDENT',
  'PROGRESSION_CHRONOLOGY_UNAVAILABLE',
  'COHORT_HISTORY_UNAVAILABLE',
  'PAUSED',
  'MISSING_YEARLY_GROUP',
  'YEAR_LEVEL_UNAVAILABLE',
  'EVALUATION_NOT_OPEN',
  'EVALUATION_UNSCHEDULED',
  'EVALUATION_NOT_STARTED',
  'EVALUATION_ENDED',
  'ALREADY_SUBMITTED',
] as const;

type AnswerabilityReason = (typeof studentAnswerabilityReasons)[number];
type Answerability =
  | { answerable: true; answerability_reason: null }
  | { answerable: false; answerability_reason: AnswerabilityReason };

// What the student needs to render each question.
// question_options are used by MULTIPLE_CHOICE and CHECKBOX.
const questionSelect = {
  id: true,
  question_text: true,
  question_text_km: true,
  question_type: true,
  category: true,
  is_required: true,
  min_rating: true,
  max_rating: true,
  display_order: true,

  question_options: {
    select: {
      id: true,
      option_text: true,
      display_order: true,
    },

    orderBy: {
      display_order: 'asc',
    },
  },
} satisfies Prisma.questionsSelect;

// Build the clean object sent to the student
function toSummary(e: EvaluationContext, effectiveSurvey = e.survey_versions) {
  return {
    id: e.id,
    status: e.status,
    start_at: e.start_at,
    end_at: e.end_at,

    course: {
      code: e.course_offerings.courses.course_code,
      name: e.course_offerings.courses.course_name,
    },

    section_code: e.course_offerings.section_code,
    class_type: e.course_offerings.class_type,

    semester: {
      name: e.course_offerings.semesters.semester_name,
      semester_number: e.course_offerings.semesters.semester_number,

      academic_year_id: e.course_offerings.semesters.academic_year_id,

      academic_year: e.course_offerings.semesters.academic_years.name,
      start_year: e.course_offerings.semesters.academic_years.start_year,
      is_active: e.course_offerings.semesters.academic_years.is_active,
    },

    lecturer: {
      full_name: e.course_offerings.users.full_name,
    },

    survey: {
      title: effectiveSurvey.surveys.title,
      version_no: effectiveSurvey.version_no,
    },

    assigned_survey: {
      title: e.survey_versions.surveys.title,

      version_no: e.survey_versions.version_no,
    },
  };
}

@Injectable()
export class StudentAccessService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // AVAILABLE EVALUATIONS
  // =========================================================

  async findAvailable(studentId: bigint) {
    const now = new Date();

    const rows = await this.prisma.evaluation_participants.findMany({
      where: {
        student_id: studentId,
        has_submitted: false,

        evaluations: {
          status: 'OPEN',

          start_at: {
            lte: now,
          },

          end_at: {
            gt: now,
          },

          course_offerings: {
            enrollments: {
              some: {
                student_id: studentId,
              },
            },
          },
        },
      },

      select: {
        has_submitted: true,
        survey_versions: { select: surveyDescriptorSelect },
        evaluations: {
          select: contextSelect,
        },
      },

      orderBy: {
        evaluations: {
          end_at: 'asc',
        },
      },
    });

    const student = await this.findPlacementStudent(studentId, this.prisma);
    return rows
      .map((row) => ({
        ...toSummary(
          row.evaluations,
          row.survey_versions ?? row.evaluations.survey_versions,
        ),
        ...this.answerabilityFor(
          row.evaluations,
          row.has_submitted,
          student,
          now,
        ),
      }))
      .filter((row) => row.answerable);
  }

  // =========================================================
  // EVALUATION HISTORY
  // =========================================================

  async findHistory(studentId: bigint) {
    const now = new Date();

    const rows = await this.prisma.evaluation_participants.findMany({
      where: {
        student_id: studentId,

        evaluations: {
          course_offerings: {
            enrollments: {
              some: {
                student_id: studentId,
              },
            },
          },
        },
      },

      select: {
        has_submitted: true,
        submitted_at: true,
        survey_versions: { select: surveyDescriptorSelect },

        evaluations: {
          select: contextSelect,
        },
      },

      orderBy: {
        evaluations: {
          start_at: 'desc',
        },
      },
    });

    // One placement lookup per request; never one access query per history item.
    const student = await this.findPlacementStudent(studentId, this.prisma);
    return rows.map((row) => {
      const evaluation = row.evaluations;

      let historyStatus: 'Not Started' | 'Completed' | 'Upcoming' | 'Closed';

      // Student already submitted this evaluation
      if (row.has_submitted) {
        historyStatus = 'Completed';
      }

      // Evaluation has not started yet
      else if (evaluation.start_at !== null && evaluation.start_at > now) {
        historyStatus = 'Upcoming';
      }

      // Evaluation is currently open,
      // but student has not submitted yet
      else if (
        evaluation.status === 'OPEN' &&
        evaluation.start_at !== null &&
        evaluation.end_at !== null &&
        evaluation.start_at <= now &&
        now < evaluation.end_at
      ) {
        historyStatus = 'Not Started';
      }

      // Evaluation is no longer answerable
      else {
        historyStatus = 'Closed';
      }

      return {
        ...toSummary(
          evaluation,
          row.survey_versions ?? evaluation.survey_versions,
        ),
        ...this.answerabilityFor(evaluation, row.has_submitted, student, now),

        has_submitted: row.has_submitted,

        submitted_at: row.submitted_at,

        history_status: historyStatus,
      };
    });
  }

  // =========================================================
  // SURVEY
  // =========================================================

  async getSurvey(evaluationId: bigint, studentId: bigint) {
    const { evaluation, participant, effectiveSurveyVersionId } =
      await this.getAnswerableEvaluation(evaluationId, studentId);

    const questions = await this.prisma.questions.findMany({
      where: {
        survey_version_id: effectiveSurveyVersionId,
      },

      select: questionSelect,

      orderBy: {
        display_order: 'asc',
      },
    });

    return {
      evaluation: {
        ...toSummary(
          evaluation,
          participant.survey_versions ?? evaluation.survey_versions,
        ),
        // The shared gate above authorizes this read; later writes recheck it.
        answerable: true,
        answerability_reason: null,
      },

      survey_version_id: effectiveSurveyVersionId,

      participant_survey_version_id: participant.survey_version_id,

      questions,
    };
  }

  // =========================================================
  // SUBMISSION STATUS
  // =========================================================

  async getSubmissionStatus(evaluationId: bigint, studentId: bigint) {
    await this.findEvaluation(evaluationId);

    const participant = await this.prisma.evaluation_participants.findFirst({
      where: {
        evaluation_id: evaluationId,

        student_id: studentId,
      },

      select: {
        survey_version_id: true,
        has_submitted: true,
        submitted_at: true,
      },
    });

    if (!participant) {
      throw new ForbiddenException('You are not eligible for this evaluation');
    }

    return {
      evaluation_id: evaluationId,

      survey_version_id: participant.survey_version_id,

      has_submitted: participant.has_submitted,

      submitted_at: participant.submitted_at,
    };
  }

  // =========================================================
  // ANSWERABLE EVALUATION CHECK
  // =========================================================

  // The single place that decides:
  // "May this student answer this evaluation right now?"
  //
  // Also used by Submission and Drafts.
  async getAnswerableEvaluation(
    evaluationId: bigint,
    studentId: bigint,
    database: PrismaService = this.prisma,
  ) {
    const evaluation = await this.findEvaluation(evaluationId, database);

    const [participant, enrollment] = await Promise.all([
      database.evaluation_participants.findFirst({
        where: {
          evaluation_id: evaluationId,

          student_id: studentId,
        },

        select: {
          id: true,
          evaluation_id: true,
          student_id: true,
          survey_version_id: true,
          survey_versions: { select: surveyDescriptorSelect },
          has_submitted: true,
          submitted_at: true,
          created_at: true,
        },
      }),

      database.enrollments.findFirst({
        where: {
          student_id: studentId,

          course_offering_id: evaluation.course_offering_id,
        },

        select: {
          id: true,
        },
      }),
    ]);

    if (!participant || !enrollment) {
      throw new ForbiddenException('You are not eligible for this evaluation');
    }

    const student = await this.findPlacementStudent(studentId, database);
    const answerability = this.answerabilityFor(
      evaluation,
      participant.has_submitted,
      student,
      new Date(),
    );
    if (!answerability.answerable) {
      // Preserve existing HTTP statuses, messages and gate precedence.
      switch (answerability.answerability_reason) {
        case 'INACTIVE_STUDENT':
          throw new ForbiddenException('You are not an active student');
        case 'PROGRESSION_CHRONOLOGY_UNAVAILABLE':
          throw new ForbiddenException(
            'Student progression chronology requires administrator review',
          );
        case 'PAUSED':
          throw new ForbiddenException(
            'Student is paused; explicit resumption is required',
          );
        case 'COHORT_HISTORY_UNAVAILABLE':
          throw new ForbiddenException({
            code: 'COHORT_HISTORY_UNAVAILABLE',
            message: 'Student yearly cohort history requires administrator review',
          });
        case 'MISSING_YEARLY_GROUP':
        case 'YEAR_LEVEL_UNAVAILABLE':
          throw new ForbiddenException(
            'A class group assignment is required for this academic year',
          );
        case 'ALREADY_SUBMITTED':
          throw new ConflictException(
            'You have already submitted this evaluation',
          );
        default:
          throw new ConflictException('This evaluation is not open');
      }
    }

    // New participants are pinned to their own survey version.
    // Historical participants created before this field existed
    // may still have NULL, so they safely fall back to the
    // evaluation's original/base survey version.
    const effectiveSurveyVersionId =
      participant.survey_version_id ?? evaluation.survey_version_id;

    return {
      evaluation,
      participant,
      effectiveSurveyVersionId,
    };
  }

  // =========================================================
  // INTERNAL HELPERS
  // =========================================================

  private async findEvaluation(
    evaluationId: bigint,
    database: PrismaService = this.prisma,
  ) {
    const evaluation = await database.evaluations.findUnique({
      where: {
        id: evaluationId,
      },

      select: contextSelect,
    });

    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }

    return evaluation;
  }

  private async findPlacementStudent(
    studentId: bigint,
    database: PrismaService,
  ) {
    return database.students.findFirst({
      where: {
        user_id: studentId,
        users: { role: 'STUDENT', status: 'ACTIVE' },
      },
      select: progressionStudentSelect,
    });
  }

  private answerabilityFor(
    evaluation: EvaluationContext,
    hasSubmitted: boolean,
    student: PlacementStudent | null,
    now: Date,
  ): Answerability {
    const blocked = (reason: AnswerabilityReason): Answerability => ({
      answerable: false,
      answerability_reason: reason,
    });
    if (!student) return blocked('INACTIVE_STUDENT');
    const placement = resolveStudentPlacement(
      student.student_generations,
      student.student_academic_records,
      evaluation.course_offerings.semesters.academic_years,
      student.generation_id,
    );
    if (!placement.placement_eligible) {
      if (placement.progression_status === 'UNRESOLVED')
        return blocked('PROGRESSION_CHRONOLOGY_UNAVAILABLE');
      if (placement.progression_status === 'PAUSED') return blocked('PAUSED');
      if (placement.cohort_context.availability === 'UNAVAILABLE')
        return blocked('COHORT_HISTORY_UNAVAILABLE');
      return blocked(
        placement.ineligibility_reason === 'YEAR_LEVEL_UNAVAILABLE'
          ? 'YEAR_LEVEL_UNAVAILABLE'
          : 'MISSING_YEARLY_GROUP',
      );
    }
    if (evaluation.status !== 'OPEN') return blocked('EVALUATION_NOT_OPEN');
    if (evaluation.start_at === null || evaluation.end_at === null)
      return blocked('EVALUATION_UNSCHEDULED');
    if (now < evaluation.start_at) return blocked('EVALUATION_NOT_STARTED');
    if (now >= evaluation.end_at) return blocked('EVALUATION_ENDED');
    if (hasSubmitted) return blocked('ALREADY_SUBMITTED');
    return { answerable: true, answerability_reason: null };
  }
}
