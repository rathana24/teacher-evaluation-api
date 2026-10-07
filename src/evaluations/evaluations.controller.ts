import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
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

import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ListEvaluationsQueryDto } from './dto/list-evaluations-query.dto';
import { PreviewEvaluationParticipantsDto } from './dto/preview-evaluation-participants.dto';

import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('evaluations')
@ApiBearerAuth()
@UseGuards(
  AuthGuard('jwt'),
  RolesGuard,
)
@Roles('ADMIN')
@Controller('evaluations')
export class EvaluationsController {
  constructor(
    private readonly evaluationsService: EvaluationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List evaluations, optionally filtered by status',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluations returned successfully',
  })
  findAll(
    @Query()
    query: ListEvaluationsQueryDto,
  ) {
    return this.evaluationsService.findAll(
      query,
    );
  }

  @Post('participants/preview')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Preview eligible students for an evaluation',
    description:
      'Resolves eligible students from the actual course-offering enrollments. SELECTED_GENERATIONS is intersected with those enrollments and never falls back to all enrolled students.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Eligible students previewed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid participant scope or generation selection',
  })
  @ApiResponse({
    status: 404,
    description:
      'Course offering or selected generation not found',
  })
  previewParticipants(
    @Body()
    dto: PreviewEvaluationParticipantsDto,
  ) {
    return this.evaluationsService.previewParticipants(
      dto,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get one evaluation with its context, targeting, and counts',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluation returned successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Evaluation not found',
  })
  findOne(
    @Param(
      'id',
      ParseBigIntPipe,
    )
    id: bigint,
  ) {
    return this.evaluationsService.findOne(
      id,
    );
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a DRAFT evaluation and confirm its participant group',
    description:
      'Send the reviewed survey_version_id to detect a stale question selection (409). Set-only selection validates the actual latest version and rejects an empty/archived latest version without fallback. participant_scope defaults to ALL_ENROLLED. For reviewed targeting, send the unchanged context and exact confirmed_student_ids returned by preview. Validation and writes share a serializable transaction; a concurrent conflict requires review and retry.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Evaluation created successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid offering, question set, survey version, schedule, participant scope, generation selection, or empty eligible group',
  })
  @ApiResponse({
    status: 409,
    description:
      'The course offering already has an evaluation using the selected survey version, or the eligible student group changed after preview',
  })
  create(
    @Body()
    dto: CreateEvaluationDto,

    @CurrentUser()
    currentUser: {
      id: bigint;
    },
  ) {
    return this.evaluationsService.create(
      dto,
      currentUser.id,
    );
  }

  @Put(':id/schedule')
  @ApiOperation({
    summary:
      'Set the start/end time of a DRAFT evaluation',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluation schedule updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'end_at is not after start_at',
  })
  @ApiResponse({
    status: 409,
    description:
      'Evaluation is not a DRAFT',
  })
  updateSchedule(
    @Param(
      'id',
      ParseBigIntPipe,
    )
    id: bigint,

    @Body()
    dto: UpdateScheduleDto,
  ) {
    return this.evaluationsService.updateSchedule(
      id,
      dto,
    );
  }

  @Post(':id/open')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Open a DRAFT evaluation and lock its question-set version',
    description:
      'Uses the frozen participant list. A newer question version returns 409 and preserves the draft assignment for re-review. Existing assignments may continue after their named set is archived. Opening never silently substitutes versions or adds later enrollments.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluation opened successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Evaluation is not ready: missing dates, past end date, archived version, no questions, or no confirmed participants',
  })
  @ApiResponse({
    status: 404,
    description:
      'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Evaluation is not a DRAFT, a newer question version requires re-review, or a concurrent operation conflicted',
  })
  open(
    @Param(
      'id',
      ParseBigIntPipe,
    )
    id: bigint,
  ) {
    return this.evaluationsService.open(
      id,
    );
  }

  @Post(':id/close')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Close an OPEN evaluation',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluation closed successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Evaluation is not OPEN',
  })
  close(
    @Param(
      'id',
      ParseBigIntPipe,
    )
    id: bigint,
  ) {
    return this.evaluationsService.close(
      id,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Delete a DRAFT evaluation',
    description:
      'Deletes the DRAFT together with its frozen participant assignments and generation targets.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 204,
    description:
      'Evaluation deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Evaluation is not a DRAFT',
  })
  async remove(
    @Param(
      'id',
      ParseBigIntPipe,
    )
    id: bigint,
  ) {
    await this.evaluationsService.remove(
      id,
    );
  }
}
