import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { CLASS_GROUP_MAX_LENGTH } from '../../common/utils/class-group.util';
import { OptionalReviewDto } from '../../common/dto/optional-review.dto';

export class EnrollmentGroupSelectionDto extends OptionalReviewDto {
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
    maximum: 5,
    description:
      'Select students by effective year level in the selected academic year',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
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
    example: ['AMS1-A', 'AMS1-B'],
    type: [String],
    description:
      'Select students by class/groups in their academic records for the selected academic year',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(CLASS_GROUP_MAX_LENGTH, {
    each: true,
  })
  class_groups?: string[];

  @ApiPropertyOptional({
    example: ['101', '102'],
    type: [String],
    description:
      'Student user IDs returned by preview and required for enrollment confirmation',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[1-9]\d*$/, {
    each: true,
    message: 'confirmed_student_ids must contain positive integers',
  })
  confirmed_student_ids?: string[];
}
