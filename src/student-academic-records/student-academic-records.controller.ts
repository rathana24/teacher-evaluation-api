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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ParseBigIntPipe } from '../common/pipes/parse-bigint.pipe';

import { CreateStudentAcademicRecordDto } from './dto/create-student-academic-record.dto';
import { UpdateStudentAcademicRecordDto } from './dto/update-student-academic-record.dto';
import { StudentAcademicRecordsService } from './student-academic-records.service';

@ApiTags('student-academic-records')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('student-academic-records')
export class StudentAcademicRecordsController {
  constructor(
    private readonly studentAcademicRecordsService: StudentAcademicRecordsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a student academic record',
  })
  @ApiResponse({
    status: 201,
    description: 'Student academic record created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student, academic year, or major not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Academic record already exists for this student and academic year',
  })
  create(
    @Body()
    createStudentAcademicRecordDto: CreateStudentAcademicRecordDto,
  ) {
    return this.studentAcademicRecordsService.create(
      createStudentAcademicRecordDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'List student academic records',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic records returned successfully',
  })
  findAll() {
    return this.studentAcademicRecordsService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a student academic record by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic record returned successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student academic record not found',
  })
  findOne(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.studentAcademicRecordsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a student academic record',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic record updated successfully',
  })
  @ApiResponse({
    status: 404,
    description:
      'Student academic record, student, academic year, or major not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Academic record already exists for this student and academic year',
  })
  update(
    @Param('id', ParseBigIntPipe) id: bigint,
    @Body()
    updateStudentAcademicRecordDto: UpdateStudentAcademicRecordDto,
  ) {
    return this.studentAcademicRecordsService.update(
      id,
      updateStudentAcademicRecordDto,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a student academic record',
  })
  @ApiResponse({
    status: 200,
    description: 'Student academic record deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Student academic record not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Student academic record cannot be deleted because related records exist',
  })
  remove(
    @Param('id', ParseBigIntPipe) id: bigint,
  ) {
    return this.studentAcademicRecordsService.remove(id);
  }
}