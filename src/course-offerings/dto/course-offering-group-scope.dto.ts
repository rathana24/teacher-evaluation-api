import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumberString,
  IsString,
  Max,
  MaxLength,
  Min,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CourseOfferingGroupScopeDto {
  @ApiPropertyOptional({
    example: '1',
    description:
      'Expected latest applicable enabled curriculum revision for this course/major/student year in the selected semester academic year. Omit to resolve automatically on new contexts. Obsolete, disabled, future or wrong-owner IDs are rejected. Historical legacy nulls remain unknown on unchanged-context edits; a new scope always requires an actual enabled revision.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^[1-9]\d*$/)
  curriculum_revision_id?: string;

  @ApiProperty({
    example: '1',
    description: 'Academic year in which the class-group placement applies',
  })
  @IsNumberString({ no_symbols: true })
  academic_year_id!: string;

  @ApiProperty({
    example: '2',
    description: 'Student generation to which these groups belong',
  })
  @IsNumberString({ no_symbols: true })
  generation_id!: string;

  @ApiProperty({
    example: '3',
    description: 'Major to which these groups belong',
  })
  @IsNumberString({ no_symbols: true })
  major_id!: string;

  @ApiProperty({
    example: 4,
    minimum: 1,
    maximum: 5,
    description: 'Year level of the group placement',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  year_level!: number;

  @ApiProperty({
    type: [String],
    example: ['A', 'B'],
    description: 'One or more class groups in this academic context',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  class_groups!: string[];
}
