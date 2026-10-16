import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsCohortDatabaseId } from '../validation/cohort-fields';

export class CreateStudentGenerationDto {
  @ApiProperty({
    example: '1',
    type: String,
    description: 'Explicit owning major ID, up to 9223372036854775807',
  })
  @IsCohortDatabaseId()
  major_id!: string;

  @ApiPropertyOptional({
    example: 1,
    type: Number,
    minimum: 1,
    maximum: 2147483647,
    description:
      'Integer cohort number within this major; required unless a numeric name compatibility alias is supplied',
  })
  @ValidateIf(
    (row: CreateStudentGenerationDto, value: unknown) =>
      value !== undefined || row.name === undefined,
  )
  @IsInt()
  @Min(1)
  @Max(2147483647)
  generation_number?: number;

  @ApiPropertyOptional({
    example: 'Gen 1',
    maxLength: 100,
    description:
      'Compatibility alias 1, 01 or Gen 1; explicit major_id is always required. Arbitrary new global labels are rejected.',
  })
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: '1',
    type: String,
    description: 'Entry academic year ID, up to 9223372036854775807',
  })
  @IsCohortDatabaseId()
  entry_academic_year_id!: string;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1, maximum: 5 })
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(5)
  starting_year_level?: number;
}
