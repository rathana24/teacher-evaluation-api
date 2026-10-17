import { PrismaService } from '../prisma/prisma.service';

/** Advertise only complete deployed contracts; no result threshold is implied. */
export const backendCapabilities = Object.freeze({
  atomic_academic_year_setup_v1: true,
  academic_year_group_rollover_v1: true,
  academic_year_assignment_rollover_v1: true,
  integrated_academic_year_rollover_v1: true,
  atomic_assignments_v1: true,
  evaluation_group_scopes_v1: true,
  evaluation_major_filter_v1: true,
  atomic_evaluation_publication_v1: true,
  evaluation_activity_v1: true,
  bulk_evaluations_v1: true,
});

export async function deployedBackendCapabilities(
  db: Pick<PrismaService, '$queryRaw'>,
) {
  const [schema] = await db.$queryRaw<Array<{ ready: boolean }>>`
 SELECT to_regclass(quote_ident(current_schema())||'.operation_receipts') IS NOT NULL
 AND to_regclass(quote_ident(current_schema())||'.evaluation_activity') IS NOT NULL
 AND to_regclass(quote_ident(current_schema())||'.setup_audit') IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('evaluation_participants','placement_snapshot'),('responses','audience_major_id'),('responses','audience_major_label'),('course_offerings','source_offering_id'),('student_generations','major_id'),('student_generations','generation_number'),('student_generations','ownership_state'),('student_academic_records','generation_id')) required(table_name,column_name)
 WHERE NOT EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_schema=current_schema() AND c.table_name=required.table_name AND c.column_name=required.column_name))
 AND EXISTS(SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname='evaluations' AND t.tgname='evaluation_assignment_identity' AND t.tgenabled IN ('O','A'))
 AND EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=current_schema() AND t.relname='reviewed_operations' AND c.conname='reviewed_operations_kind_check' AND c.convalidated AND position('BULK_EVALUATIONS' in pg_get_constraintdef(c.oid))>0)
 AS ready`;
  return schema?.ready === true ? backendCapabilities : {};
}
