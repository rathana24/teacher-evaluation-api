import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { QuestionOptionDto } from './create-question.dto';

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    example: 'The lecturer explains concepts clearly.',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  question_text?: string;

  @ApiPropertyOptional({
    example: 'គ្រូបង្រៀនពន្យល់គោលគំនិតបានច្បាស់លាស់។',
    description: 'Optional Khmer translation of the question.',
  })
  @IsOptional()
  @IsString()
  question_text_km?: string;

  @ApiPropertyOptional({
    enum: question_type,
    example: 'RATING',
  })
  @IsOptional()
  @IsEnum(question_type)
  question_type?: question_type;

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
  })
  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    maximum: 5,
    description: 'RATING only',
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
    description: 'RATING only',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  max_rating?: number;

  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  display_order?: number;

  @ApiPropertyOptional({
    type: [QuestionOptionDto],
    description:
      'For MULTIPLE_CHOICE and CHECKBOX. When provided, replaces the existing option list.',
    example: [
      {
        option_text: 'Lecture slides',
        display_order: 1,
      },
      {
        option_text: 'Practice exercises',
        display_order: 2,
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