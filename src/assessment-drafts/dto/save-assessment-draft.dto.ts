import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DraftAnswerDto {
  @ApiProperty({
    example: '12',
    description: 'Question ID',
  })
  @IsNumberString({ no_symbols: true })
  question_id!: string;

  @ApiPropertyOptional({
    example: 4,
    description:
      'Numeric answer for RATING, AGREEMENT, or FREQUENCY questions',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating_value?: number;

  @ApiPropertyOptional({
    example: 'The lecturer explains clearly.',
    description: 'Answer for a TEXT question',
  })
  @IsOptional()
  @IsString()
  text_value?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['31', '33'],
    description:
      'Selected option IDs for MULTIPLE_CHOICE or CHECKBOX questions',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsNumberString({ no_symbols: true }, { each: true })
  selected_option_ids?: string[];
}

export class SaveAssessmentDraftDto {
  @ApiProperty({
    type: [DraftAnswerDto],
    description:
      'Current unfinished answers. Draft answers do not need to include every required question.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DraftAnswerDto)
  answers!: DraftAnswerDto[];
}