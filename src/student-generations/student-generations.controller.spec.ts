import { Test, TestingModule } from '@nestjs/testing';
import { StudentGenerationsController } from './student-generations.controller';
import { StudentGenerationsService } from './student-generations.service';

describe('StudentGenerationsController', () => {
  let controller: StudentGenerationsController;

  const studentGenerationsServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentGenerationsController],
      providers: [
        {
          provide: StudentGenerationsService,
          useValue: studentGenerationsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<StudentGenerationsController>(
      StudentGenerationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});