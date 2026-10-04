import { Module } from '@nestjs/common';

import { StudentsController } from './students.controller';
import { StudentEvaluationProgressService } from './student-evaluation-progress.service';
import { StudentExportService } from './student-export.service';
import { StudentImportService } from './student-import.service';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],

  providers: [
    StudentsService,
    StudentImportService,
    StudentEvaluationProgressService,
    StudentExportService,
  ],

  exports: [
    StudentsService,
    StudentImportService,
    StudentEvaluationProgressService,
    StudentExportService,
  ],
})
export class StudentsModule {}