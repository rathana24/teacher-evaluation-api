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
import { AssessmentDraftsModule } from './assessment-drafts/assessment-drafts.module';
import { AcademicYearsModule } from './academic-years/academic-years.module';
import { DepartmentsModule } from './departments/departments.module';
import { ResultsModule } from './results/results.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
    AssessmentDraftsModule,
    AcademicYearsModule,
    DepartmentsModule,
    ResultsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}