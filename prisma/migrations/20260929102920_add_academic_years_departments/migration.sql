-- ============================================================
-- Academic Year + Department Migration
-- Preserves existing semester and course data
-- ============================================================

-- 1. Create department status enum
CREATE TYPE "department_status" AS ENUM ('ACTIVE', 'INACTIVE');


-- ============================================================
-- 2. Create academic_years
-- ============================================================

CREATE TABLE "academic_years" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "academic_years_name_key"
ON "academic_years"("name");


-- ============================================================
-- 3. Copy existing academic years
-- ============================================================

INSERT INTO "academic_years" ("name")
SELECT DISTINCT "academic_year"
FROM "semesters"
WHERE "academic_year" IS NOT NULL
  AND TRIM("academic_year") <> '';


-- ============================================================
-- 4. Add semester FK temporarily as nullable
-- ============================================================

ALTER TABLE "semesters"
ADD COLUMN "academic_year_id" BIGINT;


-- ============================================================
-- 5. Connect existing semesters to academic_years
-- ============================================================

UPDATE "semesters" s
SET "academic_year_id" = ay."id"
FROM "academic_years" ay
WHERE s."academic_year" = ay."name";


-- Safety check:
-- Abort migration if any semester could not be mapped.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "semesters"
        WHERE "academic_year_id" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Academic year migration failed: some semesters were not mapped.';
    END IF;
END $$;


-- ============================================================
-- 6. Now academic_year_id can safely become required
-- ============================================================

ALTER TABLE "semesters"
ALTER COLUMN "academic_year_id" SET NOT NULL;


-- Remove old unique constraint/index before removing old field
DROP INDEX "semesters_semester_name_academic_year_idx";


-- Remove old text field only AFTER backfill succeeded
ALTER TABLE "semesters"
DROP COLUMN "academic_year";


-- New semester uniqueness rule
CREATE UNIQUE INDEX
"semesters_academic_year_id_semester_name_idx"
ON "semesters"("academic_year_id", "semester_name");


-- Add AcademicYear FK
ALTER TABLE "semesters"
ADD CONSTRAINT "semesters_academic_year_id_fkey"
FOREIGN KEY ("academic_year_id")
REFERENCES "academic_years"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;


-- ============================================================
-- 7. Create departments
-- ============================================================

CREATE TABLE "departments" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "department_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_code_key"
ON "departments"("code");

CREATE UNIQUE INDEX "departments_name_key"
ON "departments"("name");


-- ============================================================
-- 8. Seed current department
-- ============================================================

INSERT INTO "departments" ("code", "name", "status")
VALUES (
    'AMS',
    'Applied Mathematics and Statistics',
    'ACTIVE'
);


-- ============================================================
-- 9. Add department_id to courses as nullable first
-- ============================================================

ALTER TABLE "courses"
ADD COLUMN "department_id" BIGINT;


-- Existing courses belong to AMS for current deployment
UPDATE "courses"
SET "department_id" = (
    SELECT "id"
    FROM "departments"
    WHERE "code" = 'AMS'
);


-- Safety check
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "courses"
        WHERE "department_id" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Department migration failed: some courses were not mapped.';
    END IF;
END $$;


-- Now safe to require department
ALTER TABLE "courses"
ALTER COLUMN "department_id" SET NOT NULL;


ALTER TABLE "courses"
ADD CONSTRAINT "courses_department_id_fkey"
FOREIGN KEY ("department_id")
REFERENCES "departments"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;


-- ============================================================
-- 10. Create user_departments
-- ============================================================

CREATE TABLE "user_departments" (
    "user_id" BIGINT NOT NULL,
    "department_id" BIGINT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_departments_pkey"
    PRIMARY KEY ("user_id", "department_id")
);


ALTER TABLE "user_departments"
ADD CONSTRAINT "user_departments_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "users"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;


ALTER TABLE "user_departments"
ADD CONSTRAINT "user_departments_department_id_fkey"
FOREIGN KEY ("department_id")
REFERENCES "departments"("id")
ON DELETE NO ACTION
ON UPDATE NO ACTION;


-- ============================================================
-- 11. Associate existing lecturers and admins with AMS
-- ============================================================

INSERT INTO "user_departments" (
    "user_id",
    "department_id",
    "is_primary"
)
SELECT
    u."id",
    d."id",
    true
FROM "users" u
CROSS JOIN "departments" d
WHERE d."code" = 'AMS'
  AND u."role" IN ('LECTURER', 'ADMIN');