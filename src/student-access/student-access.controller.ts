import {
  Controller,
  Get,
  Param,
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

import { StudentAccessService } from './student-access.service';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('student')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('STUDENT')
@Controller('student/evaluations')
export class StudentAccessController {
  constructor(
    private readonly studentAccessService: StudentAccessService,
  ) {}

  // =========================================================
  // AVAILABLE EVALUATIONS
  // =========================================================

  @Get()
  @ApiOperation({
    summary: 'Evaluations I can answer right now',
  })
  findAvailable(
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.studentAccessService.findAvailable(
      currentUser.id,
    );
  }

  // =========================================================
  // EVALUATION HISTORY
  // Keep this static route before :id routes
  // =========================================================

  @Get('history')
  @ApiOperation({
    summary:
      'My evaluation history, including completed, upcoming, and closed evaluations',
  })
  @ApiResponse({
    status: 200,
    description: 'Student evaluation history',
    schema: {
      example: [
        {
          id: '1',

          course: {
            id: '1',
            code: 'AMS401',
            name: 'Data Science',
          },

          lecturer: {
            id: '2',
            full_name: 'Lecturer One',
          },

          semester: {
            id: '1',
            name: 'Semester 1',
            academic_year_id: '1',
            academic_year: '2025-2026',
          },

          status: 'Completed',
          has_submitted: true,
          submitted_at: '2026-09-20T10:30:00.000Z',

          starts_at: '2026-09-15T00:00:00.000Z',
          ends_at: '2026-09-25T23:59:59.000Z',
        },
      ],
    },
  })
  findHistory(
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.studentAccessService.findHistory(
      currentUser.id,
    );
  }

  // =========================================================
  // SURVEY
  // =========================================================

  @Get(':id/survey')
  @ApiOperation({
    summary:
      'Course context and questions for an evaluation I can answer',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 403,
    description:
      'Not eligible (not a participant or not enrolled)',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Not open right now, or already submitted',
  })
  getSurvey(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.studentAccessService.getSurvey(
      id,
      currentUser.id,
    );
  }

  // =========================================================
  // SUBMISSION STATUS
  // =========================================================

  @Get(':id/submission-status')
  @ApiOperation({
    summary:
      'Whether I have already submitted this evaluation',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
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
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.studentAccessService.getSubmissionStatus(
      id,
      currentUser.id,
    );
  }
}