import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class OptionalReviewDto {
  @ApiPropertyOptional({
    example: '40aa52de-b777-4e6d-a508-c117f98b8c1a',
    description:
      'Review returned by the matching operation preview. Omission uses legacy compatibility until REQUIRE_REVIEWED_CONFIRMATION=true.',
  })
  @IsOptional()
  @IsUUID('4')
  review_id?: string;
}
