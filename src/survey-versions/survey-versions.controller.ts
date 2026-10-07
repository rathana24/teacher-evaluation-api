import {
  Body,
  Controller,
  Delete,
  Get,
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

import { SurveyVersionsService } from './survey-versions.service';
import { CreateSurveyVersionDto } from './dto/create-survey-version.dto';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('survey-versions')
@ApiBearerAuth()
@UseGuards(
  AuthGuard('jwt'),
  RolesGuard,
)
@Roles('ADMIN')
@ApiParam({
  name: 'surveyId',
  type: String,
  example: '1',
})
@Controller('surveys/:surveyId/versions')
export class SurveyVersionsController {
  constructor(
    private readonly versionsService: SurveyVersionsService,
  ) {}

  // =========================================================
  // LIST VERSIONS
  // =========================================================

  @Get()
  @ApiOperation({
    summary:
      'List versions of a survey',
  })
  @ApiResponse({
    status: 200,
    description:
      'Survey versions returned successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Survey not found',
  })
  findAll(
    @Param(
      'surveyId',
      ParseBigIntPipe,
    )
    surveyId: bigint,
  ) {
    return this.versionsService.findAllForSurvey(
      surveyId,
    );
  }

  // =========================================================
  // CREATE VERSION
  // =========================================================

  @Post()
  @ApiOperation({
    summary:
      'Create the next DRAFT version',
    description:
      'Creates the next version of the same named question set. Questions may optionally be copied from the latest version. Existing evaluations and participants are not changed.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Version created successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Survey not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Another version was created at the same time',
  })
  create(
    @Param(
      'surveyId',
      ParseBigIntPipe,
    )
    surveyId: bigint,

    @Body()
    dto: CreateSurveyVersionDto,

    @CurrentUser()
    currentUser: {
      id: bigint;
    },
  ) {
    return this.versionsService.create(
      surveyId,
      dto,
      currentUser.id,
    );
  }

  // =========================================================
  // GET ONE VERSION
  // =========================================================

  @Get(':versionId')
  @ApiOperation({
    summary:
      'Get one version with its questions',
  })
  @ApiParam({
    name: 'versionId',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Survey version returned successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Survey version not found',
  })
  findOne(
    @Param(
      'surveyId',
      ParseBigIntPipe,
    )
    surveyId: bigint,

    @Param(
      'versionId',
      ParseBigIntPipe,
    )
    versionId: bigint,
  ) {
    return this.versionsService.findOne(
      surveyId,
      versionId,
    );
  }

  // =========================================================
  // APPLY TO UNFINISHED PARTICIPANTS
  // =========================================================

  @Post(
    ':versionId/apply-to-unfinished',
  )
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Apply a new question-set version to safe unfinished assignments',
    description:
      'Locks this DRAFT version and applies it only to unfinished participants in evaluations using the same named question set. Completed participants keep their original version. Participants with saved drafts are skipped so their saved answers are not silently invalidated. The evaluation base version is not changed.',
  })
  @ApiParam({
    name: 'versionId',
    type: String,
    example: '2',
  })
  @ApiResponse({
    status: 200,
    description:
      'Version locked and safe unfinished participants reconciled successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'The target version has no questions',
  })
  @ApiResponse({
    status: 404,
    description:
      'Survey or survey version not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'The version is not DRAFT or its state changed during reconciliation',
  })
  applyToUnfinished(
    @Param(
      'surveyId',
      ParseBigIntPipe,
    )
    surveyId: bigint,

    @Param(
      'versionId',
      ParseBigIntPipe,
    )
    versionId: bigint,
  ) {
    return this.versionsService.applyToUnfinished(
      surveyId,
      versionId,
    );
  }

  // =========================================================
  // ARCHIVE VERSION
  // =========================================================

  @Post(':versionId/archive')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Archive a survey version',
    description:
      'Marks the version as ARCHIVED. Historical participant, draft, response, and evaluation references are preserved.',
  })
  @ApiParam({
    name: 'versionId',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'Survey version archived successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Survey version not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Survey version is already archived',
  })
  archive(
    @Param(
      'surveyId',
      ParseBigIntPipe,
    )
    surveyId: bigint,

    @Param(
      'versionId',
      ParseBigIntPipe,
    )
    versionId: bigint,
  ) {
    return this.versionsService.archive(
      surveyId,
      versionId,
    );
  }

  // =========================================================
  // DELETE VERSION
  // =========================================================

  @Delete(':versionId')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Delete an unused survey version',
    description:
      'Deletion is allowed only when the version is not locked and is not referenced by evaluations, participant assignments, saved drafts, or submitted responses.',
  })
  @ApiParam({
    name: 'versionId',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 204,
    description:
      'Survey version deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Survey version not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Version is locked or already referenced by evaluation history',
  })
  async remove(
    @Param(
      'surveyId',
      ParseBigIntPipe,
    )
    surveyId: bigint,

    @Param(
      'versionId',
      ParseBigIntPipe,
    )
    versionId: bigint,
  ) {
    await this.versionsService.remove(
      surveyId,
      versionId,
    );
  }
}