import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { CourseOfferingsService } from './course-offerings.service';
import { LecturerCourseOfferingsQueryDto } from './dto/lecturer-course-offerings-query.dto';

@ApiTags('lecturer-course-offerings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('LECTURER')
@Controller('lecturer/course-offerings')
export class LecturerCourseOfferingsController {
  constructor(
    private readonly courseOfferingsService: CourseOfferingsService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List teaching assignments owned by the authenticated lecturer',
    description:
      'Returns only course offerings assigned to the authenticated lecturer. Assignments are returned whether or not an evaluation exists. Supports search and academic-year, semester, student-year, and class-type filters. The response is currently non-paginated and complete.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Complete list of teaching assignments owned by the authenticated lecturer',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'LECTURER role required',
  })
  findOwn(
    @CurrentUser()
    user: {
      id: bigint;
    },
    @Query()
    query: LecturerCourseOfferingsQueryDto,
  ) {
    return this.courseOfferingsService.findOwnedByLecturer(
      user.id,
      query,
    );
  }
}