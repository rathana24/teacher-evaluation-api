import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateSemesterDto {
  @ApiPropertyOptional({ maxLength: 50, example: 'Semester 1' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  semester_name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Academic year ID',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  academic_year_id?: number;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2027-02-28' })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}