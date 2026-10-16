-- Reuse durable administrative operation storage for atomic course-create receipts.
-- No course renaming, ownership backfill, table/column/sequence change or old receipt edit.
DO $course_creation_kind$
BEGIN
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE reviewed_operations IN ACCESS EXCLUSIVE MODE;
  ALTER TABLE reviewed_operations DROP CONSTRAINT reviewed_operations_kind_check;
  ALTER TABLE reviewed_operations ADD CONSTRAINT reviewed_operations_kind_check CHECK (
    operation_kind IN ('ENROLL_GROUP', 'CREATE_EVALUATION', 'REASSIGN_ENROLLMENT',
      'BULK_GROUP_PLACEMENT', 'OPEN_ASSIGNED_VERSION', 'APPLY_LATEST_VERSION',
      'COHORT_MAPPING', 'CREATE_COURSE')
  );
END $course_creation_kind$;
