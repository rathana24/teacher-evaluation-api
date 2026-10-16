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
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { MajorsService } from './majors.service';
import { CreateMajorDto } from './dto/create-major.dto';
import { UpdateMajorDto } from './dto/update-major.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseMajorIdPipe } from './pipes/parse-major-id.pipe';

const majorExample = {
  id: '1',
  code: 'AMS',
  name: 'Applied Mathematics and Statistics',
  department_id: '1',
  created_at: '2026-10-04T06:00:00.000Z',
  updated_at: '2026-10-04T06:00:00.000Z',
  departments: {
    id: '1',
    code: 'AMS',
    name: 'Applied Mathematics and Statistics',
  },
  _count: {
    student_academic_records: 0,
    course_year_rules: 0,
  },
};

@ApiTags('majors')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('majors')
export class MajorsController {
  constructor(private readonly majorsService: MajorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all majors',
  })
  @ApiResponse({
    status: 200,
    description: 'List of majors',
    schema: {
      example: [majorExample],
    },
  })
  findAll() {
    return this.majorsService.findAll();
  }

  @Get(':id')
  @ApiResponse({
    status: 400,
    description: 'Malformed major ID or ID outside signed 64-bit storage range',
  })
  @ApiOperation({
    summary: 'Get a major by ID',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    type: String,
    description:
      'Major ID; must fit signed 64-bit storage (-9223372036854775808 to 9223372036854775807).',
  })
  @ApiResponse({
    status: 200,
    description: 'Major found',
    schema: {
      example: majorExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Major not found',
  })
  findOne(@Param('id', ParseMajorIdPipe) id: bigint) {
    return this.majorsService.findOne(id);
  }

  @Post()
  @ApiResponse({
    status: 400,
    description:
      'Invalid major fields; name must be nonblank after trimming and department_id must fit storage range',
  })
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a major',
  })
  @ApiBody({
    type: CreateMajorDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Major created successfully',
    schema: {
      example: majorExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Major code or name already exists',
  })
  create(@Body() createMajorDto: CreateMajorDto) {
    return this.majorsService.create(createMajorDto);
  }

  @Put(':id')
  @ApiResponse({
    status: 400,
    description:
      'Invalid major ID or fields; supplied values must be non-null, name nonblank and IDs within storage range',
  })
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a major',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    type: String,
    description:
      'Major ID; must fit signed 64-bit storage (-9223372036854775808 to 9223372036854775807).',
  })
  @ApiBody({
    type: UpdateMajorDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Major updated successfully',
    schema: {
      example: majorExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Major or department not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Major code or name already exists',
  })
  update(
    @Param('id', ParseMajorIdPipe) id: bigint,
    @Body() updateMajorDto: UpdateMajorDto,
  ) {
    return this.majorsService.update(id, updateMajorDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 400,
    description: 'Malformed major ID or ID outside signed 64-bit storage range',
  })
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a major',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    type: String,
    description:
      'Major ID; must fit signed 64-bit storage (-9223372036854775808 to 9223372036854775807).',
  })
  @ApiResponse({
    status: 200,
    description: 'Major deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Major not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Major is currently in use and cannot be deleted',
  })
  remove(@Param('id', ParseMajorIdPipe) id: bigint) {
    return this.majorsService.remove(id);
  }
}
