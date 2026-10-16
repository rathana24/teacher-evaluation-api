const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

// The expansion suites deliberately exercise the genuine 18-migration client
// against pre-expansion tables. Never make current model selects read old tables.
function legacyPrismaClient() {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(
    path.join(root, 'test/fixtures/cohort-baseline.prisma'),
    'utf8',
  );
  const version = require('@prisma/client/package.json').version;
  const hash = createHash('sha256')
    .update(`${version}\n${source}`)
    .digest('hex');
  const folder = path.join(root, '.tmp/cohort-legacy-schema');
  const output = path.join(root, '.tmp/cohort-legacy-client');
  const marker = path.join(output, 'baseline.sha256');
  if (!fs.existsSync(marker) || fs.readFileSync(marker, 'utf8') !== hash) {
    fs.mkdirSync(folder, { recursive: true });
    const schema = source.replace(
      'provider = "prisma-client-js"',
      'provider = "prisma-client-js"\n  output = "../cohort-legacy-client"',
    );
    const file = path.join(folder, 'schema.prisma');
    fs.writeFileSync(file, schema);
    try {
      execFileSync(
        process.execPath,
        [
          require.resolve('prisma/build/index.js'),
          'generate',
          '--schema',
          file,
        ],
        { cwd: root, env: process.env, stdio: 'pipe', timeout: 60000 },
      );
    } catch {
      throw new Error('Historical cohort fixture client generation failed.');
    }
    fs.writeFileSync(marker, hash);
  }
  return require(output).PrismaClient;
}
module.exports = { legacyPrismaClient };
