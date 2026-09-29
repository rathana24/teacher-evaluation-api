import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumberString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReorderQuestionItemDto {
  @ApiProperty({
    example: '12',
    description: 'Question ID',
  })
  @IsNumberString({ no_symbols: true })
  question_id!: string;

  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'New display position of the question',
  })
  @IsInt()
  @Min(1)
  display_order!: number;
}

export class ReorderQuestionsDto {
  @ApiProperty({
    type: [ReorderQuestionItemDto],
    example: [
      {
        question_id: '12',
        display_order: 1,
      },
      {
        question_id: '15',
        display_order: 2,
      },
      {
        question_id: '18',
        display_order: 3,
      },
    ],
    description:
      'Complete ordered list of questions for the survey version.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderQuestionItemDto)
  questions!: ReorderQuestionItemDto[];
}