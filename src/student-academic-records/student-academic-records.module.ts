import { Module } from '@nestjs/common';
import { StudentAcademicRecordsService } from './student-academic-records.service';
import { StudentAcademicRecordsController } from './student-academic-records.controller';

@Module({
  controllers: [StudentAcademicRecordsController],
  providers: [StudentAcademicRecordsService],
})
export class StudentAcademicRecordsModule {}
