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
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({
    example: '2027-07-31',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}