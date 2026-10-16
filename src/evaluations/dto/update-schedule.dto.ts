import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateScheduleDto {
  @ApiPropertyOptional({
    example: '2026-10-01T00:00:00.000Z',
    description:
      'DRAFT schedule edits only. For an active OPEN deadline extension this property must be omitted, even if unchanged or null.',
  })
  @IsOptional()
  @IsDateString()
  start_at?: string;

  @ApiPropertyOptional({
    example: '2026-10-14T23:59:59.000Z',
    description:
      'DRAFT schedule endpoint, or required valid ISO timestamp strictly later than the current deadline for an active OPEN evaluation. Active means start_at <= server time < current end_at.',
  })
  @IsOptional()
  @IsDateString()
  end_at?: string;
}
