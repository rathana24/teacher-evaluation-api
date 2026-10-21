import { CurrentUser } from '../common/decorators/current-user.decorator';
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

import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';
import { ParseAcademicYearIdPipe } from './pipes/parse-academic-year-id.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

const academicYearExample = {
  id: '1',
  name: '2026-2027',
  start_year: 2026,
  start_date: '2026-10-01T00:00:00.000Z',
  end_date: '2027-07-31T00:00:00.000Z',
  is_active: true,
  created_at: '2026-09-29T10:00:00.000Z',
  updated_at: '2026-09-29T10:00:00.000Z',
};

@ApiTags('academic-years')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('academic-years')
export class AcademicYearsController {
  constructor(private readonly academicYearsService: AcademicYearsService) {}

  @Get()
  @ApiOperation({ summary: 'List all academic years' })
  @ApiResponse({
    status: 200,
    description: 'Array of academic years',
    schema: { example: [academicYearExample] },
  })
  findAll() {
    return this.academicYearsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an academic year by id' })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Integer ID from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or out-of-range id' })
  @ApiResponse({
    status: 200,
    description: 'Academic year',
    schema: { example: academicYearExample },
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year not found',
  })
  findOne(@Param('id', ParseAcademicYearIdPipe) id: bigint) {
    return this.academicYearsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create an academic year',
    description:
      'ADMIN only. In the same SERIALIZABLE transaction as the new year, the server initializes the year from its immediate predecessor (start_year - 1): it copies missing student group placements and teaching assignments into new records, never overwriting existing destination records. The response includes a rollover object: status COMPLETE, NO_PREDECESSOR or UNAVAILABLE (with unavailable_reason STRUCTURED_START_YEAR_REQUIRED when start_year is missing), source_academic_year_id, and groups/assignments with copied, preserved and skipped counts, copied record/offering IDs and skip reasons. Clients must not repeat this copy themselves. Semesters are not created by this endpoint; use POST /academic-years/setup for an idempotent year + semesters + rollover setup. The integrated_academic_year_rollover_v1 capability identifies this server-side rollover.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Academic year created, with the server-side rollover result',
    schema: {
      example: {
        ...academicYearExample,
        rollover: {
          status: 'COMPLETE',
          unavailable_reason: null,
          source_academic_year_id: '0',
          groups: {
            copied: 2,
            preserved: 0,
            skipped: 1,
            copied_record_ids: ['101', '102'],
            reasons: [{ student_id: '7', reason: 'INACTIVE_ACCOUNT' }],
          },
          assignments: {
            copied: 1,
            preserved: 0,
            skipped: 0,
            copied_offering_ids: ['55'],
            reasons: [],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, impossible calendar date, or invalid date order',
  })
  @ApiResponse({
    status: 409,
    description:
      'Academic year already exists or activation conflicts with another change',
  })
  create(
    @Body() dto: CreateAcademicYearDto,
    @CurrentUser() actor: { id: bigint },
  ) {
    return this.academicYearsService.create(dto, actor.id);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update an academic year' })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Integer ID from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic year updated',
    schema: { example: academicYearExample },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input/id, null required update value, impossible calendar date, or invalid date order',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Academic year already exists, activation conflicts, or curriculum protects start_year',
  })
  update(
    @Param('id', ParseAcademicYearIdPipe) id: bigint,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.academicYearsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an academic year' })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description: 'Integer ID from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({ status: 400, description: 'Invalid or out-of-range id' })
  @ApiResponse({
    status: 204,
    description: 'Academic year deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Academic year not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Academic year is used by semesters',
  })
  async remove(@Param('id', ParseAcademicYearIdPipe) id: bigint) {
    await this.academicYearsService.remove(id);
  }
}
