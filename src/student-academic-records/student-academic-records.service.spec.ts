import { Test, TestingModule } from '@nestjs/testing';
import { StudentAcademicRecordsService } from './student-academic-records.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudentAcademicRecordsService', () => {
  let service: StudentAcademicRecordsService;

  const prismaServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentAcademicRecordsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<StudentAcademicRecordsService>(
      StudentAcademicRecordsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});