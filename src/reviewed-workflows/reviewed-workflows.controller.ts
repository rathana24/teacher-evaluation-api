import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { BulkUpdateStudentGroupDto } from '../students/dto/bulk-update-student-group.dto';
import {
  CreateEvaluationReviewDto,
  OpeningReviewConfirmationDto,
  PlacementReviewConfirmationDto,
  ReviewConfirmationDto,
} from './review.dto';
import { ReviewedWorkflowsService } from './reviewed-workflows.service';
import { capturedTargetLabelExample } from '../common/swagger/target-label.example';

const reviewExample = {
  review_id: '40aa52de-b777-4e6d-a508-c117f98b8c1a',
  expires_at: '2026-10-07T12:15:00.000Z',
};
const receiptExample = {
  review_id: reviewExample.review_id,
  already_applied: false,
};

@ApiTags('reviewed-workflows')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@ApiResponse({
  status: 400,
  description: 'Invalid input or required review missing',
})
@ApiResponse({ status: 401, description: 'Authentication required' })
@ApiResponse({ status: 403, description: 'ADMIN role required' })
@ApiResponse({
  status: 404,
  description: 'Resource or caller-owned review not found',
})
@ApiResponse({
  status: 409,
  description:
    'REVIEW_EXPIRED, REVIEW_STALE, REVIEW_INPUT_MISMATCH, REVIEW_OPERATION_MISMATCH, or atomic write conflict. Preview again; no partial writes.',
  schema: {
    example: {
      code: 'REVIEW_STALE',
      message: 'Reviewed context or impact changed. Preview again.',
    },
  },
})
@Controller()
export class ReviewedWorkflowsController {
  constructor(private readonly workflows: ReviewedWorkflowsService) {}

  @Post('evaluations/create-preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Review full evaluation creation',
    description:
      'Validates explicit latest survey_version_id, schedule, participant selection and target_labels displayed at review. Returns exact account IDs, review_id and 15-minute expiry. A selected generation/major/year label change requires fresh review. Changes only administrative review storage; labels are captured at confirmation. Confirm with POST /evaluations, original input, confirmed_student_ids and review_id; do not echo target_labels as request data.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Creation selection and impact with caller-bound review_id and expires_at',
    schema: {
      example: {
        ...reviewExample,
        course_offering_id: '15',
        target_labels: {
          generations: [],
          groups: [
            {
              class_group: 'A',
              historical_labels: capturedTargetLabelExample.historical_labels,
            },
          ],
        },
        survey_version_id: '9',
        participant_scope: 'ALL_ENROLLED',
        generation_ids: [],
        group_scope: {
          academic_year_id: '1',
          generation_id: '2',
          major_id: '3',
          year_level: 2,
          class_groups: ['A'],
        },
        start_at: '2026-10-07T12:00:00.000Z',
        end_at: '2026-10-14T12:00:00.000Z',
        enrolled_count: 2,
        eligible_count: 2,
        ineligible_count: 0,
        confirmed_student_ids: ['101', '102'],
        eligible_students: [
          {
            user_id: '101',
            student_id: '11',
            effective_year_level: 2,
            placement_major_id: '3',
            class_group: 'A',
          },
        ],
      },
    },
  })
  previewCreate(
    @Body() dto: CreateEvaluationReviewDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.previewCreate(dto, actor);
  }

  @Post('students/bulk/class-group/preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Review selected-year bulk group placement',
    description:
      'student_ids are PROFILE IDs. Shows current/proposed groups and enrollment/frozen-participant/draft/completion impact counts. Changes no placement/history.',
  })
  @ApiResponse({
    status: 200,
    description: 'Placement impact and 15-minute caller-bound review',
    schema: {
      example: {
        ...reviewExample,
        academic_year_id: '2',
        student_ids: ['11'],
        class_group: 'B',
        proposed_updated_count: 1,
        placements: [
          { student_id: '11', from_class_group: 'A', to_class_group: 'B' },
        ],
        impact: {
          enrollment_count: 1,
          frozen_participant_count: 1,
          draft_count: 0,
          submitted_count: 0,
        },
      },
    },
  })
  previewPlacement(
    @Body() dto: BulkUpdateStudentGroupDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.previewPlacement(dto, actor);
  }

  @Post('students/bulk/class-group/confirm')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confirm exactly reviewed group placements',
    description:
      'Requires identical academic_year_id, profile student_ids and class_group plus review_id. First confirmation validates context/impact in the write transaction. Completed retry returns original counts with already_applied=true, without repeating placement changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Original placement result plus review_id and already_applied',
    schema: {
      example: {
        ...receiptExample,
        academic_year_id: '2',
        class_group: 'B',
        updated_student_ids: ['11'],
        updated_count: 1,
        complete: true,
      },
    },
  })
  confirmPlacement(
    @Body() dto: PlacementReviewConfirmationDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.confirmPlacement(dto, actor);
  }

  @Post('evaluations/:id/open/preview')
  @HttpCode(200)
  @ApiParam({ name: 'id', type: String, example: '20' })
  @ApiOperation({
    summary: 'Review opening the assigned questionnaire version',
    description:
      'Shows assigned and current latest version. Requires DRAFT, usable assigned questions, valid dates and frozen participants. Whole-set archive continuity is retained; an archived version is rejected.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Assigned/latest versions, frozen participant count and 15-minute review',
    schema: {
      example: {
        ...reviewExample,
        evaluation_id: '20',
        assigned_survey_id: '7',
        assigned_survey_version_id: '8',
        latest_survey_version_id: '9',
        can_retain_assigned_version: true,
        blocking_reasons: [],
        frozen_participant_count: 2,
        start_at: '2026-10-07T12:00:00.000Z',
        end_at: '2026-10-14T12:00:00.000Z',
      },
    },
  })
  previewOpening(
    @Param('id', ParseBigIntPipe) evaluationId: bigint,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.previewOpening(evaluationId, actor);
  }

  @Post('evaluations/:id/open/confirm')
  @HttpCode(200)
  @ApiParam({ name: 'id', type: String, example: '20' })
  @ApiOperation({
    summary: 'Intentionally open the reviewed assigned version',
    description:
      'Explicit RETAIN_ASSIGNED_VERSION decision and matching retain_assigned_version_id required. Rechecks all normal opening rules and reviewed state. Preserves assigned questions/frozen membership; no force flag. Retry returns original result without reopening a later CLOSED evaluation.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Original opened evaluation plus review_id and already_applied',
    schema: {
      example: {
        ...receiptExample,
        id: '20',
        course_offering_id: '15',
        survey_version_id: '8',
        status: 'OPEN',
      },
    },
  })
  confirmOpening(
    @Param('id', ParseBigIntPipe) evaluationId: bigint,
    @Body() dto: OpeningReviewConfirmationDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.confirmOpening(evaluationId, dto, actor);
  }

  @Post('surveys/:surveyId/versions/:versionId/apply-to-unfinished/preview')
  @HttpCode(200)
  @ApiParam({ name: 'surveyId', type: String, example: '7' })
  @ApiParam({ name: 'versionId', type: String, example: '9' })
  @ApiOperation({
    summary: 'Review latest-version application impact',
    description:
      'ADMIN only. Same-set latest only; per-evaluation and overall proposed moved/skipped totals with submitted/protected_draft/already_on_target reasons. Never exposes anonymous answers or response-to-student linkage. Captures exact affected participants server-side.',
  })
  @ApiResponse({
    status: 200,
    description: 'Proposed impact, skipped_reasons, review_id and expires_at',
    schema: {
      example: {
        ...reviewExample,
        survey_id: '7',
        survey_version_id: '9',
        version_no: 2,
        eligible_evaluations: 1,
        proposed_moved_participants: 2,
        proposed_skipped_participants: 3,
        skipped_reasons: {
          submitted: 1,
          protected_draft: 1,
          already_on_target: 1,
        },
        evaluations: [
          {
            evaluation_id: '20',
            proposed_moved_participants: 2,
            proposed_skipped_participants: 3,
          },
        ],
      },
    },
  })
  previewApplication(
    @Param('surveyId', ParseBigIntPipe) surveyId: bigint,
    @Param('versionId', ParseBigIntPipe) versionId: bigint,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.previewApplication(surveyId, versionId, actor);
  }

  @Post('surveys/:surveyId/versions/:versionId/apply-to-unfinished/confirm')
  @HttpCode(200)
  @ApiParam({ name: 'surveyId', type: String, example: '7' })
  @ApiParam({ name: 'versionId', type: String, example: '9' })
  @ApiOperation({
    summary: 'Confirm reviewed unfinished-version application',
    description:
      'Requires preview review_id. Version/participant/draft/submission drift returns 409 before writes. Preserves original base versions, drafts and completions. Completed retry returns original moved/skipped counts and already_applied=true; it cannot move newly eligible participants.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Existing committed application fields plus review_id and already_applied',
    schema: {
      example: {
        ...receiptExample,
        survey_id: '7',
        survey_version_id: '9',
        version_no: 2,
        status: 'LOCKED',
        operation: 'APPLIED_AND_LOCKED',
        retry_safe: true,
        was_already_locked: false,
        eligible_evaluations: 1,
        moved_participants: 2,
        updated_participants: 2,
        skipped_participants: 3,
        skipped_reasons: {
          submitted: 1,
          protected_draft: 1,
          already_on_target: 1,
        },
        skipped_submitted: 1,
        skipped_with_draft: 1,
        already_on_target: 1,
      },
    },
  })
  confirmApplication(
    @Param('surveyId', ParseBigIntPipe) surveyId: bigint,
    @Param('versionId', ParseBigIntPipe) versionId: bigint,
    @Body() dto: ReviewConfirmationDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.workflows.confirmApplication(
      surveyId,
      versionId,
      dto.review_id,
      actor,
    );
  }
}
