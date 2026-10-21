import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { class_type } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CourseOfferingGroupScopeDto } from './course-offering-group-scope.dto';

export class AssignmentRowDto {
  @ApiProperty({
    description:
      'Stable client row key within this operation; 1–64 letters, digits, underscore or hyphen.',
    example: 'course-ds-fe',
  })
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  row_key!: string;

  @ApiProperty({ type: String, example: '2' })
  @Matches(/^[1-9]\d{0,18}$/)
  lecturer_id!: string;

  @ApiProperty({ type: String, example: '3' })
  @Matches(/^[1-9]\d{0,18}$/)
  semester_id!: string;

  @ApiProperty({ enum: class_type })
  @IsEnum(class_type)
  class_type!: class_type;

  @ApiPropertyOptional({
    description:
      'Display label only; never assignment identity. Empty or whitespace-only labels are rejected.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'section_code must not be blank' })
  @MaxLength(50)
  section_code?: string;

  @ApiProperty({
    type: [CourseOfferingGroupScopeDto],
    description:
      'Required explicit audiences; no all-department or empty-selection fallback. At most 50 scopes and 50 groups per scope.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => CourseOfferingGroupScopeDto)
  group_scopes!: CourseOfferingGroupScopeDto[];
}

export class AssignmentCreationPreviewDto {
  @ApiProperty({ type: String, example: '1' })
  @Matches(/^[1-9]\d{0,18}$/)
  course_id!: string;

  @ApiProperty({ type: String, example: '4' })
  @Matches(/^[1-9]\d{0,18}$/)
  academic_year_id!: string;

  @ApiProperty({ minimum: 1, maximum: 5, type: 'integer' })
  @IsInt()
  @Min(1)
  @Max(5)
  year_level!: number;

  @ApiProperty({
    type: [AssignmentRowDto],
    description:
      '1–50 distinct identities for this course/year/student level. Row keys must be unique.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AssignmentRowDto)
  assignments!: AssignmentRowDto[];
}

export class AssignmentRosterConfirmationDto {
  @ApiProperty({ example: 'course-ds-fe' })
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  row_key!: string;

  @ApiProperty({
    type: [String],
    description:
      'Exact unique STUDENT user IDs returned for this row; no subset/superset. At most 10,000 per operation across all rows.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(10000)
  @ArrayUnique()
  @Matches(/^[1-9]\d{0,18}$/, { each: true })
  confirmed_student_ids!: string[];
}

export class AssignmentCreationConfirmDto extends AssignmentCreationPreviewDto {
  @ApiProperty({
    description:
      'UUID v4 from preview. Retain the same ID/body after an uncertain result.',
  })
  @IsUUID('4')
  review_id!: string;

  @ApiProperty({ type: [AssignmentRosterConfirmationDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AssignmentRosterConfirmationDto)
  confirmations!: AssignmentRosterConfirmationDto[];
}
