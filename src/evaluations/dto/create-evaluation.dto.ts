import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsDateString,
  IsNumberString,
  IsOptional,
  ValidateIf,
} from 'class-validator';

import { EvaluationTargetingDto } from './evaluation-targeting.dto';

export class CreateEvaluationDto extends EvaluationTargetingDto {
  @ApiProperty({
    example: '1',
    description:
      'Course offering that this evaluation belongs to',
  })
  @IsNumberString(
    { no_symbols: true },
    {
      message:
        'course_offering_id must be a positive integer',
    },
  )
  course_offering_id!: string;

  @ApiPropertyOptional({
    example: '1',
    description:
      'Named question set. Set-only selection validates its actual latest version; an empty or archived latest version is rejected. Send survey_version_id from review to detect stale selection.',
  })
  @ValidateIf(
    (dto: CreateEvaluationDto) =>
      dto.survey_version_id === undefined,
  )
  @IsNumberString(
    { no_symbols: true },
    {
      message:
        'survey_id must be a positive integer when survey_version_id is not provided',
    },
  )
  survey_id?: string;

  @ApiPropertyOptional({
    example: '3',
    description:
      'Reviewed latest version ID. A newer version returns 409 without creating an evaluation. If survey_id is also provided, the version must belong to that set.',
  })
  @ValidateIf(
    (dto: CreateEvaluationDto) =>
      dto.survey_id === undefined ||
      dto.survey_version_id !== undefined,
  )
  @IsNumberString(
    { no_symbols: true },
    {
      message:
        'survey_version_id must be a positive integer',
    },
  )
  survey_version_id?: string;

  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description:
      'Optional evaluation start date and time.',
  })
  @IsOptional()
  @IsDateString()
  start_at?: string;

  @ApiPropertyOptional({
    example: '2026-10-14T23:59:59.000Z',
    description:
      'Optional evaluation end date and time.',
  })
  @IsOptional()
  @IsDateString()
  end_at?: string;
}
