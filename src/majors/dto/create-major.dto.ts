import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

const MAX_DEPARTMENT_ID = '9223372036854775807';

@ValidatorConstraint({ name: 'isWithinMajorDepartmentIdRange', async: false })
class MajorDepartmentIdRangeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    // Matches checks decimal syntax. Ignore leading zeros for the range check
    // to preserve existing requests without Number conversion or BigInt parsing.
    const digits = value.replace(/^0+/, '');
    return (
      digits.length < MAX_DEPARTMENT_ID.length ||
      (digits.length === MAX_DEPARTMENT_ID.length &&
        digits <= MAX_DEPARTMENT_ID)
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must not exceed ${MAX_DEPARTMENT_ID}`;
  }
}

export class CreateMajorDto {
  @ApiProperty({
    example: 'AMS',
    description:
      'Unique major code; letters, numbers, hyphens and underscores only. Stored uppercase.',
    minLength: 1,
    maxLength: 30,
    nullable: false,
    pattern: '^[A-Za-z0-9_-]+$',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message: 'code may only contain letters, numbers, hyphens, and underscores',
  })
  code!: string;

  @ApiProperty({
    example: 'Applied Mathematics and Statistics',
    description: 'Trimmed nonblank major name; internal spaces are preserved.',
    minLength: 1,
    maxLength: 150,
    nullable: false,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: '1',
    description: `Department ID as a decimal string, maximum ${MAX_DEPARTMENT_ID}. Leading zeros remain accepted; an absent department returns 404.`,
    type: String,
    minLength: 1,
    nullable: false,
    pattern: '^[0-9]+$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, {
    message: 'department_id must be a positive integer',
  })
  @Validate(MajorDepartmentIdRangeConstraint)
  department_id!: string;
}
