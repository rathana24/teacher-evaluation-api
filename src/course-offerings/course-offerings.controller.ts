import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
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

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';

import { CourseOfferingsService } from './course-offerings.service';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto';

const offeringExample = {
  id: '1',
  course_id: '1',
  lecturer_id: '2',
  semester_id: '1',
  section_code: 'A',
  year_level: 4,
  class_type: 'COURSE',
  _count: { enrollments: 0 },
  group_scopes: [
    {
      id: '1',
      academic_year_id: '1',
      generation_id: '1',
      major_id: '1',
      year_level: 4,
      class_group: 'A',
      curriculum_revision_id: '12',
      curriculum_revision: {
        id: '12',
        rule_id: '3',
        revision_no: 1,
        effective_academic_year_id: '1',
        effective_start_year: 2025,
        enabled: true,
      },
    },
  ],
  created_at: '2026-09-13T06:15:49.001Z',
  updated_at: '2026-09-13T06:15:49.001Z',

  courses: {
    id: '1',
    course_code: 'CS301',
    course_name: 'Database Systems',
  },

  semesters: {
    id: '1',
    semester_name: 'Semester 1',
    semester_number: 1,
    academic_year_id: '1',

    academic_years: {
      id: '1',
      name: '2025-2026',
      start_year: 2025,
      is_active: true,
    },
  },

  users: {
    id: '2',
    full_name: 'Sok Dara',
    email: 'sokdara@itc.edu.kh',
  },
};

@ApiTags('course-offerings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('course-offerings')
export class CourseOfferingsController {
  constructor(
    private readonly courseOfferingsService: CourseOfferingsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all course offerings',
    description:
      'Returns course offerings with course, lecturer, semester, academic year, student year level, and class type information. _count.enrollments is a nonnegative integer counting actual persisted enrollments for this offering, including zero; it is not a count of group scopes, eligible students or frozen evaluation participants. Missing readiness metadata must not be treated as zero.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of course offerings',
    schema: {
      example: [offeringExample],
    },
  })
  findAll() {
    return this.courseOfferingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a course offering by id',
    description:
      'Includes _count.enrollments with the same persisted-row semantics as the list, plus semester.academic_year_id and academic year metadata. Enrollment identities are not added.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'The course offering',
    schema: {
      example: offeringExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found',
  })
  findOne(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.courseOfferingsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Assign a lecturer to a course in a semester',
    description:
      'Creates a teaching assignment with required year_level 1–5. Even without group_scopes, an enabled applicable curriculum revision must approve this course/year in the selected semester academic year. Active year and unversioned legacy rules cannot substitute. Every explicit major/year scope needs its latest applicable enabled revision; optional curriculum_revision_id detects stale selection. Authorization, active departments, lecturer and structured semester chronology are checked in one serializable transaction. ADMIN is school-wide; cross-department audiences require explicit applicable approvals. Class type is COURSE, TD or TP.',
  })
  @ApiResponse({
    status: 201,
    description: 'Course offering created',
    schema: {
      example: offeringExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, unknown course/semester, lecturer_id is not a LECTURER, or lecturer is inactive',
  })
  @ApiResponse({
    status: 409,
    description:
      'OFFERING_ALREADY_EXISTS: identity is (course_id, lecturer_id, semester_id, year_level, class_type), excluding section_code and groups. A detected duplicate returns existing_course_offering_id for the authorized ADMIN; open it to manage enrollment. Existing legacy duplicates are preserved, not merged. OFFERING_WRITE_CONFLICT means refresh/review after a serialization/transaction conflict; no automatic create retry or idempotent result is claimed. OFFERING_CURRICULUM_APPROVAL_REQUIRED when no applicable enabled revision exists; OFFERING_CURRICULUM_REVISION_MISMATCH for stale selection. Unversioned rules do not approve new contexts.',
  })
  create(@Body() dto: CreateCourseOfferingDto, @CurrentUser('id') actorId: bigint) {
    return this.courseOfferingsService.create(dto, actorId);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a course offering',
    description:
      'Changed course/semester/student-year/group context requires applicable enabled curriculum approval, including empty scopes. Pinned contexts remain immutable. Unchanged-context lecturer/display edits preserve legacy null years, unversioned scopes and saved revisions without a later approval; identical scope echoes preserve rows. Changed legacy scoped contexts require explicit group_scopes to save new bindings. Any evaluation, including DRAFT, protects course/lecturer/semester with OFFERING_HISTORY_PROTECTED. No enrollment, frozen participant or result is changed.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Course offering updated',
    schema: {
      example: offeringExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, unknown course/semester, lecturer_id is not a LECTURER, or lecturer is inactive',
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'OFFERING_HISTORY_PROTECTED for changed course/lecturer/semester on an evaluated offering; OFFERING_ALREADY_EXISTS with existing_course_offering_id when another assignment has the same course/lecturer/semester/year/class_type regardless of class label or groups; OFFERING_WRITE_CONFLICT for transaction conflicts. A label edit cannot bypass identity. Pre-existing legacy duplicate edits can conflict and require separate review; no merge/backfill. Protected curriculum context and obsolete/inapplicable revision conflicts remain.',
  })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateCourseOfferingDto,
    @CurrentUser('id') actorId: bigint,
  ) {
    return this.courseOfferingsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a course offering',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 204,
    description: 'Course offering deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Course offering has enrollments or evaluations',
  })
  async remove(@Param('id', ParseBigIntPipe) id: bigint) {
    await this.courseOfferingsService.remove(id);
  }
}
