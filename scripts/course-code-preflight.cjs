const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const {
  validateTestConfig,
  inReadOnlySnapshot,
  databaseFingerprint,
} = require('./lib/generation-preflight.cjs');

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
    const report = await inReadOnlySnapshot(db, async (tx) => {
      const collisions = await tx.$queryRaw`
        SELECT lower(course_code) AS case_folded_code, array_agg(id::text ORDER BY id) AS course_ids,
          array_agg(course_code ORDER BY id) AS original_codes
        FROM courses GROUP BY lower(course_code) HAVING count(*)>1 ORDER BY 1
      `;
      return {
        database: 'teacher_evaluation_test',
        schema: 'public',
        read_only: true,
        case_insensitive_collisions: collisions,
        collision_groups: collisions.length,
        policy:
          'Preserve original official codes, case-sensitive identity and global exact unique index. No normalization/renaming/CI-index migration. Automatic allocation skips occupied numeric suffixes regardless of case. Review case variants before any future case normalization.',
      };
    });
    const after = await databaseFingerprint(db);
    if (before.sha256 !== after.sha256)
      throw new Error('State changed during audit');
    process.stdout.write(
      `${JSON.stringify({ ...report, preservation: { unchanged: true, before_sha256: before.sha256, after_sha256: after.sha256 } }, null, 2)}\n`,
    );
  } finally {
    await db.$disconnect();
  }
}
if (require.main === module)
  main().catch(() => {
    process.stderr.write(
      'Course-code preflight failed. Verify isolated-test configuration/schema access and exclude concurrent activity. No codes were changed.\n',
    );
    process.exitCode = 1;
  });
module.exports = { main };
