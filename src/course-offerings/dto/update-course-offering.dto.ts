import { ApiPropertyOptional } from '@nestjs/swagger';
import { class_type } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
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
  ValidateIf,
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
    type: 'integer',
    nullable: true,
    minimum: 1,
    maximum: 5,
    description:
      'Omit to preserve the saved year, including a legacy null. Every changed course/semester/year/group context requires year 1–5 and applicable enabled curriculum approval; a resolved year cannot be cleared. Unchanged-context lecturer/display edits do not require a later approval.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(5)
  year_level?: number | null;

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
    description: 'Optional display class label; changing it never creates another assignment identity. Omit to preserve it. Identity excludes labels and groups; existing legacy duplicate conflicts require separate review without merging history.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
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
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseOfferingGroupScopeDto)
  group_scopes?: CourseOfferingGroupScopeDto[];
}
