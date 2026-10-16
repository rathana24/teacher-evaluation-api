import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CohortMappingReferenceDto {
  @ApiProperty({
    type: String,
    example: '12',
    description:
      'Exact saved row ID as a positive signed-BigInt decimal string.',
  })
  id!: string;
  @ApiProperty({
    example: 'a'.repeat(64),
    description: 'Unchanged expected_sha256 returned by inventory.',
  })
  expected_sha256!: string;
}
export class CohortMappingDestinationDto {
  @ApiProperty({ example: 'DS' }) key!: string;
  @ApiProperty({ type: String, example: '2' }) major_id!: string;
  @ApiProperty({ minimum: 1, maximum: 2147483647, example: 1 })
  generation_number!: number;
  @ApiProperty({ type: String, example: '4' }) entry_academic_year_id!: string;
  @ApiProperty({ minimum: 1, maximum: 5, example: 1 })
  starting_year_level!: number;
  @ApiProperty({ type: String, nullable: true, example: null })
  existing_generation_id!: string | null;
}
export class CohortMappingCohortDto extends CohortMappingReferenceDto {
  @ApiProperty({
    enum: [
      'KEEP_ID_AS_CANONICAL',
      'SPLIT_KEEP_LEGACY_REFERENCE',
      'RETAIN_UNRESOLVED',
      'KEEP_EXISTING_CANONICAL',
    ],
  })
  disposition!: string;
  @ApiProperty({ type: [CohortMappingDestinationDto], maxItems: 50 })
  destinations!: CohortMappingDestinationDto[];
}
export class CohortMappingRowDto extends CohortMappingReferenceDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'DS',
    description:
      'Explicit destination key; null retains the current link, including unresolved null history.',
  })
  destination_key!: string | null;
}
export class CohortMappingFrozenDto extends CohortMappingReferenceDto {
  @ApiProperty({
    example: 'G:12:7',
    description:
      'Exact inventory reference key: G:evaluation_id:generation_id or R:group_target_id. Keep unchanged.',
  })
  declare id: string;
  @ApiProperty({ enum: ['KEEP_ORIGINAL_REFERENCE'] }) disposition!: string;
}
export class CohortMappingProposalDto {
  @ApiProperty({ example: 'a'.repeat(64) }) source_fingerprint!: string;
  @ApiProperty({
    minLength: 1,
    maxLength: 2000,
    description:
      'Administrator-reviewed provenance/reason. Do not include credentials, draft contents or answer text.',
  })
  reason!: string;
  @ApiProperty({ type: [CohortMappingCohortDto], maxItems: 500 })
  cohorts!: CohortMappingCohortDto[];
  @ApiProperty({ type: [CohortMappingRowDto], maxItems: 5000 })
  profiles!: CohortMappingRowDto[];
  @ApiProperty({ type: [CohortMappingRowDto], maxItems: 10000 })
  records!: CohortMappingRowDto[];
  @ApiProperty({ type: [CohortMappingRowDto], maxItems: 10000 })
  scopes!: CohortMappingRowDto[];
  @ApiProperty({ type: [CohortMappingFrozenDto], maxItems: 20000 })
  frozen_targets!: CohortMappingFrozenDto[];
}
export class CohortMappingManifestDto extends CohortMappingProposalDto {
  @ApiProperty({ enum: [1] }) schema_version!: number;
  @ApiProperty({
    format: 'uuid',
    description: 'Server-authored operation UUID returned by preview.',
  })
  operation_id!: string;
  @ApiProperty({
    enum: ['teacher_evaluation_test'],
    description:
      'Server-authored actual database, never a client-selected target.',
  })
  database!: string;
  @ApiProperty({ description: 'Server-authored actual schema.' })
  schema!: string;
  @ApiProperty({
    type: String,
    description: 'Server-authored current authenticated ADMIN account ID.',
  })
  reviewer_id!: string;
  @ApiProperty({ format: 'date-time' }) reviewed_at!: string;
  @ApiProperty({ format: 'date-time' }) expires_at!: string;
}
export class ConfirmCohortMappingDto {
  @ApiProperty({ format: 'uuid' }) review_id!: string;
  @ApiProperty({
    type: CohortMappingManifestDto,
    description:
      'Exact unchanged manifest returned by preview. Unknown fields are rejected, not stripped.',
  })
  manifest!: CohortMappingManifestDto;
}
export class CohortMappingReceiptDto {
  @ApiProperty({ enum: [1] }) schema_version!: number;
  @ApiProperty({ format: 'uuid' }) operation_id!: string;
  @ApiProperty({ format: 'uuid' }) review_id!: string;
  @ApiProperty() already_applied!: boolean;
  @ApiProperty({
    type: [Object],
    description: 'Destination key and exact resulting generation_id pairs.',
  })
  cohorts!: object[];
  @ApiProperty({ example: { profiles: 1, records: 2, scopes: 1 } })
  mapped!: object;
  @ApiPropertyOptional() retained_unresolved_cohorts?: number;
}
