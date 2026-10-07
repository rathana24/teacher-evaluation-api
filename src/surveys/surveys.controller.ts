import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveysService } from './surveys.service';

@ApiTags('Surveys / Question Sets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly surveysService: SurveysService,
  ) {}

  // =========================================================
  // LIST QUESTION SETS
  // =========================================================

  @Get()
  @ApiOperation({
    summary: 'List question sets',
    description:
      'Returns active and archived named question sets together with their version summaries. Archived sets remain readable for historical purposes.',
  })
  @ApiOkResponse({
    description:
      'Question sets returned successfully.',
  })
  findAll() {
    return this.surveysService.findAll();
  }

  // =========================================================
  // GET QUESTION SET
  // =========================================================

  @Get(':id')
  @ApiOperation({
    summary: 'Get a question set',
    description:
      'Returns one named question set and its version summaries, including archived historical sets.',
  })
  @ApiOkResponse({
    description:
      'Question set returned successfully.',
  })
  @ApiNotFoundResponse({
    description:
      'Question set was not found.',
  })
  findOne(
    @Param('id', ParseBigIntPipe)
    id: bigint,
  ) {
    return this.surveysService.findOne(id);
  }

  // =========================================================
  // USAGE / DEPENDENCY PREVIEW
  // =========================================================

  @Get(':id/usage')
  @ApiOperation({
    summary:
      'Get question-set usage and dependency counts',
    description:
      'Returns authoritative usage counts across all versions of the named question set. This endpoint can be used before archive or permanent-delete confirmation.',
  })
  @ApiOkResponse({
    description:
      'Usage information returned successfully.',
  })
  @ApiNotFoundResponse({
    description:
      'Question set was not found.',
  })
  getUsage(
    @Param('id', ParseBigIntPipe)
    id: bigint,
  ) {
    return this.surveysService.getUsage(id);
  }

  // =========================================================
  // CREATE QUESTION SET + V1
  // =========================================================

  @Post()
  @ApiOperation({
    summary:
      'Create a question set with Version 1',
    description:
      'Creates the named question set and its initial Version 1 in DRAFT status atomically. The title is trimmed and must be unique case-insensitively.',
  })
  @ApiCreatedResponse({
    description:
      'Question set and Version 1 created successfully.',
  })
  @ApiConflictResponse({
    description:
      'A question set with the same normalized title already exists, or concurrent creation requires the request to be reviewed and retried.',
  })
  create(
    @Body()
    dto: CreateSurveyDto,

    @CurrentUser('id')
    createdBy: bigint,
  ) {
    return this.surveysService.create(
      dto,
      createdBy,
    );
  }

  // =========================================================
  // UPDATE QUESTION SET METADATA
  // =========================================================

  @Put(':id')
  @ApiOperation({
    summary:
      'Update question-set metadata',
    description:
      'Updates the title or description of an active question set. Archived question sets are read-only.',
  })
  @ApiOkResponse({
    description:
      'Question set updated successfully.',
  })
  @ApiNotFoundResponse({
    description:
      'Question set was not found.',
  })
  @ApiConflictResponse({
    description:
      'The question set is archived, the title conflicts with another set, or the set changed concurrently.',
  })
  update(
    @Param('id', ParseBigIntPipe)
    id: bigint,

    @Body()
    dto: UpdateSurveyDto,
  ) {
    return this.surveysService.update(
      id,
      dto,
    );
  }

  // =========================================================
  // ARCHIVE WHOLE QUESTION SET
  // =========================================================

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Archive a whole question set',
    description:
      'Retires the named question set from future use and editing by setting archived_at. Historical versions, evaluations, participants, drafts, responses, and results are preserved.',
  })
  @ApiOkResponse({
    description:
      'Question set archived successfully.',
  })
  @ApiNotFoundResponse({
    description:
      'Question set was not found.',
  })
  @ApiConflictResponse({
    description:
      'The question set is already archived or changed concurrently.',
  })
  archive(
    @Param('id', ParseBigIntPipe)
    id: bigint,
  ) {
    return this.surveysService.archive(id);
  }

  // =========================================================
  // DELETE UNUSED QUESTION SET
  // =========================================================

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Permanently delete an unused question set',
    description:
      'Deletes an unused question set together with its unused versions, questions, and options in one transaction. Deletion is rejected with 409 Conflict when any evaluation, participant, draft, or response history references a version of the set.',
  })
  @ApiOkResponse({
    description:
      'Unused question set deleted successfully.',
  })
  @ApiNotFoundResponse({
    description:
      'Question set was not found.',
  })
  @ApiConflictResponse({
    description:
      'Question set contains historical usage or changed concurrently and cannot be safely deleted.',
  })
  remove(
    @Param('id', ParseBigIntPipe)
    id: bigint,
  ) {
    return this.surveysService.remove(id);
  }
}