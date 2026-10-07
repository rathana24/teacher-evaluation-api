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
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';

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
  constructor(
    private readonly majorsService: MajorsService,
  ) {}

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
  @ApiOperation({
    summary: 'Get a major by ID',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Major ID',
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
  findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.majorsService.findOne(id);
  }

  @Post()
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
  create(
    @Body() createMajorDto: CreateMajorDto,
  ) {
    return this.majorsService.create(createMajorDto);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a major',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Major ID',
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
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateMajorDto: UpdateMajorDto,
  ) {
    return this.majorsService.update(
      id,
      updateMajorDto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a major',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Major ID',
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
    description:
      'Major is currently in use and cannot be deleted',
  })
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.majorsService.remove(id);
  }
}