-- New assignments have a known year/type. Preserve all legacy NULL contexts,
-- original labels, IDs, history, and the existing NULLS NOT DISTINCT index.
-- Refuse ambiguous complete contexts rather than deleting/merging any row.
DO $assignment_creation$
BEGIN
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE course_offerings IN SHARE ROW EXCLUSIVE MODE;
  LOCK TABLE reviewed_operations IN ACCESS EXCLUSIVE MODE;
  IF EXISTS (
    SELECT 1 FROM course_offerings
    WHERE year_level IS NOT NULL AND class_type IS NOT NULL
    GROUP BY course_id, lecturer_id, semester_id, year_level, class_type
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Complete teaching-assignment identity conflicts require reviewed resolution; no records were changed';
  END IF;
  CREATE UNIQUE INDEX course_offerings_complete_identity_idx
    ON course_offerings (course_id, lecturer_id, semester_id, year_level, class_type)
    WHERE year_level IS NOT NULL AND class_type IS NOT NULL;
  ALTER TABLE reviewed_operations DROP CONSTRAINT reviewed_operations_kind_check;
  ALTER TABLE reviewed_operations ADD CONSTRAINT reviewed_operations_kind_check CHECK (
    operation_kind IN ('ENROLL_GROUP', 'CREATE_EVALUATION', 'REASSIGN_ENROLLMENT',
      'BULK_GROUP_PLACEMENT', 'OPEN_ASSIGNED_VERSION', 'APPLY_LATEST_VERSION',
      'COHORT_MAPPING', 'CREATE_COURSE', 'CREATE_ASSIGNMENTS')
  );
END $assignment_creation$;
