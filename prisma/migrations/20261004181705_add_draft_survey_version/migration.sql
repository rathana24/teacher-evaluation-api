-- AlterTable
ALTER TABLE "assessment_drafts" ADD COLUMN     "survey_version_id" BIGINT;

-- AddForeignKey
ALTER TABLE "assessment_drafts" ADD CONSTRAINT "assessment_drafts_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
