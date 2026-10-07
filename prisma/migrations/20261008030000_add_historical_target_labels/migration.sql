-- Additive: existing rows remain unknown. Today's names are not historical proof.
ALTER TABLE "evaluation_generation_targets" ADD COLUMN "historical_labels" JSONB, ADD COLUMN "labels_captured_at" TIMESTAMP(6);
ALTER TABLE "evaluation_group_targets" ADD COLUMN "historical_labels" JSONB, ADD COLUMN "labels_captured_at" TIMESTAMP(6);
ALTER TABLE "evaluation_generation_targets" ADD CONSTRAINT "generation_target_labels_pair_check" CHECK (
  (historical_labels IS NULL AND labels_captured_at IS NULL)
  OR (historical_labels IS NOT NULL AND labels_captured_at IS NOT NULL AND jsonb_typeof(historical_labels) = 'object' AND COALESCE(historical_labels->>'schema_version' = '1', FALSE))
);
ALTER TABLE "evaluation_group_targets" ADD CONSTRAINT "group_target_labels_pair_check" CHECK (
  (historical_labels IS NULL AND labels_captured_at IS NULL)
  OR (historical_labels IS NOT NULL AND labels_captured_at IS NOT NULL AND jsonb_typeof(historical_labels) = 'object' AND COALESCE(historical_labels->>'schema_version' = '1', FALSE))
);
CREATE FUNCTION protect_historical_target_labels() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN
    RAISE EXCEPTION 'Historical target labels cannot be rewritten or inferred for legacy rows' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER generation_target_labels_immutable BEFORE UPDATE ON "evaluation_generation_targets"
FOR EACH ROW EXECUTE FUNCTION protect_historical_target_labels();
CREATE TRIGGER group_target_labels_immutable BEFORE UPDATE ON "evaluation_group_targets"
FOR EACH ROW EXECUTE FUNCTION protect_historical_target_labels();
