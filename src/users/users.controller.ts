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
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AssignUserDepartmentDto } from './dto/assign-user-department.dto';

import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const userExample = {
  id: '9',
  email: 'newlecturer@itc.edu.kh',
  full_name: 'Keo Sophal',
  gender: 'MALE',
  role: 'LECTURER',
  status: 'ACTIVE',
  created_at: '2026-09-23T08:00:00.000Z',
  updated_at: '2026-09-23T08:00:00.000Z',

  user_departments: [
    {
      department_id: '1',
      is_primary: true,

      departments: {
        id: '1',
        code: 'AMS',
        name: 'Applied Mathematics and Statistics',
        status: 'ACTIVE',
      },
    },
  ],
};

const departmentAssignmentExample = {
  department_id: '1',
  is_primary: true,
  created_at: '2026-09-29T10:00:00.000Z',

  departments: {
    id: '1',
    code: 'AMS',
    name: 'Applied Mathematics and Statistics',
    status: 'ACTIVE',
  },
};

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  // =========================================================
  // USERS
  // =========================================================

  @Get()
  @ApiOperation({
    summary:
      'List, search, filter, and paginate lecturer/admin accounts',
    description:
      'Staff-management endpoint. Returns ADMIN and LECTURER accounts only. Student accounts are managed through /students.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated lecturer/admin accounts with department information',
    schema: {
      example: {
        data: [userExample],

        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
        },

        filters: {
          search: null,
          role: 'LECTURER',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid search, role, status, page, or limit',
  })
  findAll(
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description:
      'User with department information',
    schema: {
      example: userExample,
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a lecturer or admin account',
    description:
      'Student accounts must be created through the student API so the user and student profile are created together.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created',
    schema: {
      example: userExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input. Student accounts must use the student creation API.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Email is already in use',
  })
  create(
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary:
      'Update a user (name, email, gender, status, or password). Role cannot be changed.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '9',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated',
    schema: {
      example: userExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, or trying to deactivate your own account',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Email is already in use, or the target is the last active admin',
  })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.usersService.update(
      id,
      dto,
      currentUser.id,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary:
      'Permanently delete an unreferenced student or lecturer account',
    description:
      'Admin accounts cannot be permanently deleted. Users with historical references must be deactivated instead.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '9',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description:
      'User deleted successfully',
    schema: {
      example: {
        message:
          'User deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot delete your own account, cannot delete an admin account, or the target role is not deletable',
  })
  @ApiResponse({
    status: 403,
    description:
      'Only an authenticated admin can use this endpoint',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'User has historical references and cannot be permanently deleted. Deactivate the account instead.',
  })
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
    @CurrentUser() currentUser: { id: bigint },
  ) {
    return this.usersService.remove(
      id,
      currentUser.id,
    );
  }

  // =========================================================
  // USER DEPARTMENTS
  // =========================================================

  @Get(':id/departments')
  @ApiOperation({
    summary:
      'Get all department assignments for a user',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '2',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description:
      'Departments assigned to the user',
    schema: {
      example: [
        departmentAssignmentExample,
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  getDepartments(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.usersService.getDepartments(id);
  }

  @Post(':id/departments')
  @ApiOperation({
    summary:
      'Assign a department to a user or update its primary status',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '2',
    description: 'User ID',
  })
  @ApiResponse({
    status: 201,
    description:
      'Department assigned to user',
    schema: {
      example:
        departmentAssignmentExample,
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Department does not exist or is inactive',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  assignDepartment(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body() dto: AssignUserDepartmentDto,
  ) {
    return this.usersService.assignDepartment(
      id,
      dto,
    );
  }

  @Delete(':id/departments/:departmentId')
  @ApiOperation({
    summary:
      'Remove a department assignment from a user',
  })
  @ApiParam({
    name: 'id',
    type: String,
    example: '2',
    description: 'User ID',
  })
  @ApiParam({
    name: 'departmentId',
    type: String,
    example: '1',
    description: 'Department ID',
  })
  @ApiResponse({
    status: 200,
    description:
      'Department removed from user',
    schema: {
      example: {
        message:
          'Department removed from user',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'User or department assignment not found',
  })
  removeDepartment(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Param(
      'departmentId',
      ParseBigIntPipe,
    )
    departmentId: bigint,
  ) {
    return this.usersService.removeDepartment(
      id,
      departmentId,
    );
  }
}