import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStudentAcademicRecordDto {
  @ApiProperty({
    example: '1',
    description: 'Student profile ID from the students table',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: 'student_id must be a positive integer',
  })
  student_id!: string;

  @ApiProperty({
    example: '1',
    description: 'Academic year ID',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: 'academic_year_id must be a positive integer',
  })
  academic_year_id!: string;

  @ApiProperty({
    example: 4,
    description:
      'Actual year level of the student for this academic year',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  year_level!: number;

  @ApiProperty({
    example: '1',
    description: 'Major ID',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: 'major_id must be a positive integer',
  })
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