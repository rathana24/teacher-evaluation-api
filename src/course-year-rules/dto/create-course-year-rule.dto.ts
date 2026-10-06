import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumberString,
  Max,
  Min,
} from 'class-validator';

export class CreateCourseYearRuleDto {
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