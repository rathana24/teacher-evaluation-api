import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsBoolean, ValidateIf } from 'class-validator';
import { CreateAcademicYearDto } from './create-academic-year.dto';

export class UpdateAcademicYearDto extends PartialType(
  OmitType(CreateAcademicYearDto, ['is_active'] as const),
  { skipNullProperties: false },
) {
  // Creation permits null as a default alias; updates distinguish omission
  // (retain the current value) from an invalid explicit null.
  @ApiPropertyOptional({
    type: Boolean,
    example: false,
    nullable: false,
    description:
      'Omit to retain the current active flag. Explicit null is invalid.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  is_active?: boolean;
}
