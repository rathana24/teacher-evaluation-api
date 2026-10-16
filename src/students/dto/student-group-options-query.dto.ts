import {
  IsString,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const MAX_DATABASE_ID = '9223372036854775807';

@ValidatorConstraint({ name: 'isWithinDatabaseIdRange', async: false })
class DatabaseIdRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    // Positive decimal syntax is checked by Matches. Compare strings here to
    // retain precision and reject arbitrarily long input without parsing it.
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

export class StudentGroupOptionsQueryDto {
  @ApiProperty({
    example: '1',
    type: String,
    minLength: 1,
    maxLength: MAX_DATABASE_ID.length,
    pattern: '^[1-9]\\d*$',
    description: `Academic year used to resolve student placement groups. Positive decimal string, maximum ${MAX_DATABASE_ID}.`,
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'academic_year_id must be a positive integer',
  })
  @Validate(DatabaseIdRangeConstraint)
  academic_year_id!: string;

  @ApiProperty({
    example: '1',
    type: String,
    minLength: 1,
    maxLength: MAX_DATABASE_ID.length,
    pattern: '^[1-9]\\d*$',
    description: `Student generation used to scope class groups. Positive decimal string, maximum ${MAX_DATABASE_ID}.`,
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'generation_id must be a positive integer',
  })
  @Validate(DatabaseIdRangeConstraint)
  generation_id!: string;

  @ApiProperty({
    example: '1',
    type: String,
    minLength: 1,
    maxLength: MAX_DATABASE_ID.length,
    pattern: '^[1-9]\\d*$',
    description: `Major used to scope class groups. Positive decimal string, maximum ${MAX_DATABASE_ID}.`,
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'major_id must be a positive integer',
  })
  @Validate(DatabaseIdRangeConstraint)
  major_id!: string;
}
