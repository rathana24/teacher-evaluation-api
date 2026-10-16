-- Add the authenticated mapping workflow to existing review storage.
-- No ownership/record backfill, table/column change or existing receipt rewrite.
DO $mapping_review_kind$
BEGIN
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE reviewed_operations IN ACCESS EXCLUSIVE MODE;
  ALTER TABLE reviewed_operations DROP CONSTRAINT reviewed_operations_kind_check;
  ALTER TABLE reviewed_operations ADD CONSTRAINT reviewed_operations_kind_check CHECK (
    operation_kind IN ('ENROLL_GROUP', 'CREATE_EVALUATION', 'REASSIGN_ENROLLMENT',
      'BULK_GROUP_PLACEMENT', 'OPEN_ASSIGNED_VERSION', 'APPLY_LATEST_VERSION', 'COHORT_MAPPING')
  );
END $mapping_review_kind$;
