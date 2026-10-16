import { Module } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearSetupController } from './academic-year-setup.controller';
import { AcademicYearSetupService } from './academic-year-setup.service';

@Module({
  controllers: [AcademicYearSetupController, AcademicYearsController],
  providers: [AcademicYearsService, AcademicYearSetupService],
})
export class AcademicYearsModule {}
