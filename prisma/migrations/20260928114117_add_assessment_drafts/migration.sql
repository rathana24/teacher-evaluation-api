-- CreateTable
CREATE TABLE "assessment_drafts" (
    "id" BIGSERIAL NOT NULL,
    "participant_id" BIGINT NOT NULL,
    "answers_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "assessment_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_drafts_participant_id_key" ON "assessment_drafts"("participant_id");

-- AddForeignKey
ALTER TABLE "assessment_drafts" ADD CONSTRAINT "assessment_drafts_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "evaluation_participants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
