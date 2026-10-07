import {
  Body,
  Controller,
  Delete,
  Get,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';

import { CourseYearRulesService } from './course-year-rules.service';
import { CreateCourseYearRuleDto } from './dto/create-course-year-rule.dto';
import { UpdateCourseYearRuleDto } from './dto/update-course-year-rule.dto';

@ApiTags('course-year-rules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('course-year-rules')
export class CourseYearRulesController {
  constructor(
    private readonly courseYearRulesService: CourseYearRulesService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List and filter curriculum course-year rules',
  })
  @ApiQuery({
    name: 'course_id',
    required: false,
    example: '1',
  })
  @ApiQuery({
    name: 'major_id',
    required: false,
    example: '1',
  })
  @ApiQuery({
    name: 'year_level',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Search by course code/name or major code/name',
  })
  @ApiResponse({
    status: 200,
    description: 'Course year rules returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid filter value',
  })
  findAll(
    @Query('course_id') courseId?: string,
    @Query('major_id') majorId?: string,
    @Query('year_level') yearLevel?: string,
    @Query('search') search?: string,
  ) {
    let parsedYearLevel: number | undefined;

    if (yearLevel !== undefined) {
      const normalizedYearLevel = yearLevel.trim();

      if (
        !/^[1-9]\d*$/.test(normalizedYearLevel)
      ) {
        parsedYearLevel = Number.NaN;
      } else {
        parsedYearLevel = Number(normalizedYearLevel);
      }
    }

    return this.courseYearRulesService.findAll({
      course_id: courseId,
      major_id: majorId,
      year_level: parsedYearLevel,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a curriculum course-year rule by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Course year rule found',
  })
  @ApiResponse({
    status: 404,
    description: 'Course year rule not found',
  })
  findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.courseYearRulesService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a curriculum course-year rule',
  })
  @ApiResponse({
    status: 201,
    description: 'Course year rule created successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid course, major, or year level',
  })
  @ApiResponse({
    status: 409,
    description:
      'Course year rule already exists',
  })
  create(
    @Body() dto: CreateCourseYearRuleDto,
  ) {
    return this.courseYearRulesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a curriculum course-year rule',
  })
  @ApiResponse({
    status: 200,
    description: 'Course year rule updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid course, major, or year level',
  })
  @ApiResponse({
    status: 404,
    description: 'Course year rule not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Course year rule already exists',
  })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateCourseYearRuleDto,
  ) {
    return this.courseYearRulesService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a curriculum course-year rule',
  })
  @ApiResponse({
    status: 200,
    description: 'Course year rule deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course year rule not found',
  })
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.courseYearRulesService.remove(id);
  }
}