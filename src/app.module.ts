import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CoursesModule } from './courses/courses.module';
import { SemestersModule } from './semesters/semesters.module';
import { CourseOfferingsModule } from './course-offerings/course-offerings.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { UsersModule } from './users/users.module';
import { SurveysModule } from './surveys/surveys.module';
import { SurveyVersionsModule } from './survey-versions/survey-versions.module';
import { QuestionsModule } from './questions/questions.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { StudentAccessModule } from './student-access/student-access.module';
import { SubmissionsModule } from './submissions/submissions.module';

// Day5 modules
import { AssessmentDraftsModule } from './assessment-drafts/assessment-drafts.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { DepartmentsModule } from './departments/departments.module';
import { MajorsModule } from './majors/majors.module';
import { StudentGenerationsModule } from './student-generations/student-generations.module';
import { ResultsModule } from './results/results.module';

// Master modules
import { LecturerDashboardModule } from './lecturer-dashboard/lecturer-dashboard.module';
import { CommentsModule } from './comments/comments.module';
import { StudentsModule } from './students/students.module';
import { StudentAcademicRecordsModule } from './student-academic-records/student-academic-records.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    CoursesModule,
    SemestersModule,
    CourseOfferingsModule,
    EnrollmentsModule,
    UsersModule,
    SurveysModule,
    SurveyVersionsModule,
    QuestionsModule,
    EvaluationsModule,
    StudentAccessModule,
    SubmissionsModule,

    // Day5
    AssessmentDraftsModule,
    AcademicYearsModule,
    DepartmentsModule,
    MajorsModule,
    StudentGenerationsModule,
    ResultsModule,

    // Master
    LecturerDashboardModule,
    CommentsModule,
    StudentsModule,
    StudentAcademicRecordsModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}