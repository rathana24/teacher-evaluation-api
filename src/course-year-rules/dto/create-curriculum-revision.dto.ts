import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateCurriculumRevisionDto {
  @ApiProperty({
    example: '1',
    description:
      'Academic year with a structured start_year. Must follow the previous revision year.',
  })
  @Matches(/^[1-9]\d*$/)
  effective_academic_year_id!: string;

  @ApiProperty({
    example: true,
    description:
      'Whether this course/major/year-level rule permits new assignments from this academic year onward.',
  })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({
    maxLength: 2000,
    description:
      'Approval/change explanation; historical revisions cannot be edited or deleted.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
