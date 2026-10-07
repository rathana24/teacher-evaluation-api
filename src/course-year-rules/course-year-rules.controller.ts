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
import { CreateCurriculumRevisionDto } from './dto/create-curriculum-revision.dto';

@ApiTags('course-year-rules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('course-year-rules')
export class CourseYearRulesController {
  constructor(
    private readonly courseYearRulesService: CourseYearRulesService,
  ) {}

  @Get(':id/revisions')
  @ApiOperation({ summary: 'Read immutable curriculum revision history' })
  @ApiResponse({
    status: 200,
    schema: {
      example: [
        {
          id: '12',
          rule_id: '3',
          revision_no: 1,
          effective_academic_year_id: '2',
          effective_start_year: 2026,
          enabled: true,
          reason: null,
          created_at: '2026-10-08T00:00:00.000Z',
        },
      ],
    },
  })
  revisions(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.courseYearRulesService.revisions(id);
  }

  @Get(':id/applicable')
  @ApiOperation({
    summary: 'Resolve a curriculum rule for an offering academic year',
    description:
      'Use the returned revision id as group_scopes[].curriculum_revision_id. LEGACY_UNVERSIONED returns enabled:null; a revisioned rule without an applicable approval returns enabled:false. Offering confirmation independently rechecks applicability.',
  })
  @ApiQuery({ name: 'academic_year_id', required: true, example: '1' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        rule_id: '3',
        academic_year_id: '2',
        policy: 'REVISIONED',
        revision: {
          id: '12',
          rule_id: '3',
          revision_no: 1,
          effective_academic_year_id: '2',
          effective_start_year: 2026,
          enabled: true,
        },
        enabled: true,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid or missing academic_year_id; year has no structured start_year',
  })
  applicable(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Query('academic_year_id', ParseBigIntPipe) yearId: bigint,
  ) {
    return this.courseYearRulesService.applicableRevision(id, yearId);
  }

  @Post(':id/revisions')
  @ApiOperation({
    summary: 'Append an academic-year curriculum approval or withdrawal',
    description:
      'Years must advance strictly using start_year. Existing offerings retain their pinned revisions. A changed course/major/year tuple requires a new rule and withdrawal of the old rule.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Revision appended; no historical offerings are revalidated or changed',
    schema: {
      example: {
        id: '13',
        rule_id: '3',
        revision_no: 2,
        effective_academic_year_id: '4',
        effective_start_year: 2027,
        enabled: false,
        reason: 'Withdrawn for new assignments',
        created_at: '2026-10-08T00:00:00.000Z',
        academic_years: { id: '4', name: '2027-2028', start_year: 2027 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Academic year missing structured start_year or invalid input',
  })
  @ApiResponse({
    status: 409,
    description: 'Same-year, backdated or concurrent revision conflict',
  })
  createRevision(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: CreateCurriculumRevisionDto,
  ) {
    return this.courseYearRulesService.createRevision(id, dto);
  }

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
    description: 'Search by course code/name or major code/name',
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

      if (!/^[1-9]\d*$/.test(normalizedYearLevel)) {
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
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
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
    description: 'Invalid course, major, or year level',
  })
  @ApiResponse({
    status: 409,
    description: 'Course year rule already exists',
  })
  create(@Body() dto: CreateCourseYearRuleDto) {
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
    description: 'Invalid course, major, or year level',
  })
  @ApiResponse({
    status: 404,
    description: 'Course year rule not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Course year rule already exists',
  })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateCourseYearRuleDto,
  ) {
    return this.courseYearRulesService.update(id, dto);
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
  remove(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.courseYearRulesService.remove(id);
  }
}
