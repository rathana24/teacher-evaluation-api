import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AcademicYearsService } from './academic-years.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AcademicYearsService', () => {
  let service: AcademicYearsService;

  const mockPrismaService = {
    academicYear: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicYearsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AcademicYearsService>(AcademicYearsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});