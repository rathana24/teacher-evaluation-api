-- Atomic, data-preserving preflight and DDL. Never choose winners or repair rows.
DO $migration$
BEGIN
  SET LOCAL lock_timeout = '5s';
  SET LOCAL statement_timeout = '60s';
  LOCK TABLE academic_years, surveys, course_offerings, student_generations,
    student_academic_records, course_year_rules, course_offering_group_scopes,
    evaluation_group_targets, semesters, evaluations IN ACCESS EXCLUSIVE MODE;

  IF (SELECT COUNT(*) FROM academic_years WHERE is_active) > 1 THEN
    RAISE EXCEPTION 'Academic integrity preflight: multiple active academic years; review records first. No rows were changed.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT lower(btrim(title, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))
    FROM surveys GROUP BY 1 HAVING COUNT(*) > 1
  ) OR EXISTS (
    SELECT 1 FROM surveys WHERE btrim(title, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') = ''
  ) THEN
    RAISE EXCEPTION 'Academic integrity preflight: blank or duplicate normalized questionnaire titles; review records first. No rows were changed.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT course_id, lecturer_id, semester_id, year_level, class_type, section_code
    FROM course_offerings GROUP BY 1,2,3,4,5,6 HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Academic integrity preflight: duplicate offering assignments including NULL metadata; review records first. No rows were changed.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM student_generations WHERE starting_year_level NOT BETWEEN 1 AND 5)
    OR EXISTS (SELECT 1 FROM student_academic_records WHERE year_level NOT BETWEEN 1 AND 5)
    OR EXISTS (SELECT 1 FROM course_year_rules WHERE year_level NOT BETWEEN 1 AND 5)
    OR EXISTS (SELECT 1 FROM course_offering_group_scopes WHERE year_level NOT BETWEEN 1 AND 5)
    OR EXISTS (SELECT 1 FROM evaluation_group_targets WHERE year_level NOT BETWEEN 1 AND 5)
    OR EXISTS (SELECT 1 FROM course_offerings WHERE year_level NOT BETWEEN 1 AND 5)
    OR EXISTS (SELECT 1 FROM academic_years WHERE start_year NOT BETWEEN 1900 AND 2200)
  THEN
    RAISE EXCEPTION 'Academic integrity preflight: invalid year level or numeric start_year; review records first. No rows were changed.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM academic_years WHERE end_date <= start_date)
    OR EXISTS (SELECT 1 FROM semesters WHERE end_date <= start_date)
    OR EXISTS (SELECT 1 FROM evaluations WHERE end_at <= start_at)
  THEN
    RAISE EXCEPTION 'Academic integrity preflight: invalid date range; review records first. No rows were changed.' USING ERRCODE = '23514';
  END IF;

  CREATE FUNCTION public.survey_title_key(value text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $key$
      SELECT lower(btrim(value, U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'));
    $key$;

  CREATE UNIQUE INDEX academic_years_one_active_idx
    ON academic_years (is_active) WHERE is_active = TRUE;
  CREATE UNIQUE INDEX surveys_title_key_unique_idx
    ON surveys (public.survey_title_key(title));
  ALTER TABLE surveys ADD CONSTRAINT surveys_title_nonblank_check
    CHECK (public.survey_title_key(title) <> '');

  -- Prisma created this as a standalone index; retain its compound-selector name.
  -- The enclosing DO statement rolls back the drop if replacement/any DDL fails.
  DROP INDEX course_offerings_assignment_unique_idx;
  CREATE UNIQUE INDEX course_offerings_assignment_unique_idx
    ON course_offerings (course_id, lecturer_id, semester_id, year_level, class_type, section_code)
    NULLS NOT DISTINCT;

  ALTER TABLE student_generations ADD CONSTRAINT student_generations_starting_level_check CHECK (starting_year_level BETWEEN 1 AND 5);
  ALTER TABLE student_academic_records ADD CONSTRAINT student_academic_records_level_check CHECK (year_level BETWEEN 1 AND 5);
  ALTER TABLE course_year_rules ADD CONSTRAINT course_year_rules_level_check CHECK (year_level BETWEEN 1 AND 5);
  ALTER TABLE course_offering_group_scopes ADD CONSTRAINT course_offering_group_scopes_level_check CHECK (year_level BETWEEN 1 AND 5);
  ALTER TABLE evaluation_group_targets ADD CONSTRAINT evaluation_group_targets_level_check CHECK (year_level BETWEEN 1 AND 5);
  ALTER TABLE course_offerings ADD CONSTRAINT course_offerings_level_check CHECK (year_level BETWEEN 1 AND 5);
  ALTER TABLE academic_years ADD CONSTRAINT academic_years_start_year_check CHECK (start_year BETWEEN 1900 AND 2200);
  ALTER TABLE academic_years ADD CONSTRAINT academic_years_date_order_check CHECK (end_date > start_date);
  ALTER TABLE semesters ADD CONSTRAINT semesters_date_order_check CHECK (end_date > start_date);
  ALTER TABLE evaluations ADD CONSTRAINT evaluations_date_order_check CHECK (end_at > start_at);
END $migration$;
