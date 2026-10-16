import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

export class CreateSemesterDto {
  @ApiProperty({
    minLength: 1,
    maxLength: 50,
    nullable: false,
    example: 'Semester 1',
    description: 'Trimmed nonblank semester display name.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  semester_name!: string;

  @ApiProperty({
    type: 'integer',
    example: 1,
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    nullable: false,
    description:
      'Numeric academic year ID; must be a safe integer from 1 to 9007199254740991.',
  })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  academic_year_id!: number;

  @ApiProperty({
    type: 'integer',
    example: 1,
    minimum: 1,
    maximum: 2,
    nullable: false,
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
      'Must be a real ISO calendar date. Stored as a UTC calendar date; must follow start_date when both dates are known. Null clears this optional date.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  end_date?: string | null;
}
