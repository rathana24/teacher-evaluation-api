import { ApiPropertyOptional } from '@nestjs/swagger';
import { class_type } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CourseOfferingGroupScopeDto } from './course-offering-group-scope.dto';

export class UpdateCourseOfferingDto {
  @ApiPropertyOptional({
    example: '1',
    description: 'ID of an existing course',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  course_id?: string;

  @ApiPropertyOptional({
    example: '2',
    description: 'ID of a user with role LECTURER',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  lecturer_id?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'ID of an existing semester',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  semester_id?: string;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 5,
    description:
      'Student year level intended for this course offering',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  year_level?: number;

  @ApiPropertyOptional({
    example: class_type.COURSE,
    enum: class_type,
    description: 'Class type for this course offering',
  })
  @IsOptional()
  @IsEnum(class_type)
  class_type?: class_type;

  @ApiPropertyOptional({
    maxLength: 50,
    example: 'A',
    description: 'Optional section or class code',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  section_code?: string;

  @ApiPropertyOptional({
    type: [CourseOfferingGroupScopeDto],
    description:
      'Replacement explicit group scopes for this offering. Omit to preserve existing scopes.',
    example: [
      {
        academic_year_id: '1',
        generation_id: '2',
        major_id: '3',
        year_level: 4,
        class_groups: ['A', 'B'],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseOfferingGroupScopeDto)
  group_scopes?: CourseOfferingGroupScopeDto[];
}