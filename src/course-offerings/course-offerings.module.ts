import { Module } from '@nestjs/common';
import { CourseOfferingsController } from './course-offerings.controller';
import { LecturerCourseOfferingsController } from './lecturer-course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';
import { AssignmentCreationController } from './assignment-creation.controller';
import { AssignmentCreationService } from './assignment-creation.service';

@Module({
  controllers: [
    AssignmentCreationController,
    CourseOfferingsController,
    LecturerCourseOfferingsController,
  ],
  providers: [CourseOfferingsService, AssignmentCreationService]
})
export class CourseOfferingsModule {}
