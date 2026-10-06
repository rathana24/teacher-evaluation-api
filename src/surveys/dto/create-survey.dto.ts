import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSurveyDto {
  @ApiProperty({
    maxLength: 200,
    example:
      'Teaching Quality Evaluation 2026-2027',
    description:
      'Unique name of the question set. Leading and trailing whitespace is removed.',
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsString()
  @IsNotEmpty({
    message:
      'Question set title cannot be blank',
  })
  @MaxLength(200, {
    message:
      'Question set title cannot exceed 200 characters',
  })
  title!: string;

  @ApiPropertyOptional({
    example:
      'Standard department evaluation form',
  })
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim()
      : value,
  )
  @IsOptional()
  @IsString()
  description?: string;
}