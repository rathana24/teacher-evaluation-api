import { Prisma } from '@prisma/client';
import { selectedTestDatabase } from './test-database';

/** Seed pre-policy history on the guarded synthetic target; restore the guard before committing. */
export async function legacyEvaluationFixture(
  tx: Prisma.TransactionClient,
  seed: () => Promise<void>,
) {
  const [scope] = await tx.$queryRaw<
    Array<{ database: string; schema: string }>
  >`SELECT current_database() AS database,current_schema() AS schema`;
  if (
    process.env.NODE_ENV !== 'test' ||
    scope.database !== selectedTestDatabase() ||
    !(
      scope.schema === 'public' ||
      /^cohort_import_test_[a-f0-9]{32}$/.test(scope.schema)
    )
  )
    throw Error('Guarded historical test fixture required');
  const [trigger] = await tx.$queryRaw<
    Array<{ definition: string }>
  >`SELECT pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relname='evaluations' AND t.tgname='evaluation_assignment_identity'`;
  if (!trigger) throw Error('Expected evaluation identity guard');
  await tx.$executeRawUnsafe(
    'DROP TRIGGER evaluation_assignment_identity ON evaluations',
  );
  await seed();
  await tx.$executeRawUnsafe(trigger.definition);
}
