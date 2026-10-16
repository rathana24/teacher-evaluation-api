-- CANDIDATE ONLY: follows major-scoped-generations-expand.sql in owned fixtures.
DO $receipts$
BEGIN
  IF current_database() <> 'teacher_evaluation_test'
    OR current_schema() !~ '^cohort_test_[a-f0-9]{32}$' THEN
    RAISE EXCEPTION 'Mapping receipts require an owned isolated cohort fixture schema' USING ERRCODE = '23514';
  END IF;
  CREATE TABLE cohort_mapping_receipts (
    operation_id UUID PRIMARY KEY REFERENCES cohort_mapping_operations(id) ON DELETE NO ACTION,
    actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    request_fingerprint VARCHAR(64) NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
    receipt_json JSONB NOT NULL CHECK (jsonb_typeof(receipt_json) = 'object'),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TRIGGER cohort_receipt_immutable BEFORE UPDATE OR DELETE ON cohort_mapping_receipts
    FOR EACH ROW EXECUTE FUNCTION protect_cohort_audit();
END $receipts$;
