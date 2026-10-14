import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    maxLength: 20,
    example: '2026-2027',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  name!: string;

  @ApiPropertyOptional({
    example: 2026,
    description:
      'Numeric starting year used for generation year-level calculation',
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  start_year?: number;

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
    example: '2027-07-31',
    type: String,
    nullable: true,
    description:
      'Stored as a UTC calendar date; must follow start_date when both dates are supplied. Null clears this optional date.',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string | null;

  @ApiPropertyOptional({
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
