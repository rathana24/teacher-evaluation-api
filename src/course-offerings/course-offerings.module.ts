import { Module } from '@nestjs/common';
import { CourseOfferingsController } from './course-offerings.controller';
import { LecturerCourseOfferingsController } from './lecturer-course-offerings.controller';
import { CourseOfferingsService } from './course-offerings.service';

@Module({
  controllers: [
    CourseOfferingsController,
    LecturerCourseOfferingsController,
  ],
  providers: [CourseOfferingsService]
})
export class CourseOfferingsModule {}
