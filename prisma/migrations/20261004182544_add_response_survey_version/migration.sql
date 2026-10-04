-- AlterTable
ALTER TABLE "responses" ADD COLUMN     "survey_version_id" BIGINT;

-- AddForeignKey
ALTER TABLE "responses" ADD CONSTRAINT "responses_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
