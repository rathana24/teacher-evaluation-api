import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStudentGenerationDto {
  @ApiProperty({
    example: 'Gen 43',
    description: 'Unique generation name or label',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: '1',
    description:
      'Academic year ID when this generation entered the institution',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9]\d*$/, {
    message: 'entry_academic_year_id must be a positive integer',
  })
  entry_academic_year_id!: string;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Starting year level of the generation, normally 1',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  starting_year_level?: number;
}