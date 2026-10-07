import { ApiProperty, IntersectionType, OmitType } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID, Matches } from 'class-validator';
import { CreateEvaluationDto } from '../evaluations/dto/create-evaluation.dto';
import { BulkUpdateStudentGroupDto } from '../students/dto/bulk-update-student-group.dto';

export class ReviewConfirmationDto {
  @ApiProperty({
    example: '40aa52de-b777-4e6d-a508-c117f98b8c1a',
    description:
      'Opaque review ID from preview. Retry the identical operation with this ID.',
  })
  @IsUUID('4')
  review_id!: string;
}
export class OpeningReviewConfirmationDto extends ReviewConfirmationDto {
  @ApiProperty({ enum: ['RETAIN_ASSIGNED_VERSION'] })
  @IsIn(['RETAIN_ASSIGNED_VERSION'])
  decision!: 'RETAIN_ASSIGNED_VERSION';

  @ApiProperty({
    example: '9',
    description:
      'Assigned version shown in this opening review; never a replacement version.',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/)
  retain_assigned_version_id!: string;
}
export class CreateEvaluationReviewDto extends OmitType(CreateEvaluationDto, [
  'review_id',
  'confirmed_student_ids',
] as const) {
  @ApiProperty({
    required: true,
    example: '9',
    description:
      'Explicit latest version reviewed for new assignment; set-only review is unavailable.',
  })
  declare survey_version_id: string;
}
export class PlacementReviewConfirmationDto extends IntersectionType(
  OmitType(BulkUpdateStudentGroupDto, ['review_id'] as const),
  ReviewConfirmationDto,
) {}
