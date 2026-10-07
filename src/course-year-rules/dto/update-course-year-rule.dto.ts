import { OmitType, PartialType } from '@nestjs/swagger';

import { CreateCourseYearRuleDto } from './create-course-year-rule.dto';

export class UpdateCourseYearRuleDto extends PartialType(
  OmitType(CreateCourseYearRuleDto, ['effective_academic_year_id'] as const),
  { skipNullProperties: false },
) {}
