import { Test, TestingModule } from '@nestjs/testing';
import { StudentAcademicRecordsController } from './student-academic-records.controller';
import { StudentAcademicRecordsService } from './student-academic-records.service';

describe('StudentAcademicRecordsController', () => {
  let controller: StudentAcademicRecordsController;

  const studentAcademicRecordsServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentAcademicRecordsController],
      providers: [
        {
          provide: StudentAcademicRecordsService,
          useValue: studentAcademicRecordsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<StudentAcademicRecordsController>(
      StudentAcademicRecordsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});