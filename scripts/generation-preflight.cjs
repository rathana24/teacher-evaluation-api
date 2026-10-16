const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const {
  validateTestConfig,
  collectGenerations,
  databaseFingerprint,
} = require('./lib/generation-preflight.cjs');

async function main() {
  if (process.argv.length !== 2)
    throw new Error(
      'Usage: node scripts/generation-preflight.cjs (isolated read-only audit only).',
    );
  const config = parseEnv(
    fs.readFileSync(path.resolve(__dirname, '../.env.test.local'), 'utf8'),
  );
  const db = new PrismaClient({
    datasources: { db: { url: validateTestConfig(config) } },
    log: [],
  });
  try {
    const before = await databaseFingerprint(db);
    const review = await collectGenerations(db);
    const after = await databaseFingerprint(db);
    if (before.sha256 !== after.sha256)
      throw new Error(
        'State changed during audit; isolate concurrent testers and repeat review.',
      );
    process.stdout.write(
      `${JSON.stringify({ ...review, preservation: { unchanged: true, application_tables: before.tables.length - 1, migration_rows: before.tables.find((row) => row.table === '_prisma_migrations').count, sequences: before.sequences.length, before_sha256: before.sha256, after_sha256: after.sha256 } }, null, 2)}\n`,
    );
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module)
  main().catch(() => {
    // Never echo Prisma errors or private configuration. A failed audit approves nothing.
    process.stderr.write(
      'Cohort preflight failed. Check isolated-test configuration, schema access and concurrent activity. No mappings were applied.\n',
    );
    process.exitCode = 1;
  });

module.exports = { main };
