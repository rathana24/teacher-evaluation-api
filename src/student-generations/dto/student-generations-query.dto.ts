import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import { IsCohortDatabaseId } from '../validation/cohort-fields';

export class StudentGenerationsQueryDto {
  @ApiPropertyOptional({
    type: String,
    example: '1',
    description: 'Filter by explicit owning major ID',
  })
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsCohortDatabaseId()
  major_id?: string;
}
