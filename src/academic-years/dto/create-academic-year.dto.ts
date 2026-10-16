import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
    minLength: 1,
    maxLength: 20,
    example: '2026-2027',
    nullable: false,
    description:
      'Trimmed nonblank display name; numeric chronology is separate.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  name!: string;

  @ApiPropertyOptional({
    type: Number,
    example: 2026,
    minimum: 1900,
    maximum: 2200,
    nullable: true,
    description:
      'Numeric starting year used for generation year-level calculation. Null represents unknown chronology.',
  })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2200)
  start_year?: number | null;

  @ApiPropertyOptional({
    example: '2026-10-01',
    type: String,
    nullable: true,
    description:
      'Must be a real ISO calendar date. Stored as a UTC calendar date. ISO datetimes without an offset also mean UTC; time of day is discarded. Null clears this optional date.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  start_date?: string | null;

  @ApiPropertyOptional({
    example: '2027-07-31',
    type: String,
    nullable: true,
    description:
      'Must be a real ISO calendar date. Stored as a UTC calendar date; must follow start_date when both dates are known, including a stored endpoint on update. Null clears this optional date.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  end_date?: string | null;

  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    default: false,
    nullable: true,
    description: 'Omitted or null uses false on creation.',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean | null;
}
