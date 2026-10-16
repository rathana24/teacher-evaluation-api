import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseAcademicRecordIdPipe } from './pipes/parse-academic-record-id.pipe';

import { CreateStudentAcademicRecordDto } from './dto/create-student-academic-record.dto';
import { UpdateStudentAcademicRecordDto } from './dto/update-student-academic-record.dto';
import { StudentAcademicRecordsService } from './student-academic-records.service';

@ApiTags('student-academic-records')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('student-academic-records')
export class StudentAcademicRecordsController {
  constructor(
    private readonly studentAcademicRecordsService: StudentAcademicRecordsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a student academic record',
    description:
      'For cohort-tracked students, supply generation_id and append after the latest unambiguous resolved year. TRANSFER requires an explicit different destination cohort belonging to major_id; placement, immutable evidence and compatibility profile pointer commit atomically. NORMAL/REPEAT/PAUSE/RESUME retain the latest cohort. PAUSE persists until explicit RESUME and yearly groups never carry forward. Unresolved/backdated history requires review. REQUIRE_MAJOR_SCOPED_COHORTS=true rejects new unresolved placements with 400/MAJOR_SCOPED_COHORT_REQUIRED, and returns 503/COHORT_SCHEMA_NOT_READY if the connected deployment is incomplete. Existing unresolved history is never automatically backfilled.',
  })
  @ApiBody({
    type: CreateStudentAcademicRecordDto,
    examples: {
      repeat: {
        summary: 'Approve a repeat placement',
        value: {
          student_id: '12',
          academic_year_id: '7',
          year_level: 2,
          major_id: '3',
          generation_id: '5',
          class_group: 'A',
          progression_action: 'REPEAT',
        },
      },
      transfer: {
        summary: 'Approve a transfer placement and destination major',
        value: {
          student_id: '12',
          academic_year_id: '8',
          year_level: 3,
          major_id: '4',
          generation_id: '9',
          class_group: 'B',
          progression_action: 'TRANSFER',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid progression state; resumption without a previous pause; missing structured chronology.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student academic record created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student, academic year, or major not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Academic record already exists for this student and academic year',
  })
  create(
    @Body()
    createStudentAcademicRecordDto: CreateStudentAcademicRecordDto,
  ) {
    return this.studentAcademicRecordsService.create(
      createStudentAcademicRecordDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List student academic records',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic records returned successfully',
  })
  findAll() {
    return this.studentAcademicRecordsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a student academic record by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic record returned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student academic record not found',
  })
  findOne(@Param('id', ParseAcademicRecordIdPipe) id: bigint) {
    return this.studentAcademicRecordsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a student academic record',
    description:
      'Resolved student/year/major/cohort identity is immutable; repeating the same generation_id is allowed. Legacy links require reviewed mapping rather than a PUT backfill. TRANSFER requires a new yearly placement, not a changed label on an INITIAL assignment. Strict cohort mode also rejects identity moves or TRANSFER labels on unresolved legacy records. Non-identity group/year-level/progression corrections retain their earlier guards. Only explicit RESUME clears a pause; enrollment, participant, draft and response history are not rewritten.',
  })
  @ApiBody({
    type: UpdateStudentAcademicRecordDto,
    examples: {
      pause: {
        summary: 'Pause this student',
        value: { progression_action: 'PAUSE' },
      },
      resume: {
        summary: 'Explicitly resume at the approved placement',
        value: {
          progression_action: 'RESUME',
          year_level: 2,
          major_id: '3',
          class_group: 'A',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid progression transition or attempted movement/reset of an exception record.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic record updated successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Student academic record, student, academic year, or major not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Academic record already exists for this student and academic year',
  })
  update(
    @Param('id', ParseAcademicRecordIdPipe) id: bigint,
    @Body()
    updateStudentAcademicRecordDto: UpdateStudentAcademicRecordDto,
  ) {
    return this.studentAcademicRecordsService.update(
      id,
      updateStudentAcademicRecordDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a student academic record',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic record deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student academic record not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student academic record cannot be deleted because related records exist',
  })
  remove(@Param('id', ParseAcademicRecordIdPipe) id: bigint) {
    return this.studentAcademicRecordsService.remove(id);
  }
}
