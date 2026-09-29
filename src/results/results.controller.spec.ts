import { Test, TestingModule } from '@nestjs/testing';

import {
  AdminResultsController,
  LecturerResultsController,
} from './results.controller';

import { ResultsService } from './results.service';

describe('ResultsControllers', () => {
  let adminController: AdminResultsController;
  let lecturerController: LecturerResultsController;

  const mockResultsService = {
    getAdminResults: jest.fn(),
    getAdminResultsByLecturer: jest.fn(),
    getLecturerResults: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [
          AdminResultsController,
          LecturerResultsController,
        ],
        providers: [
          {
            provide: ResultsService,
            useValue: mockResultsService,
          },
        ],
      }).compile();

    adminController =
      module.get<AdminResultsController>(
        AdminResultsController,
      );

    lecturerController =
      module.get<LecturerResultsController>(
        LecturerResultsController,
      );
  });

  it('should define the admin results controller', () => {
    expect(adminController).toBeDefined();
  });

  it('should define the lecturer results controller', () => {
    expect(lecturerController).toBeDefined();
  });
});