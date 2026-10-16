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
import { ParseDepartmentIdPipe } from './pipes/parse-department-id.pipe';

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
  constructor(private readonly departmentsService: DepartmentsService) {}

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
  @ApiResponse({
    status: 400,
    description:
      'Malformed department ID or ID outside signed 64-bit storage range',
  })
  @ApiOperation({
    summary: 'Get a department by ID',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    type: String,
    description:
      'Department ID; must fit signed 64-bit storage (-9223372036854775808 to 9223372036854775807).',
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
  findOne(@Param('id', ParseDepartmentIdPipe) id: bigint) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @ApiResponse({
    status: 400,
    description:
      'Invalid department fields; code and name must be nonblank after trimming',
  })
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
    description: 'Department code or name already exists',
  })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Put(':id')
  @ApiResponse({
    status: 400,
    description:
      'Invalid department ID or fields; supplied values must be non-null and text must be nonblank after trimming',
  })
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a department',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    type: String,
    description:
      'Department ID; must fit signed 64-bit storage (-9223372036854775808 to 9223372036854775807).',
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
    description: 'Department code or name already exists',
  })
  update(
    @Param('id', ParseDepartmentIdPipe) id: bigint,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @ApiResponse({
    status: 400,
    description:
      'Malformed department ID or ID outside signed 64-bit storage range',
  })
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Delete a department',
  })
  @ApiParam({
    name: 'id',
    example: '1',
    type: String,
    description:
      'Department ID; must fit signed 64-bit storage (-9223372036854775808 to 9223372036854775807).',
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
    description: 'Department has users or courses and cannot be deleted',
  })
  remove(@Param('id', ParseDepartmentIdPipe) id: bigint) {
    return this.departmentsService.remove(id);
  }
}
