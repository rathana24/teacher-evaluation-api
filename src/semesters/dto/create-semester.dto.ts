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

  @ApiPropertyOptional({
    example: '2026-10-01',
    type: String,
    nullable: true,
    description:
      'Stored as a UTC calendar date. ISO datetimes without an offset also mean UTC; time of day is discarded.',
  })
  @IsOptional()
  @IsDateString()
  start_date?: string | null;

  @ApiPropertyOptional({
    example: '2027-02-28',
    type: String,
    nullable: true,
    description:
      'Stored as a UTC calendar date; must follow start_date when both dates are supplied. Null clears this optional date.',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string | null;
}
