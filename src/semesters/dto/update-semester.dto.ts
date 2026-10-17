import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class UpdateSemesterDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 50,
    nullable: false,
    example: 'Semester 1',
    description:
      'Trimmed nonblank display name. Omit to retain; null is invalid.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  semester_name?: string;

  @ApiPropertyOptional({
    type: 'integer',
    example: 1,
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    nullable: false,
    description:
      'Numeric academic year ID; safe integer from 1 to 9007199254740991. Omit to retain; null is invalid.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  academic_year_id?: number;

  @ApiPropertyOptional({
    type: 'integer',
    example: 1,
    minimum: 1,
    maximum: 2,
    nullable: true,
    description:
      'Semester number within the academic year. Omit to retain. null is accepted only for a historical semester whose number is already unknown; a known number cannot be cleared.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  semester_number?: number | null;

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
    example: '2027-02-28',
    type: String,
    nullable: true,
    description:
      'Must be a real ISO calendar date. Stored as a UTC calendar date; must follow start_date when both dates are known, including a stored endpoint. Null clears this optional date.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  end_date?: string | null;
}
