-- No membership rows are changed. Resolve ambiguous primaries only after review.
-- The lock keeps the audit and index creation atomic against concurrent writers.
DO $$
BEGIN
  LOCK TABLE "user_departments" IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (
    SELECT "user_id" FROM "user_departments"
    WHERE "is_primary" = TRUE
    GROUP BY "user_id" HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple primary departments exist. Review assignments before applying this migration; no rows were changed.'
      USING ERRCODE = '23514';
  END IF;

  CREATE UNIQUE INDEX "user_departments_one_primary_per_user_idx"
    ON "user_departments" ("user_id") WHERE "is_primary" = TRUE;
END $$;
