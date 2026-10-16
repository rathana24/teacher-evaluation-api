import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CohortMappingService } from './cohort-mapping.service';
import {
  CohortMappingProposalDto,
  ConfirmCohortMappingDto,
  CohortMappingReceiptDto,
} from './dto/cohort-mapping.dto';

@ApiTags('reviewed-cohort-mapping')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('student-generations/mapping')
export class CohortMappingController {
  constructor(private readonly service: CohortMappingService) {}
  @Get('inventory')
  @ApiOperation({
    summary: 'Inspect cohort mapping references without changing school data',
    description:
      'ADMIN only; disabled unless COHORT_MAPPING_ENABLED=true. This rollout accepts only teacher_evaluation_test/public or owned test fixture schemas. Returns complete IDs/hashes and explicit cohort/year/major context, never passwords, notes, draft contents or anonymous answers. No normal database support or inferred mapping.',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete source inventory and fingerprint.',
  })
  @ApiResponse({ status: 503, description: 'COHORT_MAPPING_DISABLED' })
  inventory(
    @CurrentUser('id') actor: bigint,
    @Headers('authorization') authorization?: string,
  ) {
    return this.service.inventory(actor, authorization);
  }

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Validate and review a complete explicit cohort mapping',
    description:
      'Supply every inventory reference exactly once with its unchanged hash and explicit disposition. Body fields are strictly validated; unknown fields are rejected. Server authors target/reviewer/timestamps/operation UUID. Writes only expiring review storage, no school mapping. Review expires after 15 minutes. Preserve frozen targets, unknown history and resolved identities; no owner is inferred.',
  })
  @ApiBody({ type: CohortMappingProposalDto })
  @ApiResponse({
    status: 200,
    description: 'Server-authored manifest, impact, review_id and expires_at.',
  })
  @ApiResponse({
    status: 400,
    description:
      'INVALID_MANIFEST, INVALID_MAPPING or INCOMPLETE_MAPPING; nothing mapped.',
  })
  @ApiResponse({
    status: 409,
    description: 'Stale inventory, destination conflict or unsupported target.',
  })
  preview(
    @CurrentUser('id') actor: bigint,
    @Headers('authorization') authorization: string | undefined,
    @Body() input: unknown,
  ) {
    return this.service.preview(actor, authorization, input);
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Atomically confirm the exact reviewed cohort mapping',
    description:
      'Send unchanged manifest and review_id. Actor, token revision, target, source/schema and complete reviewed input are rechecked. Records, MIGRATION evidence, profile/scope links and durable receipts commit together; original values/timestamps/frozen labels/drafts/responses remain protected. Relevant drift returns 409 REVIEW_STALE. Completed retries return the original receipt after preview expiry; retry the SAME body after an uncertain response.',
  })
  @ApiBody({ type: ConfirmCohortMappingDto })
  @ApiResponse({ status: 201, type: CohortMappingReceiptDto })
  @ApiResponse({
    status: 400,
    description: 'Malformed confirmation or missing required review.',
  })
  @ApiResponse({
    status: 404,
    description: 'Review unavailable to this administrator.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Review stale, expired, input mismatch, conflicting concurrent mapping or target mismatch; no partial mapping.',
  })
  confirm(
    @CurrentUser('id') actor: bigint,
    @Headers('authorization') authorization: string | undefined,
    @Body() input: unknown,
  ) {
    return this.service.confirm(actor, authorization, input);
  }

  @Get('receipts/:reviewId')
  @ApiOperation({
    summary: 'Recover the authenticated administrator original mapping receipt',
    description:
      'Read-only, actor-bound recovery by review UUID, including after preview expiry. A visible committed receipt returns its original result with already_applied=true. MAPPING_NOT_COMMITTED means no committed receipt is visible in this snapshot; retry the unchanged confirmation after an uncertain result.',
  })
  @ApiResponse({ status: 200, type: CohortMappingReceiptDto })
  @ApiResponse({
    status: 404,
    description: 'Review unavailable to this administrator.',
  })
  @ApiResponse({
    status: 409,
    description: 'MAPPING_NOT_COMMITTED; no committed receipt is visible.',
  })
  receipt(
    @CurrentUser('id') actor: bigint,
    @Headers('authorization') authorization: string | undefined,
    @Param('reviewId') reviewId: string,
  ) {
    return this.service.receipt(actor, authorization, reviewId);
  }
}
