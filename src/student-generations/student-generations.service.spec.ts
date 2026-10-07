import { Test, TestingModule } from '@nestjs/testing';
import { StudentGenerationsService } from './student-generations.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StudentGenerationsService', () => {
  let service: StudentGenerationsService;

  const prismaServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentGenerationsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<StudentGenerationsService>(
      StudentGenerationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});