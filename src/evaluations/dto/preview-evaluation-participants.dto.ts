import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  evaluation_participant_scope,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import {
  EvaluationGroupScopeDto,
} from './evaluation-group-scope.dto';

export class PreviewEvaluationParticipantsDto {
  @ApiProperty({
    example: '1',
    description:
      'Course offering whose enrolled students will be checked for evaluation eligibility.',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message:
      'course_offering_id must be a positive integer',
  })
  course_offering_id!: string;

  @ApiPropertyOptional({
    enum: evaluation_participant_scope,
    example:
      evaluation_participant_scope.ALL_ENROLLED,
    default:
      evaluation_participant_scope.ALL_ENROLLED,
    description:
      'Base participant scope. When omitted, ALL_ENROLLED is used. An optional group scope further restricts the enrolled population.',
  })
  @IsOptional()
  @IsEnum(evaluation_participant_scope)
  participant_scope?: evaluation_participant_scope;

  @ApiPropertyOptional({
    type: [String],
    example: ['1', '2'],
    description:
      'Generation IDs used when participant_scope is SELECTED_GENERATIONS.',
  })
  @ValidateIf(
    (dto: PreviewEvaluationParticipantsDto) =>
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
    type: EvaluationGroupScopeDto,
    description:
      'Optional explicit class-group restriction applied within the selected academic year, generation, major, and year level.',
    example: {
      academic_year_id: '10',
      generation_id: '5',
      major_id: '2',
      year_level: 4,
      class_groups: ['A'],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EvaluationGroupScopeDto)
  group_scope?: EvaluationGroupScopeDto;
}
