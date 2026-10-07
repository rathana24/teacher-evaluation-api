import { Module } from '@nestjs/common';
import { StudentGenerationsController } from './student-generations.controller';
import { StudentGenerationsService } from './student-generations.service';

@Module({
  controllers: [StudentGenerationsController],
  providers: [StudentGenerationsService],
  exports: [StudentGenerationsService],
})
export class StudentGenerationsModule {}