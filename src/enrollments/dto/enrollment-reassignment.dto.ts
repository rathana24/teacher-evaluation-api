import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OptionalReviewDto } from '../../common/dto/optional-review.dto';

export class EnrollmentReassignmentDto extends OptionalReviewDto {
  @ApiProperty({
    example: '4',
    type: String,
    description: 'Exact student user ID whose enrollment is being reassigned',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'student_id must be a positive integer',
  })
  student_id!: string;

  @ApiProperty({
    example: '2',
    type: String,
    description: 'Target course offering ID',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'target_offering_id must be a positive integer',
  })
  target_offering_id!: string;
}

export class ConfirmEnrollmentReassignmentDto extends EnrollmentReassignmentDto {
  @ApiProperty({
    example: '1',
    type: String,
    description: 'Source enrollment ID returned by the reassignment preview',
  })
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'confirmed_enrollment_id must be a positive integer',
  })
  confirmed_enrollment_id!: string;
}
