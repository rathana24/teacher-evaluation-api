-- CreateTable
CREATE TABLE "course_offering_group_scopes" (
    "id" BIGSERIAL NOT NULL,
    "course_offering_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "generation_id" BIGINT NOT NULL,
    "major_id" BIGINT NOT NULL,
    "year_level" INTEGER NOT NULL,
    "class_group" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_offering_group_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_group_targets" (
    "id" BIGSERIAL NOT NULL,
    "evaluation_id" BIGINT NOT NULL,
    "academic_year_id" BIGINT NOT NULL,
    "generation_id" BIGINT NOT NULL,
    "major_id" BIGINT NOT NULL,
    "year_level" INTEGER NOT NULL,
    "class_group" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_group_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_offering_group_scope_context_idx" ON "course_offering_group_scopes"("academic_year_id", "generation_id", "major_id", "year_level");

-- CreateIndex
CREATE UNIQUE INDEX "course_offering_group_scope_unique_idx" ON "course_offering_group_scopes"("course_offering_id", "academic_year_id", "generation_id", "major_id", "year_level", "class_group");

-- CreateIndex
CREATE INDEX "evaluation_group_target_context_idx" ON "evaluation_group_targets"("academic_year_id", "generation_id", "major_id", "year_level");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_group_target_unique_idx" ON "evaluation_group_targets"("evaluation_id", "academic_year_id", "generation_id", "major_id", "year_level", "class_group");

-- AddForeignKey
ALTER TABLE "course_offering_group_scopes" ADD CONSTRAINT "course_offering_group_scopes_course_offering_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_offering_group_scopes" ADD CONSTRAINT "course_offering_group_scopes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_offering_group_scopes" ADD CONSTRAINT "course_offering_group_scopes_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "student_generations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_offering_group_scopes" ADD CONSTRAINT "course_offering_group_scopes_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_group_targets" ADD CONSTRAINT "evaluation_group_targets_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_group_targets" ADD CONSTRAINT "evaluation_group_targets_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_group_targets" ADD CONSTRAINT "evaluation_group_targets_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "student_generations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evaluation_group_targets" ADD CONSTRAINT "evaluation_group_targets_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "majors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
