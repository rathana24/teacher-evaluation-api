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
  course_offering_id: '1',

  selection: {
    academic_year_id: '2',
    generation_id: '1',
    year_level: 4,
    major_id: '1',
    class_groups: ['AMS1-A'],
  },

  matched_count: 30,
  already_enrolled_count: 3,
  new_enrollment_count: 27,
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
  course_offering_id: '1',
  matched_count: 30,
  enrolled_count: 27,
  already_enrolled_count: 3,
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
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'List students enrolled in a course offering',
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
    return this.enrollmentsService.findAllForOffering(
      offeringId,
    );
  }

  @Post()
  @ApiOperation({
    summary:
      'Enroll one student in a course offering',
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
      'Invalid input, student_id is not a STUDENT, or student account is not ACTIVE',
  })
  @ApiResponse({
    status: 404,
    description: 'Course offering not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student is already enrolled in this course offering',
  })
  create(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(
      offeringId,
      dto,
    );
  }

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Preview students matching a group before enrollment',
    description:
      'Resolves the selected academic year, generation, effective year level, major, and class groups into explicit ACTIVE student accounts. Send the returned confirmed_student_ids unchanged to the bulk confirmation endpoint. No enrollment rows are created.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Matching students and enrollment counts',
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
  ) {
    return this.enrollmentsService.previewGroup(
      offeringId,
      dto,
    );
  }

  @Post('bulk')
  @ApiOperation({
    summary:
      'Confirm and enroll a selected student group',
    description:
      'Requires the confirmed_student_ids returned by preview. Re-resolves the selected group transactionally and rejects confirmation if the student set changed. Students who are already enrolled are skipped.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Group enrollment completed',
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
  ) {
    return this.enrollmentsService.bulkCreate(
      offeringId,
      dto,
    );
  }

  @Post('reassignment/preview')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Preview the impact of reassigning a student enrollment',
    description:
      'Validates the target offering against the student placement and reports frozen evaluation participants, drafts, and submissions. No enrollment or evaluation data is changed.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Reassignment impact preview returned successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid target offering or student placement does not match the target group scope',
  })
  @ApiResponse({
    status: 404,
    description:
      'Source enrollment or target offering not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student is already enrolled in the target offering',
  })
  previewReassignment(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Body()
    dto: EnrollmentReassignmentDto,
  ) {
    return this.enrollmentsService.previewReassignment(
      offeringId,
      dto,
    );
  }

  @Post('reassignment/confirm')
  @ApiOperation({
    summary:
      'Confirm a previewed student enrollment reassignment',
    description:
      'Re-validates the source enrollment, target offering group scope, student placement, target enrollment state, and evaluation impact inside one transaction. The operation moves only the enrollment. Frozen evaluation participants and academic placement records are preserved.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Student enrollment reassigned successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid reassignment input',
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
  ) {
    return this.enrollmentsService.confirmReassignment(
      offeringId,
      dto,
    );
  }

  @Delete(':studentId')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Remove a student from a course offering',
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
    description:
      'Course offering not found, or student is not enrolled',
  })
  async remove(
    @Param('offeringId', ParseBigIntPipe)
    offeringId: bigint,

    @Param('studentId', ParseBigIntPipe)
    studentId: bigint,
  ) {
    await this.enrollmentsService.remove(
      offeringId,
      studentId,
    );
  }
}