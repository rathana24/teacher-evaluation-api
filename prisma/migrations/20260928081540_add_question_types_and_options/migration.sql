-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "question_type" ADD VALUE 'AGREEMENT';
ALTER TYPE "question_type" ADD VALUE 'FREQUENCY';
ALTER TYPE "question_type" ADD VALUE 'MULTIPLE_CHOICE';
ALTER TYPE "question_type" ADD VALUE 'CHECKBOX';

-- CreateTable
CREATE TABLE "answer_options" (
    "answer_id" BIGINT NOT NULL,
    "option_id" BIGINT NOT NULL,

    CONSTRAINT "answer_options_pkey" PRIMARY KEY ("answer_id","option_id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" BIGSERIAL NOT NULL,
    "question_id" BIGINT NOT NULL,
    "option_text" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_options_question_id_display_order_idx" ON "question_options"("question_id", "display_order");

-- AddForeignKey
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_options" ADD CONSTRAINT "answer_options_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
