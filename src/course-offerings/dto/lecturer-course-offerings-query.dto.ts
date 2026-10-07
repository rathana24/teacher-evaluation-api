import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { class_type } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LecturerCourseOfferingsQueryDto {
  @ApiPropertyOptional({
    example: 'data',
    description:
      'Search by course code, course name, or section code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Filter by academic year ID',
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message:
      'academic_year_id must be a positive integer string',
  })
  academic_year_id?: string;

  @ApiPropertyOptional({
    example: '1',
    description: 'Filter by semester ID',
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message:
      'semester_id must be a positive integer string',
  })
  semester_id?: string;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  year_level?: number;

  @ApiPropertyOptional({
    enum: class_type,
    example: class_type.COURSE,
  })
  @IsOptional()
  @IsEnum(class_type)
  class_type?: class_type;
}