import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const prismaMock = {
    users: {
      count: jest.fn(),
    },
    courses: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule =
      await Test.createTestingModule({
        controllers: [AppController],
        providers: [
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    appController =
      app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return service and database status', async () => {
      prismaMock.users.count.mockResolvedValue(42);
      prismaMock.courses.count.mockResolvedValue(12);

      const result =
        await appController.health();

      expect(result).toEqual({
        status: 'ok',
        userCount: 42,
        courseCount: 12,
      });

      expect(
        prismaMock.users.count,
      ).toHaveBeenCalledTimes(1);

      expect(
        prismaMock.courses.count,
      ).toHaveBeenCalledTimes(1);
    });
  });
});