-- Extend administrative receipt kinds only; preserve all academic/history rows.
DO $year_setup$
BEGIN
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE reviewed_operations IN ACCESS EXCLUSIVE MODE;
  ALTER TABLE reviewed_operations DROP CONSTRAINT reviewed_operations_kind_check;
  ALTER TABLE reviewed_operations ADD CONSTRAINT reviewed_operations_kind_check CHECK (
    operation_kind IN ('ENROLL_GROUP', 'CREATE_EVALUATION', 'REASSIGN_ENROLLMENT',
      'BULK_GROUP_PLACEMENT', 'OPEN_ASSIGNED_VERSION', 'APPLY_LATEST_VERSION',
      'COHORT_MAPPING', 'CREATE_COURSE', 'CREATE_ASSIGNMENTS', 'SETUP_ACADEMIC_YEAR')
  );
END $year_setup$;
