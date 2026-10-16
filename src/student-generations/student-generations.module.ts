import { Module } from '@nestjs/common';
import { StudentGenerationsController } from './student-generations.controller';
import { StudentGenerationsService } from './student-generations.service';
import { CohortMappingController } from './cohort-mapping.controller';
import { CohortMappingService } from './cohort-mapping.service';

@Module({
  controllers: [StudentGenerationsController, CohortMappingController],
  providers: [StudentGenerationsService, CohortMappingService],
  exports: [StudentGenerationsService],
})
export class StudentGenerationsModule {}
