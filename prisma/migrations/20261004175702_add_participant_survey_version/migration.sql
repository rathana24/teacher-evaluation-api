-- AlterTable
ALTER TABLE "evaluation_participants" ADD COLUMN     "survey_version_id" BIGINT;

-- AddForeignKey
ALTER TABLE "evaluation_participants" ADD CONSTRAINT "evaluation_participants_survey_version_id_fkey" FOREIGN KEY ("survey_version_id") REFERENCES "survey_versions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
