import { Test, TestingModule } from '@nestjs/testing';

import { StudentExportService } from './student-export.service';
import { StudentImportService } from './student-import.service';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

describe('StudentsController', () => {
  let controller: StudentsController;

  const studentsServiceMock = {};
  const studentImportServiceMock = {};
  const studentExportServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [StudentsController],

        providers: [
          {
            provide: StudentsService,
            useValue: studentsServiceMock,
          },
          {
            provide: StudentImportService,
            useValue: studentImportServiceMock,
          },
          {
            provide: StudentExportService,
            useValue: studentExportServiceMock,
          },
        ],
      }).compile();

    controller =
      module.get<StudentsController>(
        StudentsController,
      );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});