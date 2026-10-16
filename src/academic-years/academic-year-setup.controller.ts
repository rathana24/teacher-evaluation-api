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
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  AcademicYearSetupDto,
  CompleteAcademicYearSetupDto,
} from './dto/academic-year-setup.dto';
import { AcademicYearSetupService } from './academic-year-setup.service';

@ApiTags('academic-years')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('academic-years')
export class AcademicYearSetupController {
  constructor(private readonly setupService: AcademicYearSetupService) {}

  @Post('setup')
  @HttpCode(201)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
    description:
      'Generate UUID v4 once; retain the same key/body through uncertainty and retries.',
  })
  @ApiOperation({
    summary:
      'Atomically create an academic year with Semester 1 and Semester 2',
    description:
      'ADMIN only. Validate all input, then create year, optional active-year switch, both semesters and durable receipt in one SERIALIZABLE transaction. Any failure rolls back all changes. Exact retries return original IDs/counts with already_applied:true, even after later edits/deletion. Receipt recovery does not reactivate years. This B-only contract does not yet initialize student groups or teaching assignments and must not replace frontend rollover until the integrated B/F/I capability is deployed. Existing separate year/semester CRUD remains unchanged.',
  })
  @ApiResponse({
    status: 201,
    description:
      'COMPLETE: academic_year, semesters, created/preserved counts and IDs, idempotency_key, already_applied.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid year/semester input, duplicate numbers/names, invalid date order, or missing/invalid UUID v4 key. No writes.',
  })
  @ApiResponse({
    status: 409,
    description:
      'YEAR_SETUP_INPUT_MISMATCH, IDEMPOTENCY_KEY_IN_USE or YEAR_SETUP_RETRY_OR_CONFLICT; retain original key/body for recovery.',
  })
  @ApiResponse({
    status: 503,
    description: 'YEAR_SETUP_SCHEMA_NOT_READY; receipt migration not deployed.',
  })
  create(
    @Body() dto: AcademicYearSetupDto,
    @CurrentUser('id') actor: bigint,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.setupService.setup(dto, actor, key);
  }

  @Post(':id/complete-setup')
  @HttpCode(200)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOperation({
    summary: 'Create only missing semester numbers for an existing year',
    description:
      'Supply exactly numbers 1 and 2. Existing semester names/dates and year fields/active state are preserved verbatim. Return created/preserved counts and original IDs. Never overwrite teaching/evaluation history. Uses the same actor/input-bound durable receipt as setup; retain the same key/body across retries. Year ID is a positive PostgreSQL bigint string. No group/assignment rollover yet.',
  })
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteAcademicYearSetupDto,
    @CurrentUser('id') actor: bigint,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.setupService.setup(dto, actor, key, id);
  }

  @Get('setup/receipts/:key')
  @ApiOperation({
    summary: 'Recover the original completed year-setup result',
    description:
      'Current ACTIVE original ADMIN only. Completed receipts have no TTL. Returns original year/semester IDs and counts, never reruns activation or writes. A missing receipt does not establish that another in-flight request rolled back; retain/retry the original key/body after uncertainty.',
  })
  receipt(@Param('key') key: string, @CurrentUser('id') actor: bigint) {
    return this.setupService.receipt(actor, key);
  }
}
