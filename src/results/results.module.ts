import { Module } from '@nestjs/common';

import {
  AdminResultsController,
  LecturerResultsController,
} from './results.controller';

import { ResultsService } from './results.service';

@Module({
  controllers: [
    AdminResultsController,
    LecturerResultsController,
  ],
  providers: [ResultsService],
})
export class ResultsModule {}