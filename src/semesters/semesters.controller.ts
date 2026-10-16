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

import { SemestersService } from './semesters.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { ParseSemesterIdPipe } from './pipes/parse-semester-id.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

const semesterExample = {
  id: '1',
  semester_name: 'Semester 1',
  semester_number: 1,
  academic_year_id: '1',
  start_date: '2026-10-01T00:00:00.000Z',
  end_date: '2027-02-28T00:00:00.000Z',
  created_at: '2026-09-29T10:00:00.000Z',
  updated_at: '2026-09-29T10:00:00.000Z',
  academic_years: {
    id: '1',
    name: '2026-2027',
    start_year: 2026,
    start_date: '2026-10-01T00:00:00.000Z',
    end_date: '2027-07-31T00:00:00.000Z',
    is_active: true,
    created_at: '2026-09-29T10:00:00.000Z',
    updated_at: '2026-09-29T10:00:00.000Z',
  },
};

@ApiTags('semesters')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('semesters')
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Get()
  @ApiOperation({
    summary: 'List all semesters',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of semesters with academic year information',
    schema: {
      example: [semesterExample],
    },
  })
  findAll() {
    return this.semestersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a semester by id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Integer ID from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or out-of-range id' })
  @ApiResponse({
    status: 200,
    description: 'Semester with academic year information',
    schema: {
      example: semesterExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Semester not found',
  })
  findOne(@Param('id', ParseSemesterIdPipe) id: bigint) {
    return this.semestersService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a semester',
  })
  @ApiResponse({
    status: 201,
    description: 'Semester created',
    schema: {
      example: semesterExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, unsafe academic year ID, academic year not found, impossible calendar date, or invalid date order',
  })
  @ApiResponse({
    status: 409,
    description: 'Semester already exists for that academic year',
  })
  create(@Body() dto: CreateSemesterDto) {
    return this.semestersService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a semester',
    description:
      'A semester referenced by an offering with any evaluation keeps its academic_year_id. Create a new semester and offering for a changed year; identical year IDs and display/date metadata remain editable.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Integer ID from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({
    status: 200,
    description: 'Semester updated',
    schema: {
      example: semesterExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input/id, null required update value, unsafe academic year ID, academic year not found, impossible calendar date, or invalid date order',
  })
  @ApiResponse({
    status: 404,
    description: 'Semester not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Duplicate semester or SEMESTER_HISTORY_PROTECTED when moving an evaluated semester to another academic year',
  })
  update(
    @Param('id', ParseSemesterIdPipe) id: bigint,
    @Body() dto: UpdateSemesterDto,
  ) {
    return this.semestersService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a semester',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Integer ID from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or out-of-range id' })
  @ApiResponse({
    status: 204,
    description: 'Semester deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Semester not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Semester is used by course offerings',
  })
  async remove(@Param('id', ParseSemesterIdPipe) id: bigint) {
    await this.semestersService.remove(id);
  }
}
