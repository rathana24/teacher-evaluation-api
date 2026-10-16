-- CANDIDATE ONLY. Not in prisma/migrations and not deployable to public.
-- Exercise through the owned-schema integration fixture before coordinated API cutover.
DO $expansion$
BEGIN
  IF current_database() <> 'teacher_evaluation_test'
    OR current_schema() !~ '^cohort_test_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Candidate expansion requires an owned isolated cohort fixture schema' USING ERRCODE = '23514';
  END IF;
  SET LOCAL lock_timeout = '5s';
  LOCK TABLE student_generations, student_academic_records,
    course_offering_group_scopes IN ACCESS EXCLUSIVE MODE;

  CREATE TABLE cohort_mapping_operations (
    id UUID PRIMARY KEY,
    manifest_sha256 VARCHAR(64) NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
    source_fingerprint VARCHAR(64) NOT NULL CHECK (source_fingerprint ~ '^[a-f0-9]{64}$'),
    reviewer_label VARCHAR(150) NOT NULL CHECK (btrim(reviewer_label) <> ''),
    reviewed_at TIMESTAMP(6) NOT NULL,
    manifest JSONB NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  ALTER TABLE student_generations
    ADD COLUMN ownership_state VARCHAR(32) NOT NULL DEFAULT 'LEGACY_READ_ONLY',
    ADD COLUMN major_id BIGINT REFERENCES majors(id) ON DELETE NO ACTION,
    ADD COLUMN generation_number INTEGER,
    ADD COLUMN mapping_operation_id UUID REFERENCES cohort_mapping_operations(id) ON DELETE NO ACTION,
    ADD CONSTRAINT cohort_ownership_state_check CHECK (
      (ownership_state = 'LEGACY_READ_ONLY' AND major_id IS NULL AND generation_number IS NULL AND mapping_operation_id IS NULL)
      OR (ownership_state = 'MAJOR_SCOPED' AND major_id IS NOT NULL AND generation_number IS NOT NULL AND generation_number BETWEEN 1 AND 2147483647)
    ),
    ADD CONSTRAINT cohort_major_number_unique UNIQUE (major_id, generation_number),
    ADD CONSTRAINT cohort_id_major_unique UNIQUE (id, major_id);
  DROP INDEX student_generations_name_key;
  CREATE INDEX cohort_legacy_name_idx ON student_generations(name);

  ALTER TABLE student_academic_records
    ADD COLUMN generation_id BIGINT,
    ADD CONSTRAINT academic_record_cohort_major_fk FOREIGN KEY (generation_id, major_id)
      REFERENCES student_generations(id, major_id) ON DELETE NO ACTION;
  CREATE INDEX academic_record_cohort_idx ON student_academic_records(generation_id);

  CREATE TABLE student_cohort_assignment_events (
    id BIGSERIAL PRIMARY KEY,
    academic_record_id BIGINT NOT NULL UNIQUE REFERENCES student_academic_records(id) ON DELETE NO ACTION,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE NO ACTION,
    academic_year_id BIGINT NOT NULL REFERENCES academic_years(id) ON DELETE NO ACTION,
    major_id BIGINT NOT NULL REFERENCES majors(id) ON DELETE NO ACTION,
    generation_id BIGINT NOT NULL,
    previous_generation_id BIGINT REFERENCES student_generations(id) ON DELETE NO ACTION,
    action VARCHAR(16) NOT NULL CHECK (action IN ('INITIAL', 'TRANSFER', 'MIGRATION')),
    mapping_operation_id UUID REFERENCES cohort_mapping_operations(id) ON DELETE NO ACTION,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assignment_cohort_major_fk FOREIGN KEY (generation_id, major_id)
      REFERENCES student_generations(id, major_id) ON DELETE NO ACTION,
    CONSTRAINT assignment_action_context_check CHECK (
      (action = 'MIGRATION' AND mapping_operation_id IS NOT NULL AND previous_generation_id IS NULL)
      OR (action = 'INITIAL' AND mapping_operation_id IS NULL AND previous_generation_id IS NULL)
      OR (action = 'TRANSFER' AND mapping_operation_id IS NULL AND previous_generation_id IS NOT NULL AND previous_generation_id <> generation_id)
    )
  );
  CREATE INDEX cohort_assignment_timeline_idx ON student_cohort_assignment_events(student_id, academic_year_id);

  CREATE FUNCTION protect_cohort_audit() RETURNS trigger LANGUAGE plpgsql AS $audit$
  BEGIN
    RAISE EXCEPTION 'Cohort mapping and assignment evidence is immutable' USING ERRCODE = '23514';
  END $audit$;
  CREATE TRIGGER cohort_mapping_immutable BEFORE UPDATE OR DELETE ON cohort_mapping_operations
    FOR EACH ROW EXECUTE FUNCTION protect_cohort_audit();
  CREATE TRIGGER cohort_assignment_immutable BEFORE UPDATE OR DELETE ON student_cohort_assignment_events
    FOR EACH ROW EXECUTE FUNCTION protect_cohort_audit();

  CREATE FUNCTION protect_cohort_identity() RETURNS trigger LANGUAGE plpgsql AS $identity$
  BEGIN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cohort references must be preserved' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' THEN
      IF NEW.ownership_state <> 'MAJOR_SCOPED' THEN
        RAISE EXCEPTION 'New cohorts require explicit major ownership' USING ERRCODE = '23514';
      END IF;
      RETURN NEW;
    END IF;
    IF OLD.ownership_state = 'LEGACY_READ_ONLY' THEN
      IF NEW.ownership_state <> 'MAJOR_SCOPED' OR NEW.mapping_operation_id IS NULL
        OR NEW.name IS DISTINCT FROM OLD.name
        OR NEW.entry_academic_year_id <> OLD.entry_academic_year_id
        OR NEW.starting_year_level <> OLD.starting_year_level
        OR NEW.id <> OLD.id THEN
        RAISE EXCEPTION 'Legacy cohorts require a reviewed identity-preserving mapping' USING ERRCODE = '23514';
      END IF;
    ELSIF ROW(NEW.id, NEW.major_id, NEW.generation_number, NEW.entry_academic_year_id, NEW.starting_year_level, NEW.ownership_state, NEW.mapping_operation_id)
      IS DISTINCT FROM ROW(OLD.id, OLD.major_id, OLD.generation_number, OLD.entry_academic_year_id, OLD.starting_year_level, OLD.ownership_state, OLD.mapping_operation_id) THEN
      RAISE EXCEPTION 'Canonical cohort identity and entry metadata are immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END $identity$;
  CREATE TRIGGER cohort_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON student_generations
    FOR EACH ROW EXECUTE FUNCTION protect_cohort_identity();

  CREATE FUNCTION validate_yearly_cohort() RETURNS trigger LANGUAGE plpgsql AS $placement$
  BEGIN
    IF TG_OP = 'UPDATE' AND OLD.generation_id IS NOT NULL
      AND ROW(NEW.id, NEW.student_id, NEW.academic_year_id, NEW.major_id, NEW.generation_id)
        IS DISTINCT FROM ROW(OLD.id, OLD.student_id, OLD.academic_year_id, OLD.major_id, OLD.generation_id) THEN
      RAISE EXCEPTION 'Resolved yearly cohort identity cannot be relabeled' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.generation_id IS NULL THEN
      RAISE EXCEPTION 'New placement requires an explicit major cohort' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END $placement$;
  CREATE TRIGGER yearly_cohort_guard BEFORE INSERT OR UPDATE ON student_academic_records
    FOR EACH ROW EXECUTE FUNCTION validate_yearly_cohort();

  CREATE FUNCTION require_assignment_evidence() RETURNS trigger LANGUAGE plpgsql AS $evidence$
  BEGIN
    -- Deferred: both the row and its append-only event must commit together.
    IF NEW.generation_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM student_cohort_assignment_events event
      WHERE event.academic_record_id = NEW.id AND event.student_id = NEW.student_id
        AND event.academic_year_id = NEW.academic_year_id AND event.major_id = NEW.major_id
        AND event.generation_id = NEW.generation_id
        AND (TG_OP <> 'UPDATE' OR OLD.generation_id IS NOT NULL OR event.action = 'MIGRATION')
        AND (TG_OP <> 'INSERT' OR event.action = CASE WHEN NEW.progression_action = 'TRANSFER' THEN 'TRANSFER' ELSE 'INITIAL' END)
    ) THEN
      RAISE EXCEPTION 'Yearly cohort assignment requires matching immutable evidence' USING ERRCODE = '23514';
    END IF;
    RETURN NULL;
  END $evidence$;
  CREATE CONSTRAINT TRIGGER yearly_cohort_evidence AFTER INSERT OR UPDATE ON student_academic_records
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION require_assignment_evidence();

  CREATE FUNCTION validate_assignment_evidence() RETURNS trigger LANGUAGE plpgsql AS $event$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM student_academic_records record WHERE record.id = NEW.academic_record_id
        AND record.student_id = NEW.student_id AND record.academic_year_id = NEW.academic_year_id
        AND record.major_id = NEW.major_id AND record.generation_id = NEW.generation_id
        AND (NEW.action <> 'TRANSFER' OR record.progression_action = 'TRANSFER')
    ) THEN
      RAISE EXCEPTION 'Assignment evidence must match its yearly placement' USING ERRCODE = '23514';
    END IF;
    IF NEW.action = 'TRANSFER' AND NOT EXISTS (
      SELECT 1 FROM student_academic_records prior
      JOIN academic_years prior_year ON prior_year.id = prior.academic_year_id
      JOIN academic_years destination_year ON destination_year.id = NEW.academic_year_id
      WHERE prior.student_id = NEW.student_id AND prior.generation_id = NEW.previous_generation_id
        AND prior_year.start_year < destination_year.start_year
    ) THEN
      RAISE EXCEPTION 'Transfer must reference an earlier resolved cohort of the same student' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END $event$;
  CREATE TRIGGER assignment_evidence_guard BEFORE INSERT ON student_cohort_assignment_events
    FOR EACH ROW EXECUTE FUNCTION validate_assignment_evidence();

  CREATE FUNCTION validate_scope_cohort() RETURNS trigger LANGUAGE plpgsql AS $scope$
  BEGIN
    IF TG_OP = 'UPDATE' AND ROW(NEW.course_offering_id, NEW.academic_year_id, NEW.generation_id, NEW.major_id, NEW.year_level, NEW.class_group)
      IS NOT DISTINCT FROM ROW(OLD.course_offering_id, OLD.academic_year_id, OLD.generation_id, OLD.major_id, OLD.year_level, OLD.class_group) THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM student_generations cohort WHERE cohort.id = NEW.generation_id
      AND cohort.major_id = NEW.major_id AND cohort.ownership_state = 'MAJOR_SCOPED') THEN
      RAISE EXCEPTION 'New offering scope requires a matching major-owned cohort' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END $scope$;
  CREATE TRIGGER offering_scope_cohort_guard BEFORE INSERT OR UPDATE ON course_offering_group_scopes
    FOR EACH ROW EXECUTE FUNCTION validate_scope_cohort();
END $expansion$;
