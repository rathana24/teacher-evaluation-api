import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumberString,
  Max,
  Min,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateCourseYearRuleDto {
  @ApiPropertyOptional({
    example: '1',
    description:
      'Create the first enabled revision for this academic year atomically. Omit only for legacy unversioned compatibility.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @Matches(/^[1-9]\d*$/)
  effective_academic_year_id?: string;

  @ApiProperty({
    example: '1',
    description: 'ID of an existing course',
  })
  @IsNumberString({ no_symbols: true })
  course_id!: string;

  @ApiProperty({
    example: '1',
    description: 'ID of an existing major',
  })
  @IsNumberString({ no_symbols: true })
  major_id!: string;

  @ApiProperty({
    example: 4,
    minimum: 1,
    maximum: 5,
    description:
      'Year level in which the course belongs to the major curriculum',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  year_level!: number;
}
