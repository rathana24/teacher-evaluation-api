import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { question_type } from '@prisma/client';

export class QuestionOptionDto {
  @ApiProperty({ example: 'Lecture slides' })
  @IsNotEmpty()
  @IsString()
  option_text!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  display_order!: number;
}

export class CreateQuestionDto {
  @ApiProperty({
    example: 'The lecturer explains concepts clearly.',
  })
  @IsNotEmpty()
  @IsString()
  question_text!: string;

  @ApiProperty({
    enum: question_type,
    example: 'RATING',
  })
  @IsEnum(question_type)
  question_type!: question_type;

  @ApiPropertyOptional({
    maxLength: 100,
    example: 'Teaching',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Defaults to true',
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    maximum: 5,
    description: 'RATING only; defaults to 1',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  min_rating?: number;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'RATING only; defaults to 5',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  max_rating?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    description: 'Defaults to the end of the list',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  display_order?: number;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description:
      'Required for MULTIPLE_CHOICE and CHECKBOX questions. Not allowed for other question types.',
    example: [
      {
        option_text: 'Lecture slides',
        display_order: 1,
      },
      {
        option_text: 'Practice exercises',
        display_order: 2,
      },
      {
        option_text: 'Group discussions',
        display_order: 3,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}