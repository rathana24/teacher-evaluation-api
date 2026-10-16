import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import { class_type } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

const MAX_DATABASE_ID = '9223372036854775807';

@ValidatorConstraint({ name: 'isWithinLecturerFilterIdRange', async: false })
class LecturerFilterIdRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Matches checks positive-decimal syntax. String comparison preserves
    // precision and rejects excessive input without parsing it as BigInt.
    return (
      typeof value === 'string' &&
      (value.length < MAX_DATABASE_ID.length ||
        (value.length === MAX_DATABASE_ID.length && value <= MAX_DATABASE_ID))
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must not exceed ${MAX_DATABASE_ID}`;
  }
}

export class LecturerCourseOfferingsQueryDto {
  @ApiPropertyOptional({
    example: 'data',
    description: 'Search by course code, course name, or section code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    example: '1',
    type: String,
    minLength: 1,
    maxLength: MAX_DATABASE_ID.length,
    pattern: '^[1-9]\\d*$',
    description: `Filter by academic year ID. Positive decimal string, maximum ${MAX_DATABASE_ID}.`,
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'academic_year_id must be a positive integer string',
  })
  @Validate(LecturerFilterIdRangeConstraint)
  academic_year_id?: string;

  @ApiPropertyOptional({
    example: '1',
    type: String,
    minLength: 1,
    maxLength: MAX_DATABASE_ID.length,
    pattern: '^[1-9]\\d*$',
    description: `Filter by semester ID. Positive decimal string, maximum ${MAX_DATABASE_ID}.`,
  })
  @IsOptional()
  @Matches(/^[1-9]\d*$/, {
    message: 'semester_id must be a positive integer string',
  })
  @Validate(LecturerFilterIdRangeConstraint)
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
