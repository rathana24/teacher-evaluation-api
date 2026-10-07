-- Additive only: do not guess historical curriculum or bind existing scopes.
CREATE TABLE "curriculum_revisions" (
  "id" BIGSERIAL PRIMARY KEY,
  "rule_id" BIGINT NOT NULL,
  "revision_no" INTEGER NOT NULL CHECK ("revision_no" > 0),
  "effective_academic_year_id" BIGINT NOT NULL,
  "effective_start_year" INTEGER NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "reason" VARCHAR(2000),
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "curriculum_revisions_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "course_year_rules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT "curriculum_revisions_effective_academic_year_id_fkey" FOREIGN KEY ("effective_academic_year_id") REFERENCES "academic_years"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE UNIQUE INDEX "curriculum_revisions_rule_id_revision_no_key" ON "curriculum_revisions"("rule_id", "revision_no");
CREATE UNIQUE INDEX "curriculum_revisions_rule_id_effective_start_year_key" ON "curriculum_revisions"("rule_id", "effective_start_year");
ALTER TABLE "course_offering_group_scopes" ADD COLUMN "curriculum_revision_id" BIGINT;
CREATE INDEX "course_offering_group_scopes_curriculum_revision_id_idx" ON "course_offering_group_scopes"("curriculum_revision_id");
ALTER TABLE "course_offering_group_scopes" ADD CONSTRAINT "course_offering_group_scopes_curriculum_revision_id_fkey" FOREIGN KEY ("curriculum_revision_id") REFERENCES "curriculum_revisions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Historical snapshots and their tuple identity cannot be rewritten, including
-- through SQL outside the API. Unreferenced test/operator cleanup remains possible.
CREATE FUNCTION protect_curriculum_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Curriculum revisions are immutable' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER curriculum_revision_immutable BEFORE UPDATE ON "curriculum_revisions"
FOR EACH ROW EXECUTE FUNCTION protect_curriculum_revision();

CREATE FUNCTION protect_revisioned_curriculum_rule() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.course_id, NEW.major_id, NEW.year_level) IS DISTINCT FROM (OLD.course_id, OLD.major_id, OLD.year_level)
     AND EXISTS (SELECT 1 FROM "curriculum_revisions" WHERE rule_id = OLD.id) THEN
    RAISE EXCEPTION 'Revisioned curriculum tuple is immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER curriculum_rule_identity_immutable BEFORE UPDATE ON "course_year_rules"
FOR EACH ROW EXECUTE FUNCTION protect_revisioned_curriculum_rule();

CREATE FUNCTION protect_curriculum_year() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.start_year IS DISTINCT FROM OLD.start_year AND (
    EXISTS (SELECT 1 FROM "curriculum_revisions" WHERE effective_academic_year_id = OLD.id)
    OR EXISTS (SELECT 1 FROM "course_offering_group_scopes" WHERE academic_year_id = OLD.id AND curriculum_revision_id IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Curriculum academic year start_year is protected' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER curriculum_academic_year_immutable BEFORE UPDATE ON "academic_years"
FOR EACH ROW EXECUTE FUNCTION protect_curriculum_year();
