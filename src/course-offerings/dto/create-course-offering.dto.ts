import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { class_type } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { CourseOfferingGroupScopeDto } from './course-offering-group-scope.dto';

export class CreateCourseOfferingDto {
  @ApiProperty({
    example: '1',
    description: 'ID of an existing course',
  })
  @IsNumberString({ no_symbols: true })
  course_id!: string;

  @ApiProperty({
    example: '2',
    description: 'ID of a user with role LECTURER',
  })
  @IsNumberString({ no_symbols: true })
  lecturer_id!: string;

  @ApiProperty({
    example: '1',
    description: 'ID of an existing semester',
  })
  @IsNumberString({ no_symbols: true })
  semester_id!: string;

  @ApiProperty({
    example: 4,
    type: 'integer',
    nullable: false,
    minimum: 1,
    maximum: 5,
    description:
      'Required student year 1–5, approved by an enabled applicable curriculum revision in the selected semester academic year, including offerings without group_scopes. Numeric-string compatibility is retained; null/boolean values are invalid.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(5)
  year_level!: number;

  @ApiProperty({
    example: class_type.COURSE,
    enum: class_type,
    description: 'Required class type for a new course offering',
  })
  @IsEnum(class_type)
  class_type!: class_type;

  @ApiPropertyOptional({
    maxLength: 50,
    example: 'A',
    description: 'Optional display class label. It is not part of assignment identity and cannot distinguish otherwise duplicate course/lecturer/semester/year/class_type rows or prove student group membership.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  section_code?: string;

  @ApiPropertyOptional({
    type: [CourseOfferingGroupScopeDto],
    description: 'Explicit student group scopes served by this offering',
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
