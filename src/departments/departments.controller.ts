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

import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';

const departmentExample = {
  id: '1',
  code: 'AMS',
  name: 'Applied Mathematics and Statistics',
  status: 'ACTIVE',
  created_at: '2026-09-29T10:00:00.000Z',
  updated_at: '2026-09-29T10:00:00.000Z',
  _count: {
    courses: 3,
    user_departments: 4,
  },
};

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get all departments',
  })
  @ApiResponse({
    status: 200,
    description: 'List of departments',
    schema: {
      example: [departmentExample],
    },
  })
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a department by ID',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Department ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Department found',
    schema: {
      example: departmentExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a department',
  })
  @ApiBody({
    type: CreateDepartmentDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Department created successfully',
    schema: {
      example: departmentExample,
    },
  })
  @ApiResponse({
    status: 409,
    description:
      'Department code or name already exists',
  })
  create(
    @Body() createDepartmentDto: CreateDepartmentDto,
  ) {
    return this.departmentsService.create(
      createDepartmentDto,
    );
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a department',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Department ID',
  })
  @ApiBody({
    type: UpdateDepartmentDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Department updated successfully',
    schema: {
      example: departmentExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Department code or name already exists',
  })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(
      id,
      updateDepartmentDto,
    );
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a department',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    description: 'Department ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Department deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Department not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Department has users or courses and cannot be deleted',
  })
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.departmentsService.remove(id);
  }
}