import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import {
  StudentAccessService,
  studentAnswerabilityReasons,
} from './student-access.service';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// Synthetic display example; IDs remain strings in HTTP responses.
const studentEvaluationExample = {
  id: '20',
  status: 'OPEN',
  answerable: true,
  answerability_reason: null,
  start_at: '2026-10-01T00:00:00.000Z',
  end_at: '2026-10-31T00:00:00.000Z',
  course: { code: 'DEMO101', name: 'Demonstration Course' },
  section_code: 'A',
  class_type: 'TP',
  semester: {
    name: 'Semester 2',
    semester_number: 2,
    academic_year_id: '10',
    academic_year: '2026-2027',
    start_year: 2026,
    is_active: true,
  },
  lecturer: { full_name: 'Demonstration Lecturer' },
  survey: { title: 'Teaching Evaluation', version_no: 2 },
  assigned_survey: { title: 'Teaching Evaluation', version_no: 1 },
};

const answerabilityDescription =
  ' answerable is the current access decision; answerability_reason is null when allowed or one of: ' +
  studentAnswerabilityReasons.join(', ') +
  '. It reports the first failed gate: active profile, placement, evaluation lifecycle/schedule, then completion. History status and enrolled-participant scope are preserved. This is an advisory snapshot; survey/draft/submission requests recheck permissions.';

@ApiTags('student')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('STUDENT')
@Controller('student/evaluations')
export class StudentAccessController {
  constructor(private readonly studentAccessService: StudentAccessService) {}

  // =========================================================
  // AVAILABLE EVALUATIONS
  // =========================================================

  @Get()
  @ApiOperation({
    summary: 'Evaluations I can answer right now',
  })
  @ApiResponse({
    status: 200,
    description:
      'Available evaluations returned successfully. survey contains the participant effective questionnaire title/version_no; assigned_survey retains the original evaluation questionnaire descriptor. A legacy NULL participant version falls back to the assigned version. class_type (COURSE/TD/TP or null), semester.semester_number (number or null), semester.start_year (number or null) and semester.is_active (boolean) expose stored academic context without inferring from labels. The active flag describes the academic year, not answerability. Questionnaire and offering internal IDs are not added to list items.' +
      answerabilityDescription,
    schema: { example: [studentEvaluationExample] },
  })
  findAvailable(
    @CurrentUser()
    currentUser: {
      id: bigint;
    },
  ) {
    return this.studentAccessService.findAvailable(currentUser.id);
  }

  // =========================================================
  // EVALUATION HISTORY
  // Static route must stay before :id routes
  // =========================================================

  @Get('history')
  @ApiOperation({
    summary:
      'My evaluation history, including completed, upcoming, and closed evaluations',
  })
  @ApiResponse({
    status: 200,
    description:
      'Student evaluation history returned successfully. survey describes the participant questionnaire version, including completed assignments; assigned_survey describes the original evaluation version. Legacy NULL pins use the original version. Stored class_type, semester.semester_number and semester.start_year preserve null when unknown; semester.is_active is the academic-year boolean, not answerability. Existing completion and history status fields are unchanged.' +
      answerabilityDescription,
    schema: {
      example: [
        {
          ...studentEvaluationExample,
          has_submitted: false,
          submitted_at: null,
          history_status: 'Not Started',
        },
        {
          ...studentEvaluationExample,
          id: '21',
          answerable: false,
          answerability_reason: 'PAUSED',
          has_submitted: false,
          submitted_at: null,
          history_status: 'Not Started',
        },
      ],
    },
  })
  findHistory(
    @CurrentUser()
    currentUser: {
      id: bigint;
    },
  ) {
    return this.studentAccessService.findHistory(currentUser.id);
  }

  // =========================================================
  // SURVEY
  // =========================================================

  @Get(':id/survey')
  @ApiOperation({
    summary: 'Course context and questions for an evaluation I can answer',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluation survey returned successfully. evaluation.survey title/version_no describes the same effective participant version as survey_version_id and questions. evaluation.assigned_survey retains the evaluation base descriptor. A newer version does not change a legacy NULL pin. evaluation includes stored nullable class_type, semester.semester_number and semester.start_year, plus the academic-year boolean semester.is_active. This metadata read does not rewrite assignments, questions, drafts or responses.' +
      answerabilityDescription,
    schema: {
      example: {
        evaluation: studentEvaluationExample,
        survey_version_id: '9',
        participant_survey_version_id: '9',
        questions: [
          {
            id: '31',
            question_text: 'The lecturer explains clearly.',
            question_text_km: null,
            question_type: 'RATING',
            category: null,
            is_required: true,
            min_rating: 1,
            max_rating: 5,
            display_order: 1,
            question_options: [],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Not eligible (not a participant or not enrolled)',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Not open right now, or already submitted',
  })
  getSurvey(
    @Param('id', ParseBigIntPipe)
    id: bigint,

    @CurrentUser()
    currentUser: { id: bigint },
  ) {
    return this.studentAccessService.getSurvey(id, currentUser.id);
  }

  // =========================================================
  // SUBMISSION STATUS
  // =========================================================

  @Get(':id/submission-status')
  @ApiOperation({
    summary: 'Whether I have already submitted this evaluation',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission status returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Not a participant',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
  })
  getSubmissionStatus(
    @Param('id', ParseBigIntPipe)
    id: bigint,

    @CurrentUser()
    currentUser: { id: bigint },
  ) {
    return this.studentAccessService.getSubmissionStatus(id, currentUser.id);
  }
}
