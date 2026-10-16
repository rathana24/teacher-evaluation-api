import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { student_progression_action } from '@prisma/client';
import {
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsCohortDatabaseId } from '../../student-generations/validation/cohort-fields';

export class CreateStudentAcademicRecordDto {
  @ApiPropertyOptional({
    type: String,
    example: '5',
    description:
      'Explicit destination cohort ID for major-owned yearly assignments. Required for cohort-tracked students, including TRANSFER. Legacy omission remains transitional; unresolved history needs reviewed mapping.',
  })
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsCohortDatabaseId()
  generation_id?: string;

  @ApiPropertyOptional({
    enum: student_progression_action,
    default: 'NORMAL',
    description:
      'Administrator-approved progression state for this year. Only explicit RESUME clears a previous PAUSE. REPEAT and TRANSFER use the supplied approved year level and major as a new progression anchor. Groups are never carried to another year.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(student_progression_action)
  progression_action?: student_progression_action;

  @ApiProperty({
    example: '1',
    description: 'Student profile ID from the students table',
    type: String,
  })
  @IsCohortDatabaseId()
  student_id!: string;

  @ApiProperty({
    example: '1',
    description: 'Academic year ID',
    type: String,
  })
  @IsCohortDatabaseId()
  academic_year_id!: string;

  @ApiProperty({
    example: 4,
    description: 'Actual year level of the student for this academic year',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  year_level!: number;

  @ApiProperty({
    example: '1',
    description: 'Major ID',
    type: String,
  })
  @IsCohortDatabaseId()
  major_id!: string;

  @ApiPropertyOptional({
    example: 'A',
    description: 'Optional class or group of the student',
    maxLength: 50,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  class_group?: string | null;
}
