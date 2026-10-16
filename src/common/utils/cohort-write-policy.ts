import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Db = Pick<Prisma.TransactionClient, '$queryRaw'>;

/** Operator cutover, independent of the test-only legacy mapping opt-in. */
export function majorScopedCohortsRequired(): boolean {
  return process.env.REQUIRE_MAJOR_SCOPED_COHORTS === 'true';
}

export function rejectUnscopedCohortWrite(): void {
  if (majorScopedCohortsRequired())
    throw new BadRequestException({
      code: 'MAJOR_SCOPED_COHORT_REQUIRED',
      message:
        'Choose an explicit major-owned cohort. Imports require major_id and generation_number; unresolved history requires reviewed mapping before a new yearly placement.',
    });
}

/** Check the connected namespace, never row counts or another database. */
export async function cohortWriteSchemaReady(db: Db): Promise<boolean> {
  const [catalog] = await db.$queryRaw<Array<{ ready: boolean }>>`
    SELECT
      to_regclass(quote_ident(current_schema()) || '._prisma_migrations') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM (VALUES
          ('student_generations','ownership_state','character varying'),
          ('student_generations','major_id','bigint'),
          ('student_generations','generation_number','integer'),
          ('student_academic_records','generation_id','bigint'),
          ('student_cohort_assignment_events','generation_id','bigint'),
          ('cohort_mapping_receipts','receipt_json','jsonb')
        ) expected(table_name,column_name,data_type)
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c
          WHERE c.table_schema=current_schema() AND c.table_name=expected.table_name
            AND c.column_name=expected.column_name AND c.data_type=expected.data_type)
      )
      AND NOT EXISTS (
        SELECT 1 FROM (VALUES
          ('student_generations','cohort_ownership_state_check'),
          ('student_generations','cohort_major_number_unique'),
          ('student_generations','cohort_id_major_unique'),
          ('student_academic_records','academic_record_cohort_major_fk'),
          ('student_cohort_assignment_events','assignment_cohort_major_fk'),
          ('student_cohort_assignment_events','assignment_action_context_check')
        ) expected(table_name,constraint_name)
        WHERE NOT EXISTS (SELECT 1 FROM pg_constraint c
          JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
          WHERE n.nspname=current_schema() AND t.relname=expected.table_name
            AND c.conname=expected.constraint_name AND c.convalidated)
      )
      AND EXISTS (SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
        WHERE n.nspname=current_schema() AND t.relname='reviewed_operations'
          AND c.conname='reviewed_operations_kind_check' AND c.convalidated
          AND position('COHORT_MAPPING' in pg_get_constraintdef(c.oid))>0)
      AND NOT EXISTS (
        SELECT 1 FROM (VALUES
          ('student_generations','cohort_identity_guard'),
          ('student_academic_records','yearly_cohort_guard'),
          ('student_academic_records','yearly_cohort_evidence'),
          ('student_cohort_assignment_events','cohort_assignment_immutable'),
          ('student_cohort_assignment_events','assignment_evidence_guard'),
          ('course_offering_group_scopes','offering_scope_cohort_guard'),
          ('cohort_mapping_operations','cohort_mapping_immutable'),
          ('cohort_mapping_receipts','cohort_receipt_immutable')
        ) expected(table_name,trigger_name)
        WHERE NOT EXISTS (SELECT 1 FROM pg_trigger g
          JOIN pg_class t ON t.oid=g.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace
          WHERE n.nspname=current_schema() AND t.relname=expected.table_name
            AND g.tgname=expected.trigger_name AND g.tgenabled IN ('O','A'))
      ) AS ready
  `;
  if (!catalog?.ready) return false;
  const [ledger] = await db.$queryRaw<Array<{ ready: boolean }>>`
    SELECT NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('20261016010000_expand_major_scoped_cohorts','27f37fc8824921e690937816c26c5536e16a2369d990ae4f483a9d76d63417d6'),
        ('20261016020000_add_reviewed_cohort_mapping_kind','b8f53d0e77169655501b0e0f4475f4caab353a9f545483119980869b2c07fb1b')
      ) expected(name,checksum)
      WHERE NOT EXISTS (SELECT 1 FROM _prisma_migrations m
        WHERE m.migration_name=expected.name AND m.checksum=expected.checksum
          AND m.finished_at IS NOT NULL AND m.rolled_back_at IS NULL)
    ) AS ready
  `;
  return ledger?.ready === true;
}

export async function requireCohortWriteSchema(db: Db): Promise<void> {
  if (majorScopedCohortsRequired() && !(await cohortWriteSchemaReady(db)))
    throw new ServiceUnavailableException({
      code: 'COHORT_SCHEMA_NOT_READY',
      message:
        'Major-owned cohort writes are unavailable in this database schema. Ask the backend operator to verify the approved migration deployment; do not retry with a legacy label.',
    });
}

export async function cohortWriteCapabilities(
  db: Db,
): Promise<{ major_scoped_generations?: true }> {
  return majorScopedCohortsRequired() && (await cohortWriteSchemaReady(db))
    ? { major_scoped_generations: true }
    : {};
}
