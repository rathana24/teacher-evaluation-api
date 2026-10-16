import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ParseCourseIdPipe } from './pipes/parse-course-id.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const courseExample = {
  id: '1',
  course_code: 'CS101',
  course_name: 'Intro to Computer Science',
  description: 'Fundamentals of programming and computer science',
  department_id: '1',
  departments: {
    id: '1',
    code: 'CS',
    name: 'Computer Science',
    status: 'ACTIVE',
    created_at: '2026-01-15T08:00:00.000Z',
    updated_at: '2026-01-15T08:00:00.000Z',
  },
  created_at: '2026-01-15T08:00:00.000Z',
  updated_at: '2026-01-15T08:00:00.000Z',
};

@ApiTags('courses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'List all courses' })
  @ApiResponse({
    status: 200,
    description: 'Array of courses',
    schema: { example: [courseExample] },
  })
  findAll() {
    return this.coursesService.findAll();
  }

  @Get('creation-receipts/:key')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Recover the original actor-bound course creation result', description: 'Use the original Idempotency-Key UUID v4 after an uncertain response. Returns {idempotency_key,course,already_applied:true}; the saved course is the original result, even after later edits/deletion or department deactivation. An absent receipt is 404 and does not prove that an in-flight request rolled back. Retry the original POST with the same key and input.' })
  @ApiParam({ name: 'key', type: String, format: 'uuid', description: 'The original Idempotency-Key UUID v4.' })
  @ApiResponse({ status: 200, description: 'Original actor-bound course creation receipt.' })
  @ApiResponse({ status: 404, description: 'No receipt visible for this actor. This does not prove that an in-flight request rolled back.' })
  creationReceipt(@CurrentUser('id') actorId: bigint, @Param('key') key: string) {
    return this.coursesService.creationReceipt(actorId,key);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a course by id' })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description:
      'Course ID as a signed integer string from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or out-of-range course ID',
  })
  @ApiResponse({
    status: 200,
    description: 'The course',
    schema: { example: courseExample },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course not found',
        error: 'Not Found',
      },
    },
  })
  findOne(@Param('id', ParseCourseIdPipe) id: bigint) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a course with an official or automatically allocated code', description: 'Omit course_code to allocate from a sanitized department prefix, for example GIC-001, under a transaction lock. Automatic allocation requires an Idempotency-Key UUID v4 header; retain it and the same input across retries. Optional keyed official-code requests receive the same guarantee. Unkeyed official-code requests retain legacy duplicate-409 behavior and cannot recover a lost response through a receipt. A keyed retry returns the original course object/code with HTTP 201; changed input returns 409/COURSE_CREATE_INPUT_MISMATCH. Stored course_code is authoritative; never blindly resubmit a generated frontend suggestion. Existing official codes retain their case/characters and exact global uniqueness; generated codes avoid case-insensitive numeric collisions. /auth/me advertises automatic_course_codes_v1 only with installed allocation/receipt prerequisites.' })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'UUID v4. Required when course_code is omitted; optional for a manual code. Generate once per intentional create and preserve until the result is known.', schema: { type: 'string', format: 'uuid' } })
  @ApiResponse({ status: 503, description: 'COURSE_CODE_SCHEMA_NOT_READY: required receipt deployment is unavailable. Retain the original input and key.' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, unsafe department ID, missing department or inactive department',
  })
  @ApiResponse({
    status: 201,
    description: 'Course created',
    schema: { example: courseExample },
  })
  @ApiResponse({
    status: 409,
    description: 'course_code already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'course_code already exists',
        error: 'Conflict',
      },
    },
  })
  create(@Body() dto: CreateCourseDto, @CurrentUser('id') actorId: bigint, @Headers('idempotency-key') key?: string) {
    return this.coursesService.create(dto,actorId,key);
  }

  @Put(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description:
      'Course ID as a signed integer string from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid or out-of-range course ID, invalid input or unavailable department',
  })
  @ApiResponse({
    status: 200,
    description: 'Course updated',
    schema: {
      example: { ...courseExample, updated_at: '2026-01-16T10:30:00.000Z' },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course not found',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'course_code already exists',
    schema: {
      example: {
        statusCode: 409,
        message: 'course_code already exists',
        error: 'Conflict',
      },
    },
  })
  update(
    @Param('id', ParseCourseIdPipe) id: bigint,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({
    name: 'id',
    type: String,
    example: '1',
    description:
      'Course ID as a signed integer string from -9223372036854775808 to 9223372036854775807.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or out-of-range course ID',
  })
  @ApiResponse({
    status: 409,
    description:
      'Course is referenced by teaching assignments or curriculum rules and cannot be deleted',
  })
  @ApiResponse({ status: 204, description: 'Course deleted' })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
    schema: {
      example: {
        statusCode: 404,
        message: 'Course not found',
        error: 'Not Found',
      },
    },
  })
  async remove(@Param('id', ParseCourseIdPipe) id: bigint) {
    await this.coursesService.remove(id);
  }
}
