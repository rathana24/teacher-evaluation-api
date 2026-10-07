CREATE TYPE "student_progression_action" AS ENUM ('NORMAL', 'REPEAT', 'TRANSFER', 'PAUSE', 'RESUME');
ALTER TABLE "student_academic_records"
ADD COLUMN "progression_action" "student_progression_action" NOT NULL DEFAULT 'NORMAL';
