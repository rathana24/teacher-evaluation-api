import {
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  evaluation_participant_scope,
} from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export class EvaluationTargetingDto {
  @ApiPropertyOptional({
    enum: evaluation_participant_scope,
    example:
      evaluation_participant_scope.ALL_ENROLLED,
    default:
      evaluation_participant_scope.ALL_ENROLLED,
    description:
      'Controls which enrolled students are eligible for the evaluation. When omitted, ALL_ENROLLED is used for backward compatibility.',
  })
  @IsOptional()
  @IsEnum(evaluation_participant_scope)
  participant_scope?: evaluation_participant_scope;

  @ApiPropertyOptional({
    type: [String],
    example: ['1', '2'],
    description:
      'Required when participant_scope is SELECTED_GENERATIONS. Each value must be a valid generation ID.',
  })
  @ValidateIf(
    (dto: EvaluationTargetingDto) =>
      dto.participant_scope ===
      evaluation_participant_scope.SELECTED_GENERATIONS,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({
    each: true,
  })
  @Matches(/^[1-9]\d*$/, {
    each: true,
    message:
      'Each generation_id must be a positive integer',
  })
  generation_ids?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['21', '24', '30'],
    description:
      'Exact eligible student user IDs returned by the preview. The backend can use these IDs to detect whether eligibility changed after preview.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({
    each: true,
  })
  @Matches(/^[1-9]\d*$/, {
    each: true,
    message:
      'Each confirmed_student_id must be a positive integer',
  })
  confirmed_student_ids?: string[];
}