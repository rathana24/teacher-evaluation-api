import { createRequire } from 'node:module';
const localRequire = createRequire(`${process.cwd()}/package.json`);
export const { selectedTestDatabase } = localRequire(
  './test/database-safety.cjs',
) as { selectedTestDatabase: () => string };
