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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { StudentGenerationsService } from './student-generations.service';
import { CreateStudentGenerationDto } from './dto/create-student-generation.dto';
import { UpdateStudentGenerationDto } from './dto/update-student-generation.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseStudentGenerationIdPipe } from './pipes/parse-student-generation-id.pipe';
import { StudentGenerationsQueryDto } from './dto/student-generations-query.dto';

const studentGenerationExample = {
  id: '1',
  name: 'Gen 43',
  ownership_state: 'MAJOR_SCOPED',
  major_id: '2',
  generation_number: 43,
  majors: { id: '2', code: 'DS', name: 'Data Science', department_id: '1' },
  entry_academic_year_id: '1',
  starting_year_level: 1,
  created_at: '2026-10-04T06:30:00.000Z',
  updated_at: '2026-10-04T06:30:00.000Z',
  entry_academic_year: {
    id: '1',
    name: '2025-2026',
    start_year: 2025,
  },
  _count: {
    students: 0,
    evaluation_targets: 0,
  },
};

@ApiTags('student-generations')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('student-generations')
export class StudentGenerationsController {
  constructor(
    private readonly studentGenerationsService: StudentGenerationsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get cohorts, numerically sorted within each major',
    description:
      'Optional major_id filters explicit ownership. Unmapped legacy rows retain null major_id/generation_number and LEGACY_READ_ONLY. Catalog reads do not infer ownership from current student placements.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of student generations',
    schema: {
      example: [studentGenerationExample],
    },
  })
  findAll(@Query() query: StudentGenerationsQueryDto) {
    return this.studentGenerationsService.findAll(
      query.major_id === undefined ? undefined : BigInt(query.major_id),
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a student generation by ID',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Student generation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student generation found',
    schema: {
      example: studentGenerationExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Student generation not found',
  })
  findOne(@Param('id', ParseStudentGenerationIdPipe) id: bigint) {
    return this.studentGenerationsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create an integer cohort owned by an explicit major',
    description:
      'Supply major_id, generation_number, entry_academic_year_id and optional starting_year_level. Numeric name aliases require the same explicit major and cannot disagree with generation_number. Same-major duplicates conflict; another major may independently use the same number and a different entry year. /auth/me advertises major_scoped_generations only with REQUIRE_MAJOR_SCOPED_COHORTS=true and verified connected-schema prerequisites. This capability describes write support, including an empty catalog; legacy ownership review, frontend acceptance and approved normal rollout are separate. Reviewed mapping uses ADMIN-only /mapping/inventory, /preview, /confirm and /receipts/:reviewId, disabled by default and test-only.',
  })
  @ApiBody({
    type: CreateStudentGenerationDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Student generation created successfully',
    schema: {
      example: studentGenerationExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input; starting_year_level must be between 1 and 5',
  })
  @ApiResponse({
    status: 404,
    description: 'Major or academic year not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Student generation already exists',
  })
  create(
    @Body()
    createStudentGenerationDto: CreateStudentGenerationDto,
  ) {
    return this.studentGenerationsService.create(createStudentGenerationDto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Preserve canonical identity or edit a legacy display label',
    description:
      'Canonical major, number and entry metadata are immutable. Legacy ownership requires a reviewed mapping; compatibility label edits preserve captured historical labels. Unchanged canonical identity returns its existing representation.',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Student generation ID',
  })
  @ApiBody({
    type: UpdateStudentGenerationDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Student generation updated successfully',
    schema: {
      example: studentGenerationExample,
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input; starting_year_level must be between 1 and 5',
  })
  @ApiResponse({
    status: 404,
    description: 'Student generation or academic year not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Student generation already exists or is currently in use',
  })
  update(
    @Param('id', ParseStudentGenerationIdPipe) id: bigint,
    @Body()
    updateStudentGenerationDto: UpdateStudentGenerationDto,
  ) {
    return this.studentGenerationsService.update(
      id,
      updateStudentGenerationDto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a student generation',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Student generation ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student generation deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student generation not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student generation has students or evaluation references and cannot be deleted',
  })
  remove(@Param('id', ParseStudentGenerationIdPipe) id: bigint) {
    return this.studentGenerationsService.remove(id);
  }
}
