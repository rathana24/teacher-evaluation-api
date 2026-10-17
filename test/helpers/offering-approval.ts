import { selectedTestDatabase } from '../utils/test-database';
import { Prisma } from '@prisma/client';

async function isolated(db: Prisma.TransactionClient) {
  const [context] = await db.$queryRaw<
    Array<{ database: string }>
  >`SELECT current_database() AS database`;
  if (
    process.env.NODE_ENV !== 'test' ||
    context.database !== selectedTestDatabase()
  )
    throw new Error(
      'Synthetic curriculum fixture requires the isolated test database',
    );
}

/** A named prerequisite for a newly created synthetic test course, never a school backfill. */
export async function createTestOfferingApproval(
  db: Prisma.TransactionClient,
  courseId: bigint,
  majorId: bigint,
  yearId: bigint,
  yearLevel: number,
) {
  await isolated(db);
  const year = await db.academic_years.findUniqueOrThrow({
    where: { id: yearId },
  });
  if (year.start_year === null)
    throw new Error('Synthetic approval needs a structured year');
  return db.course_year_rules.create({
    data: {
      course_id: courseId,
      major_id: majorId,
      year_level: yearLevel,
      revisions: {
        create: {
          revision_no: 1,
          effective_academic_year_id: yearId,
          effective_start_year: year.start_year,
          enabled: true,
          reason: 'Synthetic H test prerequisite',
        },
      },
    },
  });
}

/** Remove only the caller's captured synthetic rule, after its offering scopes are removed. */
export async function removeTestOfferingApproval(
  db: Prisma.TransactionClient,
  ruleId: bigint,
) {
  await isolated(db);
  await db.curriculum_revisions.deleteMany({ where: { rule_id: ruleId } });
  await db.course_year_rules.delete({ where: { id: ruleId } });
}
