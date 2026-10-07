import {
  IsString,
  Matches,
} from 'class-validator';
import {
  ApiProperty,
} from '@nestjs/swagger';

export class StudentGroupOptionsQueryDto {
  @ApiProperty({
    example: '1',
    type: String,
    description:
      'Academic year used to resolve student placement groups',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'academic_year_id must be a positive integer',
  })
  academic_year_id!: string;

  @ApiProperty({
    example: '1',
    type: String,
    description:
      'Student generation used to scope class groups',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'generation_id must be a positive integer',
  })
  generation_id!: string;

  @ApiProperty({
    example: '1',
    type: String,
    description:
      'Major used to scope class groups',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'major_id must be a positive integer',
  })
  major_id!: string;
}
