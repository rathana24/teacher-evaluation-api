import { PartialType } from '@nestjs/swagger';

import { CreateCourseYearRuleDto } from './create-course-year-rule.dto';

export class UpdateCourseYearRuleDto extends PartialType(
  CreateCourseYearRuleDto,
) {}