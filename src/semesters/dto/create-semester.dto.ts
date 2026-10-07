import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateSemesterDto {
  @ApiProperty({ maxLength: 50, example: 'Semester 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  semester_name!: string;

  @ApiProperty({
    example: 1,
    description: 'Academic year ID',
  })
  @IsInt()
  @Min(1)
  academic_year_id!: number;

  @ApiProperty({
    example: 1,
    minimum: 1,
    maximum: 2,
    description: 'Semester number within the academic year',
  })
  @IsInt()
  @Min(1)
  @Max(2)
  semester_number!: number;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2027-02-28' })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}