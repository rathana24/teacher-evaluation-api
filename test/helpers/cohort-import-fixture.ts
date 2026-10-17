import { selectedTestDatabase } from '../utils/test-database';
import { Prisma, PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const localRequire = createRequire(`${process.cwd()}/package.json`);
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
const names = Prisma.dmmf.datamodel.models
  .map((model) => model.dbName || model.name)
  .sort();

/** Owns a migrated test namespace because immutable INITIAL events cannot be deleted. */
export class CohortImportFixture {
  readonly schema = `cohort_import_test_${randomUUID().replaceAll('-', '')}`;
  readonly root = new PrismaClient();
  db!: PrismaClient;
  private owned = false;
  private folder?: string;
  private original: unknown;
  async snapshot(db: PrismaClient) {
    const rows = [];
    for (const name of [...names, '_prisma_migrations']) {
      const hashes = await db.$queryRaw(
        Prisma.sql`SELECT md5(to_jsonb(t)::text) AS hash FROM ${Prisma.raw(quote(name))} t ORDER BY 1`,
      );
      rows.push({ name, hashes });
    }
    return rows;
  }
  private async publicState() {
    const rows = await this.snapshot(this.root);
    const sequences = [];
    for (const { sequencename } of await this.root.$queryRaw<
      Array<{ sequencename: string }>
    >`SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`) {
      sequences.push({
        name: sequencename,
        state: await this.root.$queryRaw(
          Prisma.sql`SELECT last_value::text,is_called FROM ${Prisma.raw(`public.${quote(sequencename)}`)}`,
        ),
      });
    }
    return { rows, sequences };
  }
  async unchangedPublic() {
    expect(await this.publicState()).toEqual(this.original);
  }
  async open() {
    const [context] = await this.root.$queryRaw<
      Array<{ database: string; schema: string }>
    >`SELECT current_database() AS database,current_schema() AS schema`;
    expect(context).toEqual({
      database: selectedTestDatabase(),
      schema: 'public',
    });
    expect(this.schema).toMatch(/^cohort_import_test_[a-f0-9]{32}$/);
    this.original = await this.publicState();
    const collision = await this.root.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(*) FROM pg_namespace WHERE nspname=${this.schema}`;
    expect(collision[0].count).toBe(0n);
    await this.root.$executeRawUnsafe(`CREATE SCHEMA ${quote(this.schema)}`);
    this.owned = true;
    fs.mkdirSync(path.resolve('.tmp'), { recursive: true });
    this.folder = fs.mkdtempSync(path.resolve('.tmp/cohort-import-'));
    fs.copyFileSync(
      'prisma/schema.prisma',
      path.join(this.folder, 'schema.prisma'),
    );
    fs.mkdirSync(path.join(this.folder, 'migrations'));
    fs.copyFileSync(
      'prisma/migrations/migration_lock.toml',
      path.join(this.folder, 'migrations/migration_lock.toml'),
    );
    let redirected = 0;
    const migrations = fs
      .readdirSync('prisma/migrations', { withFileTypes: true })
      .filter((entry) => entry.isDirectory());
    expect(migrations).toHaveLength(28);
    for (const entry of migrations) {
      const sql = fs.readFileSync(
        `prisma/migrations/${entry.name}/migration.sql`,
        'utf8',
      );
      const references = sql.match(/\bpublic\./g) || [];
      expect(sql.match(/\bpublic\.survey_title_key/g) || []).toHaveLength(
        references.length,
      );
      redirected += references.length;
      const destination = path.join(this.folder, 'migrations', entry.name);
      fs.mkdirSync(destination);
      fs.writeFileSync(
        path.join(destination, 'migration.sql'),
        sql.replaceAll(
          'public.survey_title_key',
          `${quote(this.schema)}.survey_title_key`,
        ),
      );
    }
    expect(redirected).toBe(3);
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('schema', this.schema);
    try {
      execFileSync(
        process.execPath,
        [
          localRequire.resolve('prisma/build/index.js'),
          'migrate',
          'deploy',
          '--schema',
          path.join(this.folder, 'schema.prisma'),
        ],
        {
          env: { ...process.env, DATABASE_URL: url.toString() },
          stdio: 'pipe',
          timeout: 60000,
          windowsHide: true,
        },
      );
    } catch {
      throw new Error('Owned cohort import fixture migration failed');
    }
    this.db = new PrismaClient({
      datasources: { db: { url: url.toString() } },
    });
    const [owned] = await this.db.$queryRaw<
      Array<{ database: string; schema: string }>
    >`SELECT current_database() AS database,current_schema() AS schema`;
    expect(owned).toEqual({
      database: selectedTestDatabase(),
      schema: this.schema,
    });
  }
  async close() {
    await this.db?.$disconnect();
    try {
      if (this.owned) {
        const [context] = await this.root.$queryRaw<
          Array<{ database: string }>
        >`SELECT current_database() AS database`;
        if (
          context.database !== selectedTestDatabase() ||
          !/^cohort_import_test_[a-f0-9]{32}$/.test(this.schema)
        )
          throw new Error('Unsafe fixture cleanup');
        await this.root.$executeRawUnsafe(
          `DROP SCHEMA ${quote(this.schema)} CASCADE`,
        );
        await this.unchangedPublic();
      }
      if (this.folder) {
        const resolved = fs.realpathSync(this.folder);
        if (
          path.dirname(resolved) !== fs.realpathSync('.tmp') ||
          !path.basename(resolved).startsWith('cohort-import-')
        )
          throw new Error('Unsafe temporary cleanup');
        fs.rmSync(resolved, { recursive: true });
      }
    } finally {
      await this.root.$disconnect();
    }
  }
}
