const { PrismaClient } = require('@prisma/client');

/** Operator-only snapshot. PostgreSQL rejects writes for this entire transaction. */
async function alignmentPreflight(db) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [context] =
        await tx.$queryRaw`SELECT current_database() AS database,current_schema() AS schema,current_setting('transaction_read_only') AS read_only`;
      if (context.read_only !== 'on')
        throw Error('Read-only snapshot required');
      const duplicate_assignments =
        await tx.$queryRaw`SELECT course_id::text,lecturer_id::text,semester_id::text,year_level,class_type,array_agg(id::text ORDER BY id) AS offering_ids FROM course_offerings GROUP BY course_id,lecturer_id,semester_id,year_level,class_type HAVING count(*)>1 ORDER BY 1,2,3`;
      const duplicate_evaluations =
        await tx.$queryRaw`SELECT course_offering_id::text,array_agg(id::text ORDER BY id) AS evaluation_ids FROM evaluations GROUP BY course_offering_id HAVING count(*)>1 ORDER BY 1`;
      const course_code_collisions =
        await tx.$queryRaw`SELECT lower(course_code) AS normalized_code,array_agg(id::text ORDER BY id) AS course_ids FROM courses GROUP BY lower(course_code) HAVING count(*)>1 ORDER BY 1`;
      const legacy_cohorts = await tx.student_generations.findMany({
        where: { ownership_state: 'LEGACY_READ_ONLY' },
        select: {
          id: true,
          name: true,
          entry_academic_year_id: true,
          starting_year_level: true,
          _count: {
            select: {
              students: true,
              course_offering_group_scopes: true,
              evaluation_targets: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      });
      return {
        context,
        duplicate_assignments,
        duplicate_evaluations,
        course_code_collisions,
        legacy_cohorts,
        policy:
          'Retain legacy references and results. Review ownership through the existing inventory/preview/confirm mapping workflow; never automatically merge or delete duplicate history.',
      };
    },
    { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 30000 },
  );
}
module.exports = { alignmentPreflight };
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    process.stderr.write(
      'Set DATABASE_URL explicitly for the intended operator read-only preflight.\n',
    );
    process.exitCode = 1;
  } else {
    const db = new PrismaClient({ log: [] });
    alignmentPreflight(db)
      .then((result) =>
        process.stdout.write(
          JSON.stringify(
            result,
            (_, v) => (typeof v === 'bigint' ? String(v) : v),
            2,
          ) + '\n',
        ),
      )
      .catch(() => {
        process.stderr.write(
          'Alignment preflight failed; no mapping or migration was performed.\n',
        );
        process.exitCode = 1;
      })
      .finally(() => db.$disconnect());
  }
}
