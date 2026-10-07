import { ApiProperty } from '@nestjs/swagger';
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
} from 'class-validator';

export class CourseOfferingGroupScopeDto {
  @ApiProperty({
    example: '1',
    description:
      'Academic year in which the class-group placement applies',
  })
  @IsNumberString({ no_symbols: true })
  academic_year_id!: string;

  @ApiProperty({
    example: '2',
    description:
      'Student generation to which these groups belong',
  })
  @IsNumberString({ no_symbols: true })
  generation_id!: string;

  @ApiProperty({
    example: '3',
    description:
      'Major to which these groups belong',
  })
  @IsNumberString({ no_symbols: true })
  major_id!: string;

  @ApiProperty({
    example: 4,
    minimum: 1,
    maximum: 5,
    description:
      'Year level of the group placement',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  year_level!: number;

  @ApiProperty({
    type: [String],
    example: ['A', 'B'],
    description:
      'One or more class groups in this academic context',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  class_groups!: string[];
}
