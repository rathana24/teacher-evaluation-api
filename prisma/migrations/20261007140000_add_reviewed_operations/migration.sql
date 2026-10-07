-- Additive administrative review storage. No existing records are changed.
CREATE TABLE "reviewed_operations" (
    "id" UUID NOT NULL,
    "operation_kind" VARCHAR(40) NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "resource_key" VARCHAR(100) NOT NULL,
    "request_json" JSONB NOT NULL,
    "request_fingerprint" CHAR(64) NOT NULL,
    "snapshot_fingerprint" CHAR(64) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "completed_at" TIMESTAMP(6),
    "result_json" JSONB,
    CONSTRAINT "reviewed_operations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "reviewed_operations_kind_check" CHECK (
        "operation_kind" IN ('ENROLL_GROUP', 'CREATE_EVALUATION', 'REASSIGN_ENROLLMENT',
                            'BULK_GROUP_PLACEMENT', 'OPEN_ASSIGNED_VERSION', 'APPLY_LATEST_VERSION')
    ),
    CONSTRAINT "reviewed_operations_completion_check" CHECK (
        ("completed_at" IS NULL AND "result_json" IS NULL) OR
        ("completed_at" IS NOT NULL AND "result_json" IS NOT NULL)
    )
);
CREATE INDEX "reviewed_operations_actor_id_operation_kind_created_at_idx"
    ON "reviewed_operations"("actor_id", "operation_kind", "created_at");
ALTER TABLE "reviewed_operations" ADD CONSTRAINT "reviewed_operations_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
