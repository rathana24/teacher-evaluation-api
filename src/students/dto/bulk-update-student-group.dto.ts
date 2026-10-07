import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkUpdateStudentGroupDto {
  @ApiProperty({
    example: '1',
    type: String,
    description:
      'Academic year containing the existing student placement records',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'academic_year_id must be a positive integer',
  })
  academic_year_id!: string;

  @ApiProperty({
    example: ['10', '11', '12'],
    type: [String],
    description:
      'Exact confirmed student profile IDs whose existing placements will be updated',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @Matches(/^[1-9]\d*$/, {
    each: true,
    message:
      'Each student_id must be a positive integer',
  })
  student_ids!: string[];

  @ApiProperty({
    example: 'A',
    type: String,
    maxLength: 50,
    description:
      'New class group. It is normalized before being stored.',
  })
  @IsString()
  @MaxLength(50)
  class_group!: string;
}
