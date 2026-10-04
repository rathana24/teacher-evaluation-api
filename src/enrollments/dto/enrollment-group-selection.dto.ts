import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EnrollmentGroupSelectionDto {
  @ApiProperty({
    example: '1',
    type: String,
    description:
      'Academic year used to resolve the students academic placement and effective year level',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'academic_year_id must be a positive integer',
  })
  academic_year_id!: string;

  @ApiPropertyOptional({
    example: '1',
    type: String,
    description: 'Select students from a specific generation',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'generation_id must be a positive integer',
  })
  generation_id?: string;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    description:
      'Select students by effective year level in the selected academic year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  year_level?: number;

  @ApiPropertyOptional({
    example: '1',
    type: String,
    description:
      'Select students by major in their academic record for the selected academic year',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'major_id must be a positive integer',
  })
  major_id?: string;

  @ApiPropertyOptional({
    example: 'AMS1-A',
    maxLength: 50,
    description:
      'Select students by class/group in their academic record for the selected academic year',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  class_group?: string;
}