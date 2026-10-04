import { Test, TestingModule } from '@nestjs/testing';
import { MajorsService } from './majors.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MajorsService', () => {
  let service: MajorsService;

  const prismaServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MajorsService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<MajorsService>(MajorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});