import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateMajorDto {
  @ApiProperty({
    example: 'AMS',
    description: 'Unique major code',
    maxLength: 30,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9_-]+$/, {
    message:
      'code may only contain letters, numbers, hyphens, and underscores',
  })
  code!: string;

  @ApiProperty({
    example: 'Applied Mathematics and Statistics',
    description: 'Major name',
    maxLength: 150,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiProperty({
    example: '1',
    description: 'Department ID that owns this major',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, {
    message: 'department_id must be a positive integer',
  })
  department_id!: string;
}