import {
  Body,
  Controller,
  Delete,
  Get,
  Optional,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { StudentsService } from './students.service';
import { StudentImportService } from './student-import.service';
import { StudentExportService } from './student-export.service';

import { CreateStudentDto } from './dto/create-student.dto';
import { ImportStudentsDto } from './dto/import-students.dto';
import { StudentExportQueryDto } from './dto/student-export-query.dto';
import { StudentGroupOptionsQueryDto } from './dto/student-group-options-query.dto';
import { BulkUpdateStudentGroupDto } from './dto/bulk-update-student-group.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentQueryDto } from './dto/student-query.dto';

import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewedWorkflowsService } from '../reviewed-workflows/reviewed-workflows.service';
import { requireReviewAtCutover } from '../reviewed-workflows/reviewed-operation.store';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly studentImportService: StudentImportService,
    private readonly studentExportService: StudentExportService,
    @Optional() private readonly reviewedWorkflows?: ReviewedWorkflowsService,
  ) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a student',
    description: 'Use a saved generation_id, not its number. Major-owned cohorts must match the initial major and structured chronology; account/profile/placement/INITIAL evidence commit atomically. REQUIRE_MAJOR_SCOPED_COHORTS=true rejects legacy cohort creation with 400/MAJOR_SCOPED_COHORT_REQUIRED. Strict writes against an incomplete deployment return 503/COHORT_SCHEMA_NOT_READY. Student profile and yearly records expose explicit cohort metadata; unresolved historical links stay null.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully',
  })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Post('import')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Import students',
    description:
      'Major-aware mode accepts major_id plus generation_number (or a numeric generation alias), validates every spreadsheet major before writes and records an INITIAL yearly cohort assignment atomically per new student. New cohorts require entry_academic_year_id; existing cohorts retain their entry metadata. Existing student codes are skipped without editing accounts/history. Runtime row failures remain partial results. REQUIRE_MAJOR_SCOPED_COHORTS=true rejects every unscoped legacy import before writes with 400/MAJOR_SCOPED_COHORT_REQUIRED, including skip-only retries. No automatic major inference or compatibility fallback. Strict mode requires deployed cohort schema; see /auth/me capabilities.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student import completed',
  })
  async importStudents(@Body() dto: ImportStudentsDto) {
    return this.studentImportService.importStudents(dto);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List students',
    description: 'With academic_year_id, generation_id filters the cohort resolved from that exact yearly record or an earlier approved anchor, before pagination. academic_context.cohort_context exposes safe major/number metadata and RESOLVED, LEGACY_UNVERIFIED or UNAVAILABLE status. Unknown tracked history never borrows the latest profile cohort. Without a year, generation_id retains compatibility-profile filtering.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated student list with evaluation progress',
  })
  async findAll(@Query() query: StudentQueryDto) {
    return this.studentsService.findAll(query);
  }

  /*
   * Keep this route before :id.
   *
   * Otherwise "export" could be interpreted as the
   * dynamic student ID parameter.
   */
  @Get('export')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get student progress export data',
    description:
      'Returns the complete authorized student progress dataset for frontend Excel/CSV generation. With an academic year, generation filtering and row labels use selected-year cohort history; unresolved tracked history returns generation:null and an explicit cohort_context reason. Without a year, generation remains compatibility-profile metadata. This endpoint contains identifiable participation data and does not expose anonymous evaluation answers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete student progress export dataset',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid export scope',
  })
  @ApiResponse({
    status: 404,
    description: 'Generation, academic year, or semester not found',
  })
  async exportStudents(@Query() query: StudentExportQueryDto) {
    return this.studentExportService.getExportData(query);
  }

  @Get('group-options')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List class group options for a student placement scope',
    description:
      'Returns normalized class groups found in existing student academic records for the selected academic year, generation, and major. Uses each record cohort link, preserving old options after a future transfer. Only wholly legacy histories use the transitional profile fallback. Canonical selections additionally return safe generation ownership/major/number metadata. No group is copied into another year.',
  })
  @ApiResponse({
    status: 200,
    description: 'Class group options returned successfully',
  })
  async getGroupOptions(
    @Query()
    query: StudentGroupOptionsQueryDto,
  ) {
    return this.studentsService.getGroupOptions(
      BigInt(query.academic_year_id),
      BigInt(query.generation_id),
      BigInt(query.major_id),
    );
  }

  @Put('bulk/class-group')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Bulk update student class group',
    description:
      'Updates existing academic-year placements using PROFILE student_ids. Use POST /bulk/class-group/preview and /confirm for review-bound impact and durable retry. This PUT also accepts review_id with identical inputs. Legacy omission is rejected after REQUIRE_REVIEWED_CONFIRMATION=true. No missing placements or historical enrollment/participant rows are created or rewritten.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student class groups updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid group or one or more students do not have an existing placement for the selected academic year',
  })
  async bulkUpdateClassGroup(
    @Body()
    dto: BulkUpdateStudentGroupDto,
    @CurrentUser('id') actor: bigint,
  ) {
    if (dto.review_id && this.reviewedWorkflows)
      return this.reviewedWorkflows.confirmPlacement(
        { ...dto, review_id: dto.review_id },
        actor,
      );
    requireReviewAtCutover();
    return this.studentsService.bulkUpdateClassGroup(
      BigInt(dto.academic_year_id),

      dto.student_ids.map((studentId) => BigInt(studentId)),

      dto.class_group,
    );
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get a student by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Student profile ID',
    example: '1',
  })
  @ApiQuery({
    name: 'academic_year_id',
    required: false,
    type: String,
    description:
      'Optional academic year used to calculate effective academic placement',
  })
  @ApiResponse({
    status: 200,
    description: 'Student details',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async findOne(
    @Param('id', ParseBigIntPipe)
    id: bigint,

    @Query('academic_year_id')
    academicYearId?: string,
  ) {
    return this.studentsService.findOne(id, academicYearId);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a student',
    description: 'Personal edits preserve cohort and academic history. Omit generation_id or repeat its existing ID; changing it returns 409 COHORT_CHANGE_REQUIRES_TRANSFER. No cohort change, major transfer or resume is performed here. Empty or cohort-only unchanged updates write nothing.',
  })
  @ApiParam({
    name: 'id',
    description: 'Student profile ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student not found',
  })
  async update(
    @Param('id', ParseBigIntPipe)
    id: bigint,

    @Body()
    dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a student',
  })
  @ApiParam({
    name: 'id',
    description: 'Student profile ID',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: 'Student deleted successfully',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student has historical records and cannot be permanently deleted',
  })
  async remove(
    @Param('id', ParseBigIntPipe)
    id: bigint,
  ) {
    return this.studentsService.remove(id);
  }
}
