import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Optional,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentGroupSelectionDto } from './dto/enrollment-group-selection.dto';
import {
  ConfirmEnrollmentReassignmentDto,
  EnrollmentReassignmentDto,
} from './dto/enrollment-reassignment.dto';
import { EnrollmentsService } from './enrollments.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewedWorkflowsService } from '../reviewed-workflows/reviewed-workflows.service';
import { requireReviewAtCutover } from '../reviewed-workflows/reviewed-operation.store';

const enrollmentExample = {
  id: '1',
  student_id: '4',
  course_offering_id: '1',
  enrolled_at: '2026-09-13T06:15:49.001Z',
  users: {
    id: '4',
    full_name: 'Student 1',
    email: 'student1@itc.edu.kh',
  },
};

const enrollmentGroupSelectionExample = {
  academic_year_id: '2',
  generation_id: '1',
  year_level: 4,
  major_id: '1',
  class_groups: ['AMS1-A'],
};

const enrollmentPreviewExample = {
  review_id: '40aa52de-b777-4e6d-a508-c117f98b8c1a',
  expires_at: '2026-10-07T12:15:00.000Z',
  course_offering_id: '1',

  selection: {
    academic_year_id: '2',
    generation_id: '1',
    year_level: 4,
    major_id: '1',
    class_groups: ['AMS1-A'],
  },

  matched_count: 1,
  already_enrolled_count: 0,
  new_enrollment_count: 1,
  confirmed_student_ids: ['4'],

  students: [
    {
      id: '10',
      user_id: '4',
      student_code: 'e20230001',
      generation_id: '1',
      already_enrolled: false,

      users: {
        id: '4',
        full_name: 'Student 1',
        email: 'student1@itc.edu.kh',
        role: 'STUDENT',
        status: 'ACTIVE',
      },

      academic_context: {
        academic_year: {
          id: '2',
          name: '2026-2027',
          start_year: 2026,
          is_active: true,
        },

        academic_record: {
          academic_year_id: '2',
          year_level: 4,
          major_id: '1',
          class_group: 'AMS1-A',
        },

        calculated_year_level: 4,
        effective_year_level: 4,
        year_level_source: 'ACADEMIC_RECORD',
      },
    },
  ],
};

const bulkEnrollmentExample = {
  review_id: enrollmentPreviewExample.review_id,
  already_applied: false,
  course_offering_id: '1',
  matched_count: 1,
  enrolled_count: 1,
  already_enrolled_count: 0,
};

@ApiTags('enrollments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@ApiParam({
  name: 'offeringId',
  type: String,
  example: '1',
})
@Controller('course-offerings/:offeringId/enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    @Optional() private readonly reviewedWorkflows?: ReviewedWorkflowsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List students enrolled in a course offering',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of enrollments',
    schema: {
      example: [enrollmentExample],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found',
  })
  findAll(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,
  ) {
    return this.enrollmentsService.findAllForOffering(offeringId);
  }

  @Post()
  @ApiOperation({
    summary: 'Enroll one student in a course offering',
    description:
      'student_id is a user/account ID. Validates ACTIVE status and any saved academic-year/generation/major/year/group scope inside the same serializable transaction as enrollment. Legacy no-scope offerings do not infer restrictions from section_code.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student enrolled',
    schema: {
      example: enrollmentExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, inactive/non-student account, missing placement, or placement outside the saved offering scope',
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Duplicate enrollment or concurrent state change requiring review and retry',
  })
  create(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(offeringId, dto);
  }

  @Post('preview')
  @HttpCode(200)
  @ApiBody({
    type: EnrollmentGroupSelectionDto,
    examples: { selection: { value: enrollmentGroupSelectionExample } },
  })
  @ApiOperation({
    summary: 'Preview students matching a group before enrollment',
    description:
      'Resolves ACTIVE accounts and returns exact confirmed_student_ids, caller-bound review_id and expires_at (15 minutes). Send the same selection and IDs plus review_id to /bulk. Only administrative review storage changes; no enrollment rows are created.',
  })
  @ApiResponse({
    status: 200,
    description: 'Matching students and enrollment counts',
    schema: {
      example: enrollmentPreviewExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid group-selection input',
  })
  @ApiResponse({
    status: 404,
    description:
      'Course offering, academic year, generation, or major not found',
  })
  previewGroup(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: EnrollmentGroupSelectionDto,
    @CurrentUser('id') actor: bigint,
  ) {
    if (this.reviewedWorkflows)
      return this.reviewedWorkflows.previewGroup(offeringId, dto, actor);
    return this.enrollmentsService.previewGroup(offeringId, dto);
  }

  @Post('bulk')
  @ApiBody({
    type: EnrollmentGroupSelectionDto,
    examples: {
      reviewed: {
        value: {
          ...enrollmentGroupSelectionExample,
          confirmed_student_ids: ['4'],
          review_id: enrollmentPreviewExample.review_id,
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Confirm and enroll a selected student group',
    description:
      'With review_id, binds exact account IDs, academic context, placement/status and enrollment impact to preview. Relevant drift returns 409. Completed retry returns original counts and already_applied=true without adding newly eligible accounts. Without review_id, legacy exact-ID compatibility remains until REQUIRE_REVIEWED_CONFIRMATION=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Group enrollment completed',
    schema: {
      example: bulkEnrollmentExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid group-selection input',
  })
  @ApiResponse({
    status: 404,
    description:
      'Course offering, academic year, generation, or major not found',
  })
  bulkCreate(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: EnrollmentGroupSelectionDto,
    @CurrentUser('id') actor: bigint,
  ) {
    if (dto.review_id && this.reviewedWorkflows)
      return this.reviewedWorkflows.confirmGroup(offeringId, dto, actor);
    requireReviewAtCutover();
    return this.enrollmentsService.bulkCreate(offeringId, dto);
  }

  @Post('reassignment/preview')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Preview the impact of reassigning a student enrollment',
    description:
      'Validates target scope and reports frozen participant/draft/completion impact. Returns caller-bound review_id and 15-minute expires_at. Confirm the same student account, target offering and confirmed_enrollment_id with review_id. Changes only administrative review storage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reassignment impact preview returned successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid target offering or student placement does not match the target group scope',
  })
  @ApiResponse({
    status: 404,
    description: 'Source enrollment or target offering not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Student is already enrolled in the target offering',
  })
  previewReassignment(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: EnrollmentReassignmentDto,
    @CurrentUser('id') actor: bigint,
  ) {
    if (this.reviewedWorkflows)
      return this.reviewedWorkflows.previewReassignment(offeringId, dto, actor);
    return this.enrollmentsService.previewReassignment(offeringId, dto);
  }

  @Post('reassignment/confirm')
  @ApiOperation({
    summary: 'Confirm a previewed student enrollment reassignment',
    description:
      'With review_id, verifies the exact reviewed placement/scope/impact inside the mutation transaction and stores the original result. Completed retry returns that result without moving another enrollment. Frozen participants/placements remain intact. Legacy confirmation without review_id is rejected after REQUIRE_REVIEWED_CONFIRMATION=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student enrollment reassigned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reassignment input',
  })
  @ApiResponse({
    status: 409,
    description:
      'The reassignment state changed after preview, or the source offering contains a protected evaluation draft or submission',
  })
  confirmReassignment(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: ConfirmEnrollmentReassignmentDto,
    @CurrentUser('id') actor: bigint,
  ) {
    if (dto.review_id && this.reviewedWorkflows)
      return this.reviewedWorkflows.confirmReassignment(offeringId, dto, actor);
    requireReviewAtCutover();
    return this.enrollmentsService.confirmReassignment(offeringId, dto);
  }

  @Delete(':studentId')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove a student from a course offering',
  })
  @ApiParam({
    name: 'studentId',
    type: String,
    example: '4',
  })
  @ApiResponse({
    status: 204,
    description: 'Student removed',
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found, or student is not enrolled',
  })
  async remove(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Param('studentId', ParseBigIntPipe)
    studentId: bigint,
  ) {
    await this.enrollmentsService.remove(offeringId, studentId);
  }
}
