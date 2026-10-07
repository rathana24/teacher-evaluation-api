import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
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
import { AssessmentDraftsService } from './assessment-drafts.service';
import { SaveAssessmentDraftDto } from './dto/save-assessment-draft.dto';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('student')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('STUDENT')
@Controller('student/evaluations')
export class AssessmentDraftsController {
  constructor(
    private readonly assessmentDraftsService: AssessmentDraftsService,
  ) {}

  @Put(':id/draft')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Save or update my unfinished assessment draft',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Evaluation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft saved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid draft data',
  })
  @ApiResponse({
    status: 403,
    description: 'Student is not eligible for this evaluation',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Evaluation is not open or has already been submitted',
  })
  save(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: SaveAssessmentDraftDto,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.assessmentDraftsService.save(
      id,
      currentUser.id,
      dto,
    );
  }

  @Get(':id/draft')
  @ApiOperation({
    summary: 'Get my saved assessment draft',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Evaluation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Student is not eligible for this evaluation',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation or draft not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Evaluation is not currently answerable',
  })
  findMyDraft(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.assessmentDraftsService.findMyDraft(
      id,
      currentUser.id,
    );
  }

  @Delete(':id/draft')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete my saved assessment draft',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Evaluation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Draft deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Student is not eligible for this evaluation',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation or draft not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Evaluation is not currently answerable',
  })
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.assessmentDraftsService.remove(
      id,
      currentUser.id,
    );
  }
}