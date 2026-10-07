import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '@nestjs/passport';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CommentsService } from './comments.service';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { assertWholeAnonymousAggregate } from '../common/utils/anonymous-report-scope.util';

@ApiTags('lecturer')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('LECTURER')
@Controller('lecturer/evaluations')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Anonymous written comments from one of my closed evaluations',
    description:
      'Whole evaluation comments only. Generation/group query slicing returns 400/UNSUPPORTED_ANONYMOUS_SCOPE; answers are never attributed to students.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Anonymous comments returned successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Not my evaluation',
  })
  @ApiResponse({
    status: 404,
    description: 'Evaluation not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Evaluation is not closed yet',
  })
  getComments(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() currentUser: { id: bigint },
    @Query() query: Record<string, unknown> = {},
  ) {
    assertWholeAnonymousAggregate(query);
    return this.commentsService.getComments(id, currentUser.id);
  }
}
