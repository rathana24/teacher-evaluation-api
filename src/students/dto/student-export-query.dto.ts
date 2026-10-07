import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class StudentExportQueryDto {
  @ApiPropertyOptional({
    example: '1',
    type: String,
    description:
      'Optional generation ID used to limit the exported student population',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'generation_id must be a positive integer',
  })
  generation_id?: string;

  @ApiPropertyOptional({
    example: '1',
    type: String,
    description:
      'Optional academic year ID used to scope evaluation progress and student placement',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'academic_year_id must be a positive integer',
  })
  academic_year_id?: string;

  @ApiPropertyOptional({
    example: '1',
    type: String,
    description:
      'Optional major ID used to filter the selected academic-year placement',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'major_id must be a positive integer',
  })
  major_id?: string;

  @ApiPropertyOptional({
    example: 'A',
    type: String,
    maxLength: 50,
    description:
      'Optional class group filter. Requires academic_year_id, generation_id, and major_id.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  class_group?: string;

  @ApiPropertyOptional({
    example: 1,
    enum: [1, 2],
    description:
      'Optional semester number. Requires academic_year_id and scopes evaluation progress to that semester.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2], {
    message:
      'semester_number must be either 1 or 2',
  })
  semester_number?: number;
}