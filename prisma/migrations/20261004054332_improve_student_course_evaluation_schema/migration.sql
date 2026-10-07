/*
  Warnings:

  - A unique constraint covering the columns `[course_id,lecturer_id,semester_id,year_level,class_type,section_code]` on the table `course_offerings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[academic_year_id,semester_number]` on the table `semesters` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "evaluation_participant_scope" AS ENUM ('ALL_ENROLLED', 'SELECTED_GENERATIONS');

-- CreateEnum
CREATE TYPE "class_type" AS ENUM ('COURSE', 'TD', 'TP');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- DropIndex
DROP INDEX "course_offerings_course_id_lecturer_id_semester_id_section__idx";

-- AlterTable
ALTER TABLE "academic_years" ADD COLUMN     "start_year" INTEGER,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "course_offerings" ADD COLUMN     "class_type" "class_type",
ADD COLUMN     "year_level" INTEGER;

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "evaluations" ADD COLUMN     "participant_scope" "evaluation_participant_scope" NOT NULL DEFAULT 'ALL_ENROLLED';

-- AlterTable
ALTER TABLE "semesters" ADD COLUMN     "semester_number" INTEGER;

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "archived_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "gender" "gender",
ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "majors" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "department_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "majors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_generations" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "entry_academic_year_id" BIGINT NOT NULL,
    "starting_year_level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "student_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "student_code" VARCHAR(50) NOT NULL,
    "generation_id" BIGINT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_academic_records" (
    "id" BIGSERIAL NOT NULL,
    "student_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "year_level" INTEGER NOT NULL,
    "major_id" BIGINT NOT NULL,
    "class_group" VARCHAR(50),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "student_academic_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_year_rules" (
    "id" BIGSERIAL NOT NULL,
    "course_id" BIGINT NOT NULL,
    "major_id" BIGINT NOT NULL,
    "year_level" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "course_year_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_generation_targets" (
    "evaluation_id" BIGINT NOT NULL,
    "generation_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_generation_targets_pkey" PRIMARY KEY ("evaluation_id","generation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "majors_code_key" ON "majors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "majors_department_id_name_idx" ON "majors"("department_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "student_generations_name_key" ON "student_generations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_student_code_key" ON "students"("student_code");

-- CreateIndex
CREATE UNIQUE INDEX "student_academic_records_student_id_academic_year_id_idx" ON "student_academic_records"("student_id", "academic_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "course_year_rules_course_major_year_idx" ON "course_year_rules"("course_id", "major_id", "year_level");

-- CreateIndex
CREATE UNIQUE INDEX "course_offerings_assignment_unique_idx" ON "course_offerings"("course_id", "lecturer_id", "semester_id", "year_level", "class_type", "section_code");

-- CreateIndex
CREATE UNIQUE INDEX "semesters_academic_year_id_semester_number_idx" ON "semesters"("academic_year_id", "semester_number");

-- AddForeignKey
ALTER TABLE "majors" ADD CONSTRAINT "majors_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_generations" ADD CONSTRAINT "student_generations_entry_academic_year_id_fkey" FOREIGN KEY ("entry_academic_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "student_generations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_academic_records" ADD CONSTRAINT "student_academic_records_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_year_rules" ADD CONSTRAINT "course_year_rules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_year_rules" ADD CONSTRAINT "course_year_rules_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_generation_targets" ADD CONSTRAINT "evaluation_generation_targets_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_generation_targets" ADD CONSTRAINT "evaluation_generation_targets_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "student_generations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
