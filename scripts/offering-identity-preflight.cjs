const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const {
  validateTestConfig,
  inReadOnlySnapshot,
  databaseFingerprint,
} = require('./lib/generation-preflight.cjs');

/** Identity deliberately excludes display labels and configured audiences. */
async function auditOfferingIdentities(db) {
  const duplicates = await db.$queryRaw`
    SELECT course_id::text, lecturer_id::text, semester_id::text,
      year_level, class_type::text,
      array_agg(id::text ORDER BY id) AS offering_ids,
      array_agg(section_code ORDER BY id) AS original_labels,
      count(*)::int AS count
    FROM course_offerings
    GROUP BY course_id, lecturer_id, semester_id, year_level, class_type
    HAVING count(*) > 1
    ORDER BY course_id, lecturer_id, semester_id, year_level NULLS FIRST, class_type NULLS FIRST
  `;
  const [legacy] = await db.$queryRaw`
    SELECT count(*)::int AS count FROM course_offerings
    WHERE year_level IS NULL OR class_type IS NULL
  `;
  return {
    duplicate_groups: duplicates.length,
    duplicates,
    legacy_incomplete_offerings: legacy.count,
    policy:
      'API identity is (course_id, lecturer_id, semester_id, year_level, class_type); section_code and groups do not distinguish identities. NULL legacy years/types compare as NULL within their own identity. Audit only: preserve every original ID, label, scope, enrollment, evaluation and answer. No inferred merge, relabel, delete or uniqueness DDL. Review school conflicts separately before a stricter database index or normal rollout.',
  };
}

async function main() {
  if (process.argv.length !== 2) throw new Error('No arguments accepted');
  const config = parseEnv(
    fs.readFileSync(path.resolve(__dirname, '../.env.test.local'), 'utf8'),
  );
  const db = new PrismaClient({
    datasources: { db: { url: validateTestConfig(config) } },
    log: [],
  });
  try {
    const before = await databaseFingerprint(db);
    const report = await inReadOnlySnapshot(db, auditOfferingIdentities);
    const after = await databaseFingerprint(db);
    if (before.sha256 !== after.sha256)
      throw new Error('State changed during audit');
    process.stdout.write(
      `${JSON.stringify({ database: 'teacher_evaluation_test', schema: 'public', read_only: true, ...report, preservation: { unchanged: true, before_sha256: before.sha256, after_sha256: after.sha256 } }, null, 2)}\n`,
    );
  } finally {
    await db.$disconnect();
  }
}
if (require.main === module)
  main().catch(() => {
    process.stderr.write(
      'Offering-identity preflight failed. Check guarded isolated-test configuration/schema and exclude concurrent activity. No assignments were changed.\n',
    );
    process.exitCode = 1;
  });
module.exports = { auditOfferingIdentities, main };
