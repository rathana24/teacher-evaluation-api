import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AssignmentCreationService } from './assignment-creation.service';
import {
  AssignmentCreationConfirmDto,
  AssignmentCreationPreviewDto,
} from './dto/reviewed-assignment.dto';

@ApiTags('course-offerings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('course-offerings/create-with-enrollments')
export class AssignmentCreationController {
  constructor(private readonly creation: AssignmentCreationService) {}

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Review new assignments and exact student rosters before creation',
    description:
      'Requires capabilities.reviewed_assignment_enrollment_v1=true from /auth/me. Explicit course_id, academic_year_id, integer year_level and 1–50 keyed assignment rows, each with explicit major-owned cohort/group scopes. No omitted/empty audience fallback. Every semester must belong to the selected year. Reuses curriculum, scope and progression/PAUSE/yearly-placement checks. Returns can_confirm, items with safe complete eligible_students, exact confirmed_student_ids, per-major/cohort/group breakdown, total_enrollment_count, UUID review_id and 15-minute expires_at. Creates only an expiring review; no offerings/scopes/enrollments/evaluations. At most 10,000 student-to-assignment memberships. ADMIN is school-wide.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Review only; eligible_count and breakdown sum equal the exact unique roster per row.',
  })
  @ApiResponse({
    status: 400,
    description:
      'ASSIGNMENT_AUDIENCE_REQUIRED/EMPTY, ASSIGNMENT_YEAR_MISMATCH, invalid IDs/size or duplicate row keys/identities. No broader audience substituted.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Existing identity (OFFERING_ALREADY_EXISTS with authorized existing_course_offering_id), missing/withdrawn approval or concurrency conflict. Labels/groups never distinguish identity.',
  })
  @ApiResponse({
    status: 503,
    description:
      'ASSIGNMENT_SCHEMA_NOT_READY; required receipt kind or complete-identity index not installed.',
  })
  preview(
    @Body() dto: AssignmentCreationPreviewDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.creation.preview(dto, actor);
  }

  @Post('confirm')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Atomically create all reviewed assignments and enroll their exact students',
    description:
      'Send unchanged preview payload plus review_id and confirmations[{row_key,confirmed_student_ids}] for every row. Input/actor/roster/context are bound to the review. One SERIALIZABLE transaction creates all offerings, pinned scopes, exact enrollments and completed receipt or rolls everything back. Never modifies existing assignments/enrollments/history or opens evaluations. Success: status COMPLETE, created_offering_count, enrolled_count and items[{row_key,course_offering_id,status:CREATED,matched_count,enrolled_count,already_enrolled_count:0}], review_id, already_applied. Retry SAME review/body returns original IDs/counts after preview expiry and later eligibility changes. Completed receipts must be retained; they are not N activity events. No client rollback deletes or sequential-create fallback.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Original complete receipt; already_applied=false first time, true on completed retry.',
  })
  @ApiResponse({
    status: 409,
    description:
      'REVIEW_INPUT_MISMATCH, REVIEW_OPERATION_MISMATCH, REVIEW_EXPIRED or REVIEW_STALE cause no new writes. ASSIGNMENT_RETRY_REQUIRED: recover/retry SAME review/body. After ASSIGNMENT_RESULT_UNCERTAIN or network loss do not start another review; use receipt recovery.',
  })
  @ApiResponse({
    status: 404,
    description: 'Unknown review or another actor’s review; no disclosure.',
  })
  confirm(
    @Body() dto: AssignmentCreationConfirmDto,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.creation.confirm(dto, actor);
  }

  @Get('receipts/:reviewId')
  @ApiParam({
    name: 'reviewId',
    type: String,
    description: 'Original UUID v4 review ID.',
  })
  @ApiOperation({
    summary: 'Recover the original committed assignment/enrollment receipt',
    description:
      'ACTIVE original ADMIN only. Returns the original receipt with already_applied=true, even after expiry, later assignment edits/deletion or curriculum/placement changes. No re-enrollment or roster expansion. 409 ASSIGNMENT_NOT_COMMITTED means no completed result is visible in this snapshot, not proof that another request rolled back. Retry the unchanged confirmation after an uncertain outcome. Completed receipts have no TTL and must survive operational backup/restore; retention cleanup must preserve retry identity.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Original complete receipt; no current student details or anonymous answer identities.',
  })
  receipt(
    @Param('reviewId', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser('id') actor: bigint,
  ) {
    return this.creation.receipt(id, actor);
  }
}
