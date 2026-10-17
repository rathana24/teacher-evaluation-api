import { selectedTestDatabase } from '../utils/test-database';
import { Prisma, PrismaClient } from '@prisma/client';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';

const localRequire = createRequire(`${process.cwd()}/package.json`);
export const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
const publicApplicationNames = Prisma.dmmf.datamodel.models
  .map((model) => model.dbName || model.name)
  .sort();
const expandedOnly = new Set([
  'evaluation_activity',
  'operation_receipts',
  'setup_audit',
  'cohort_mapping_operations',
  'student_cohort_assignment_events',
  'cohort_mapping_receipts',
]);
export const applicationNames = publicApplicationNames.filter(
  (name) => !expandedOnly.has(name),
);
const { legacyPrismaClient }: { legacyPrismaClient(): typeof PrismaClient } =
  localRequire('./test/helpers/cohort-legacy-client.cjs');

/** Owns a new schema only. Never deploys to the shared public schema. */
export class CohortExpansionFixture {
  readonly schema = `cohort_test_${randomUUID().replaceAll('-', '')}`;
  readonly root = new PrismaClient();
  db!: PrismaClient;
  private owned = false;
  private folder?: string;
  private original: unknown;

  async publicSnapshot() {
    const rows = [];
    for (const name of [...publicApplicationNames, '_prisma_migrations']) {
      const hashes = await this.root.$queryRaw(
        Prisma.sql`SELECT md5(to_jsonb(t)::text) AS hash FROM ${Prisma.raw(`public.${quote(name)}`)} t ORDER BY 1`,
      );
      rows.push({ name, hashes });
    }
    const sequences: unknown[] = [];
    const names = await this.root.$queryRaw<Array<{ sequencename: string }>>`
      SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`;
    for (const { sequencename } of names) {
      const state = await this.root.$queryRaw(
        Prisma.sql`SELECT last_value::text, is_called FROM ${Prisma.raw(`public.${quote(sequencename)}`)}`,
      );
      sequences.push({ name: sequencename, state });
    }
    return { rows, sequences };
  }

  async assertPublicUnchanged() {
    expect(await this.publicSnapshot()).toEqual(this.original);
  }

  async open() {
    const [context] = await this.root.$queryRaw<
      Array<{ database: string; schema: string }>
    >`SELECT current_database() AS database, current_schema() AS schema`;
    expect(context).toEqual({
      database: selectedTestDatabase(),
      schema: 'public',
    });
    expect(this.schema).toMatch(/^cohort_test_[a-f0-9]{32}$/);
    this.original = await this.publicSnapshot();
    const collision = await this.root.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) FROM pg_namespace WHERE nspname=${this.schema}`;
    expect(collision[0].count).toBe(0n);
    await this.root.$executeRawUnsafe(`CREATE SCHEMA ${quote(this.schema)}`);
    this.owned = true;
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('schema', this.schema);
    const targetUrl = url.toString();
    this.folder = fs.mkdtempSync(
      path.join(process.cwd(), '.tmp/cohort-expansion-'),
    );
    fs.copyFileSync(
      'test/fixtures/cohort-baseline.prisma',
      path.join(this.folder, 'schema.prisma'),
    );
    fs.mkdirSync(path.join(this.folder, 'migrations'));
    fs.copyFileSync(
      'prisma/migrations/migration_lock.toml',
      path.join(this.folder, 'migrations/migration_lock.toml'),
    );
    const migrations = fs
      .readdirSync('prisma/migrations', { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          entry.name <= '20261014020000_enforce_academic_integrity',
      );
    expect(migrations.length).toBe(18);
    let redirected = 0;
    for (const migration of migrations) {
      const source = fs.readFileSync(
        `prisma/migrations/${migration.name}/migration.sql`,
        'utf8',
      );
      const references = source.match(/\bpublic\./g) || [];
      expect(source.match(/\bpublic\.survey_title_key/g)?.length || 0).toBe(
        references.length,
      );
      redirected += references.length;
      const destination = path.join(this.folder, 'migrations', migration.name);
      fs.mkdirSync(destination);
      fs.writeFileSync(
        path.join(destination, 'migration.sql'),
        source.replaceAll(
          'public.survey_title_key',
          `${quote(this.schema)}.survey_title_key`,
        ),
      );
    }
    expect(redirected).toBe(3);
    const result = await new Promise<number>((resolve) => {
      execFile(
        process.execPath,
        [
          localRequire.resolve('prisma/build/index.js'),
          'migrate',
          'deploy',
          '--schema',
          path.join(this.folder!, 'schema.prisma'),
        ],
        {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: targetUrl },
          timeout: 60000,
        },
        (error) => resolve(error ? 1 : 0),
      );
    });
    expect(result).toBe(0);
    const HistoricalPrismaClient = legacyPrismaClient();
    this.db = new HistoricalPrismaClient({
      datasources: { db: { url: targetUrl } },
    });
    const [owned] = await this.db.$queryRaw<
      Array<{ database: string; schema: string }>
    >`
      SELECT current_database() AS database, current_schema() AS schema`;
    expect(owned).toEqual({
      database: selectedTestDatabase(),
      schema: this.schema,
    });
    await this.assertPublicUnchanged();
  }

  async close() {
    try {
      await this.db?.$disconnect();
      if (this.owned) {
        const [context] = await this.root.$queryRaw<
          Array<{ name: string }>
        >`SELECT current_database() AS name`;
        expect(context.name).toBe(selectedTestDatabase());
        expect(this.schema).toMatch(/^cohort_test_[a-f0-9]{32}$/);
        await this.root.$executeRawUnsafe(
          `DROP SCHEMA ${quote(this.schema)} CASCADE`,
        );
        const remaining = await this.root.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT count(*) FROM pg_namespace WHERE nspname=${this.schema}`;
        expect(remaining[0].count).toBe(0n);
        await this.assertPublicUnchanged();
      }
      if (this.folder) {
        const resolved = fs.realpathSync(this.folder);
        expect(path.dirname(resolved)).toBe(
          fs.realpathSync(path.join(process.cwd(), '.tmp')),
        );
        expect(path.basename(resolved)).toMatch(/^cohort-expansion-/);
        fs.rmSync(resolved, { recursive: true });
      }
    } finally {
      await this.root.$disconnect();
    }
  }
}
