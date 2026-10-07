import { Module } from '@nestjs/common';
import { AssessmentDraftsController } from './assessment-drafts.controller';
import { AssessmentDraftsService } from './assessment-drafts.service';
import { PrismaService } from '../prisma/prisma.service';
import { StudentAccessService } from '../student-access/student-access.service';

@Module({
  controllers: [AssessmentDraftsController],
  providers: [
    AssessmentDraftsService,
    PrismaService,
    StudentAccessService,
  ],
  exports: [AssessmentDraftsService],
})
export class AssessmentDraftsModule {}