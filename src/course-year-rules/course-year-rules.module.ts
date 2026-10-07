import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CourseYearRulesController } from './course-year-rules.controller';
import { CourseYearRulesService } from './course-year-rules.service';

@Module({
  imports: [PrismaModule],
  controllers: [CourseYearRulesController],
  providers: [CourseYearRulesService],
  exports: [CourseYearRulesService],
})
export class CourseYearRulesModule {}