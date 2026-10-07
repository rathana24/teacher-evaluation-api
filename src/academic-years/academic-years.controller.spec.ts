import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AcademicYearsController } from './academic-years.controller';
import { AcademicYearsService } from './academic-years.service';

describe('AcademicYearsController', () => {
  let controller: AcademicYearsController;

  const mockAcademicYearsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademicYearsController],
      providers: [
        {
          provide: AcademicYearsService,
          useValue: mockAcademicYearsService,
        },
      ],
    }).compile();

    controller = module.get<AcademicYearsController>(
      AcademicYearsController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});