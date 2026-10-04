import { ApiPropertyOptional } from '@nestjs/swagger';
import { user_status } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentQueryDto {
  @ApiPropertyOptional({
    example: 'e2022',
    description:
      'Search students by student code or full name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Filter by generation ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'generation_id must be a positive integer',
  })
  generation_id?: string;

  @ApiPropertyOptional({
    example: '1',
    description:
      'Academic year used for academic placement and effective year-level filtering',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'academic_year_id must be a positive integer',
  })
  academic_year_id?: string;

  @ApiPropertyOptional({
    example: 4,
    description:
      'Filter by effective year level for the selected academic year',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  year_level?: number;

  @ApiPropertyOptional({
    example: '1',
    description: 'Filter by major ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'major_id must be a positive integer',
  })
  major_id?: string;

  @ApiPropertyOptional({
    example: 'AMS1-A',
    description: 'Filter by class/group',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  class_group?: string;

  @ApiPropertyOptional({
    enum: user_status,
    example: 'ACTIVE',
    description: 'Filter by student account status',
  })
  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Number of students per page',
    default: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 20;
}