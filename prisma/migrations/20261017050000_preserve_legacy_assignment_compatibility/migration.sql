-- Complete new assignments retain label-independent SQL uniqueness. Incomplete
-- historical contexts retain master's existing nullable-identity compatibility.
-- Application create/context-change validation still requires a valid year/type.
CREATE OR REPLACE FUNCTION guard_teaching_assignment_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.year_level IS NULL OR NEW.class_type IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND (NEW.course_id,NEW.lecturer_id,NEW.semester_id,NEW.year_level,NEW.class_type)
  IS NOT DISTINCT FROM (OLD.course_id,OLD.lecturer_id,OLD.semester_id,OLD.year_level,OLD.class_type) THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('teaching-assignment:'||NEW.course_id::text||':'||NEW.semester_id::text,0));
 IF EXISTS(SELECT 1 FROM course_offerings o WHERE o.id<>NEW.id AND o.course_id=NEW.course_id
  AND o.lecturer_id=NEW.lecturer_id AND o.semester_id=NEW.semester_id
  AND o.year_level=NEW.year_level AND o.class_type=NEW.class_type) THEN
  RAISE EXCEPTION 'ASSIGNMENT_EXISTS: teaching assignment already exists regardless of class label' USING ERRCODE='23505';
 END IF;
 RETURN NEW;
END $$;
