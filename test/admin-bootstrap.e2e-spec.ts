import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const localRequire = createRequire(`${process.cwd()}/package.json`);
type Credentials = { full_name: string; email: string; password: string };
type Receipt = { id: string; role: string; status: string };
const {
  provisionFirstAdmin,
}: {
  provisionFirstAdmin(db: PrismaClient, input: unknown): Promise<Receipt>;
} = localRequire('./scripts/lib/first-admin.cjs');
const {
  promptCredentials,
}: {
  promptCredentials(input: unknown, output: unknown): Promise<Credentials>;
} = localRequire('./scripts/bootstrap-admin.cjs');

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Secure first-admin provisioning (isolated schema e2e)', () => {
  const repository = process.cwd();
  const schema = `bootstrap_test_${randomUUID().replaceAll('-', '')}`;
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const names = Prisma.dmmf.datamodel.models
    .map((model) => model.dbName || model.name)
    .sort();
  const root = new PrismaClient();
  let db: PrismaClient;
  let app: INestApplication;
  let ownedSchema = false;
  let temporaryFolder: string | undefined;
  let targetUrl: string;
  let publicBefore: unknown;
  let amsBefore: unknown;
  const credentials = (extra: Record<string, unknown> = {}) => ({
    full_name: 'Synthetic First Administrator',
    email: 'first-admin@example.test',
    password: 'SyntheticBootstrap123!',
    ...extra,
  });
  const table = (name: string) => Prisma.raw(`${quote(schema)}.${quote(name)}`);
  const api = () => request(app.getHttpServer());

  async function publicSnapshot() {
    const tables = [];
    for (const name of [...names, '_prisma_migrations']) {
      const rows = await root.$queryRaw(
        Prisma.sql`SELECT count(*)::text AS rows, md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM ${Prisma.raw(`public.${quote(name)}`)} AS t`,
      );
      tables.push({ name, rows });
    }
    const sequences =
      await root.$queryRaw`SELECT sequencename, last_value::text FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename`;
    return { tables, sequences };
  }
  async function snapshot() {
    const result = [];
    for (const name of names) {
      const rows = await db.$queryRaw(
        Prisma.sql`SELECT count(*)::text AS rows, md5(COALESCE(string_agg(to_jsonb(t)::text, E'\n' ORDER BY to_jsonb(t)::text), '')) AS fingerprint FROM ${table(name)} AS t`,
      );
      result.push({ name, rows });
    }
    return result;
  }
  function child(
    args: string[],
    input = '',
    environment: NodeJS.ProcessEnv = {},
  ) {
    return new Promise<{ code: number; stdout: string; stderr: string }>(
      (resolve) => {
        const process = execFile(
          global.process.execPath,
          args,
          {
            cwd: repository,
            env: {
              ...global.process.env,
              DATABASE_URL: targetUrl,
              ...environment,
            },
            timeout: 60000,
            maxBuffer: 1024 * 1024,
          },
          (error, stdout, stderr) => {
            resolve({
              code: error
                ? typeof error.code === 'number'
                  ? error.code
                  : 1
                : 0,
              stdout,
              stderr,
            });
          },
        );
        process.stdin!.end(input);
      },
    );
  }
  const cli = (
    input: unknown,
    args = ['--stdin'],
    environment: NodeJS.ProcessEnv = {},
  ) =>
    child(
      ['scripts/bootstrap-admin.cjs', ...args],
      typeof input === 'string' ? input : JSON.stringify(input),
      environment,
    );
  function noSecret(
    result: { stdout: string; stderr: string },
    secret = credentials().password,
  ) {
    expect(result.stdout + result.stderr).not.toContain(secret);
    expect(result.stdout + result.stderr).not.toMatch(/\$2[aby]\$/);
  }

  beforeAll(async () => {
    const [context] = await root.$queryRaw<
      Array<{ name: string; schema: string }>
    >`SELECT current_database() AS name, current_schema() AS schema`;
    expect(context).toEqual({
      name: selectedTestDatabase(),
      schema: 'public',
    });
    expect(schema).toMatch(/^bootstrap_test_[a-f0-9]{32}$/);
    publicBefore = await publicSnapshot();
    const collision = await root.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(*) FROM pg_namespace WHERE nspname = ${schema}`;
    expect(collision[0].count).toBe(0n);
    await root.$executeRaw(
      Prisma.sql`CREATE SCHEMA ${Prisma.raw(quote(schema))}`,
    );
    ownedSchema = true;
    const url = new URL(process.env.DATABASE_URL!);
    url.searchParams.set('schema', schema);
    targetUrl = url.toString();
    temporaryFolder = fs.mkdtempSync(
      path.join(repository, '.tmp', 'admin-bootstrap-'),
    );
    fs.copyFileSync(
      path.join(repository, 'prisma/schema.prisma'),
      path.join(temporaryFolder, 'schema.prisma'),
    );
    fs.mkdirSync(path.join(temporaryFolder, 'migrations'));
    fs.copyFileSync(
      path.join(repository, 'prisma/migrations/migration_lock.toml'),
      path.join(temporaryFolder, 'migrations/migration_lock.toml'),
    );
    let namespaceReferences = 0;
    for (const entry of fs
      .readdirSync(path.join(repository, 'prisma/migrations'), {
        withFileTypes: true,
      })
      .filter((item) => item.isDirectory())) {
      const original = fs.readFileSync(
        path.join(repository, 'prisma/migrations', entry.name, 'migration.sql'),
        'utf8',
      );
      // One historical migration hard-codes public.survey_title_key. Redirect
      // only these three reviewed references into the owned fixture schema.
      const references = original.match(/\bpublic\./g) || [];
      expect(original.match(/\bpublic\.survey_title_key/g)?.length || 0).toBe(
        references.length,
      );
      namespaceReferences += references.length;
      const folder = path.join(temporaryFolder, 'migrations', entry.name);
      fs.mkdirSync(folder);
      fs.writeFileSync(
        path.join(folder, 'migration.sql'),
        original.replaceAll(
          'public.survey_title_key',
          `${quote(schema)}.survey_title_key`,
        ),
      );
    }
    expect(namespaceReferences).toBe(3);
    const migration = await child([
      localRequire.resolve('prisma/build/index.js'),
      'migrate',
      'deploy',
      '--schema',
      path.join(temporaryFolder, 'schema.prisma'),
    ]);
    expect({ code: migration.code }).toEqual({ code: 0 });
    db = new PrismaClient({ datasources: { db: { url: targetUrl } } });
    const [ownedContext] = await db.$queryRaw<
      Array<{ name: string; schema: string }>
    >`SELECT current_database() AS name, current_schema() AS schema`;
    expect(ownedContext).toEqual({ name: selectedTestDatabase(), schema });
    const migrations = await db.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT count(*) FROM ${table('_prisma_migrations')} WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
    );
    expect(migrations[0].count).toBe(28n);
    amsBefore = await db.departments.findMany();
    expect(amsBefore).toEqual([
      expect.objectContaining({
        code: 'AMS',
        name: 'Applied Mathematics and Statistics',
        status: 'ACTIVE',
      }),
    ]);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    expect(await publicSnapshot()).toEqual(publicBefore);
  }, 90000);
  afterEach(async () => {
    if (!db) return;
    await db.majors.deleteMany();
    await db.semesters.deleteMany();
    await db.academic_years.deleteMany();
    await db.users.deleteMany();
    await db.departments.deleteMany({ where: { code: { not: 'AMS' } } });
    expect(await db.departments.findMany()).toEqual(amsBefore);
    expect(await publicSnapshot()).toEqual(publicBefore);
  });
  afterAll(async () => {
    try {
      await app?.close();
      await db?.$disconnect();
      if (ownedSchema) {
        const [context] = await root.$queryRaw<
          Array<{ name: string }>
        >`SELECT current_database() AS name`;
        expect(context.name).toBe(selectedTestDatabase());
        expect(schema).toMatch(/^bootstrap_test_[a-f0-9]{32}$/);
        await root.$executeRaw(
          Prisma.sql`DROP SCHEMA ${Prisma.raw(quote(schema))} CASCADE`,
        );
        const remaining = await root.$queryRaw<
          Array<{ count: bigint }>
        >`SELECT count(*) FROM pg_namespace WHERE nspname = ${schema}`;
        expect(remaining[0].count).toBe(0n);
        expect(await publicSnapshot()).toEqual(publicBefore);
      }
      if (temporaryFolder) {
        const resolved = fs.realpathSync(temporaryFolder);
        const intendedParent = fs.realpathSync(path.join(repository, '.tmp'));
        expect(path.dirname(resolved)).toBe(intendedParent);
        expect(path.basename(resolved)).toMatch(/^admin-bootstrap-/);
        fs.rmSync(resolved, { recursive: true });
      }
    } finally {
      await root.$disconnect();
    }
  }, 30000);

  it('creates exactly one active ADMIN, hashes credentials and preserves the migration baseline', async () => {
    const before = await snapshot();
    const receipt = await provisionFirstAdmin(
      db,
      credentials({
        full_name: '  Synthetic First Administrator  ',
        email: ' First-Admin@EXAMPLE.TEST ',
      }),
    );
    expect(receipt).toEqual({
      id: expect.stringMatching(/^[1-9]\d*$/),
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    const user = await db.users.findUniqueOrThrow({
      where: { id: BigInt(receipt.id) },
    });
    expect(user).toMatchObject({
      full_name: 'Synthetic First Administrator',
      email: 'first-admin@example.test',
      role: 'ADMIN',
      status: 'ACTIVE',
      auth_version: 0,
    });
    expect(user.password_hash).not.toBe(credentials().password);
    expect(
      await bcrypt.compare(credentials().password, user.password_hash),
    ).toBe(true);
    expect(bcrypt.getRounds(user.password_hash)).toBe(10);
    expect((await snapshot()).filter((item) => item.name !== 'users')).toEqual(
      before.filter((item) => item.name !== 'users'),
    );
    expect(await db.users.count()).toBe(1);
  });
  it('creates the account through the real stdin CLI without outputting credentials', async () => {
    const result = await cli(credentials());
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Administrator created:');
    expect(
      await db.users.count({ where: { role: 'ADMIN', status: 'ACTIVE' } }),
    ).toBe(1);
    noSecret(result);
    expect(result.stdout + result.stderr).not.toContain(
      'first-admin@example.test',
    );
  });

  it('serializes independent CLI processes so only one first ADMIN can be created', async () => {
    const results = await Promise.all([
      cli(credentials()),
      cli(credentials({ email: 'concurrent@example.test' })),
    ]);
    expect(results.map((item) => item.code).sort()).toEqual([0, 1]);
    expect(results.find((item) => item.code === 1)!.stderr).toContain(
      'ADMIN_EXISTS',
    );
    expect(await db.users.count()).toBe(1);
    results.forEach((result) => noSecret(result));
  }, 30000);
  it.each(['LECTURER', 'STUDENT'] as const)(
    'refuses an installation containing a %s account',
    async (role) => {
      await db.users.create({
        data: {
          full_name: 'Existing synthetic user',
          email: 'existing@example.test',
          password_hash: 'unchanged-test-hash',
          role,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      const before = await snapshot();
      await expect(
        provisionFirstAdmin(db, credentials()),
      ).rejects.toMatchObject({ code: 'INSTALLATION_NOT_EMPTY' });
      expect(await snapshot()).toEqual(before);
    },
  );
  it.each(['academic_year', 'department'] as const)(
    'refuses existing %s school data without changes',
    async (kind) => {
      if (kind === 'academic_year')
        await db.academic_years.create({
          data: { name: 'Preexisting', start_year: 2026 },
        });
      else
        await db.departments.create({
          data: { code: 'PRE', name: 'Preexisting Department' },
        });
      const before = await snapshot();
      await expect(
        provisionFirstAdmin(db, credentials()),
      ).rejects.toMatchObject({ code: 'INSTALLATION_NOT_EMPTY' });
      expect(await snapshot()).toEqual(before);
    },
  );
  it('refuses an incomplete migration ledger without touching accounts', async () => {
    const [last] = await db.$queryRaw<Array<{ id: string; finished_at: Date }>>(
      Prisma.sql`SELECT id, finished_at FROM ${table('_prisma_migrations')} ORDER BY migration_name DESC LIMIT 1`,
    );
    try {
      await db.$executeRaw(
        Prisma.sql`UPDATE ${table('_prisma_migrations')} SET finished_at = NULL WHERE id = ${last.id}`,
      );
      await expect(
        provisionFirstAdmin(db, credentials()),
      ).rejects.toMatchObject({ code: 'DATABASE_NOT_READY' });
      expect(await db.users.count()).toBe(0);
    } finally {
      await db.$executeRaw(
        Prisma.sql`UPDATE ${table('_prisma_migrations')} SET finished_at = ${last.finished_at} WHERE id = ${last.id}`,
      );
    }
  });
  it('rolls back an injected failure after the user insert', async () => {
    const before = await snapshot();
    const failing = {
      $transaction: (
        operation: (tx: Prisma.TransactionClient) => Promise<unknown>,
        options: object,
      ) =>
        db.$transaction(
          (tx) =>
            operation(
              new Proxy(tx, {
                get(target, key) {
                  if (key !== 'users') return Reflect.get(target, key);
                  return new Proxy(target.users, {
                    get(delegate, method) {
                      if (method !== 'create')
                        return Reflect.get(delegate, method);
                      return async (args: Prisma.usersCreateArgs) => {
                        await delegate.create(args);
                        throw new Error('Injected post-insert failure');
                      };
                    },
                  });
                },
              }),
            ),
          options,
        ),
    } as unknown as PrismaClient;
    await expect(provisionFirstAdmin(failing, credentials())).rejects.toThrow(
      'Injected post-insert failure',
    );
    expect(await snapshot()).toEqual(before);
  });
  const invalid: Array<[string, unknown]> = [
    ['missing object', null],
    ['array', []],
    ['missing name', { ...credentials(), full_name: undefined }],
    ['blank name', credentials({ full_name: ' \t ' })],
    ['long name', credentials({ full_name: 'x'.repeat(151) })],
    ['invalid email', credentials({ email: 'invalid' })],
    ['missing email', { ...credentials(), email: undefined }],
    ['missing password', { ...credentials(), password: undefined }],
    ['short password', credentials({ password: 'short' })],
    ['blank password', credentials({ password: '      ' })],
    ['long password', credentials({ password: 'x'.repeat(73) })],
    ['UTF-8 byte overflow', credentials({ password: '\u1780'.repeat(25) })],
    ['numeric password', credentials({ password: 123456 })],
    ['injected role', credentials({ role: 'ADMIN' })],
    ['injected id', credentials({ id: '1' })],
  ];
  it.each(invalid)(
    'rejects %s input before writes and without reflecting credentials',
    async (_label, input) => {
      const before = await snapshot();
      const result = await cli(input);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('INVALID_INPUT');
      expect(await snapshot()).toEqual(before);
      noSecret(result);
    },
  );
  it('accepts a 72-byte password and a 150-character Unicode name', async () => {
    const input = credentials({
      password: '\u1780'.repeat(24),
      full_name: '\u1780'.repeat(150),
    });
    const result = await cli(input);
    expect(result.code).toBe(0);
    noSecret(result, input.password as string);
    const user = await db.users.findFirstOrThrow();
    expect(
      await bcrypt.compare(input.password as string, user.password_hash),
    ).toBe(true);
    expect(Array.from(user.full_name)).toHaveLength(150);
  });
  it.each(['malformed', 'oversized'] as const)(
    'rejects %s stdin without writes or raw input output',
    async (kind) => {
      const before = await snapshot();
      const input =
        kind === 'malformed'
          ? '{"password":"DO_NOT_ECHO_SECRET"'
          : JSON.stringify(credentials({ full_name: 'x'.repeat(9000) }));
      const result = await cli(input);
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('INVALID_INPUT');
      expect(result.stdout + result.stderr).not.toContain('DO_NOT_ECHO_SECRET');
      expect(await snapshot()).toEqual(before);
    },
  );
  it('rejects credential command-line arguments without echoing their values', async () => {
    const result = await cli('', ['--password', 'DO_NOT_ECHO_SECRET']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('INVALID_ARGUMENTS');
    expect(result.stdout + result.stderr).not.toContain('DO_NOT_ECHO_SECRET');
    expect(await db.users.count()).toBe(0);
  });
  it('prints help without connecting or requiring valid configuration', async () => {
    const result = await cli('', ['--help'], {
      DATABASE_URL: 'not-a-database',
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Usage:');
    expect(await db.users.count()).toBe(0);
  });
  it('fails closed for noninteractive input without the explicit stdin option', async () => {
    const result = await cli(credentials(), []);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('INTERACTIVE_TERMINAL_REQUIRED');
    noSecret(result);
    expect(await db.users.count()).toBe(0);
  });
  it('blocks a normal database URL in test mode before any connection', async () => {
    const forbidden = new URL(targetUrl);
    forbidden.pathname = '/teacher_evaluation';
    const result = await cli(credentials(), ['--stdin'], {
      NODE_ENV: 'test',
      DATABASE_URL: forbidden.toString(),
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('INVALID_CONFIGURATION');
    noSecret(result);
    expect(await db.users.count()).toBe(0);
  });
  it('sanitizes unexpected connection errors instead of logging URL credentials', async () => {
    const disconnected = new URL(targetUrl);
    disconnected.port = '1';
    disconnected.password = 'DO_NOT_ECHO_DB_SECRET';
    disconnected.searchParams.set('connect_timeout', '1');
    const result = await cli(credentials(), ['--stdin'], {
      DATABASE_URL: disconnected.toString(),
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('BOOTSTRAP_FAILED');
    expect(result.stdout + result.stderr).not.toContain(
      'DO_NOT_ECHO_DB_SECRET',
    );
    expect(result.stdout + result.stderr).not.toContain(
      disconnected.toString(),
    );
    noSecret(result);
  });
  function terminalInput(answers: string[]) {
    const input = Object.assign(new PassThrough(), {
      isTTY: true,
      setRawMode() {
        return this;
      },
    });
    let printed = '';
    let index = 0;
    const prompts = [
      'Administrator name: ',
      'Administrator email: ',
      'Password (hidden): ',
      'Confirm password (hidden): ',
    ];
    const output = Object.assign(
      new Writable({
        write(chunk, _encoding, done) {
          printed += chunk.toString();
          if (index < answers.length && printed.includes(prompts[index])) {
            const answer = answers[index++];
            setImmediate(() =>
              input.write(answer === '\x03' ? answer : `${answer}\r`),
            );
          }
          done();
        },
      }),
      { isTTY: true },
    );
    return { input, output, printed: () => printed };
  }
  it('hides both password entries in interactive prompting and preserves the password bytes', async () => {
    const password = '  PrivateSyntheticPassword  ';
    const terminal = terminalInput([
      'Synthetic Admin',
      'interactive@example.test',
      password,
      password,
    ]);
    const input = await promptCredentials(terminal.input, terminal.output);
    expect(input).toEqual({
      full_name: 'Synthetic Admin',
      email: 'interactive@example.test',
      password,
    });
    expect(terminal.printed()).not.toContain('PrivateSyntheticPassword');
    terminal.input.end();
    terminal.output.end();
  });
  it('rejects mismatched hidden confirmation without exposing either password', async () => {
    const terminal = terminalInput([
      'Synthetic Admin',
      'interactive@example.test',
      'HiddenSynthetic123',
      'DifferentSynthetic123',
    ]);
    await expect(
      promptCredentials(terminal.input, terminal.output),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(terminal.printed()).not.toContain('HiddenSynthetic123');
    expect(terminal.printed()).not.toContain('DifferentSynthetic123');
    expect(await db.users.count()).toBe(0);
    terminal.input.end();
    terminal.output.end();
  });
  it('cancels hidden prompting safely on Ctrl+C', async () => {
    const terminal = terminalInput([
      'Synthetic Admin',
      'interactive@example.test',
      '\x03',
    ]);
    await expect(
      promptCredentials(terminal.input, terminal.output),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(await db.users.count()).toBe(0);
    terminal.input.end();
    terminal.output.end();
  });
  it.each(['ACTIVE', 'INACTIVE'] as const)(
    'refuses an existing %s ADMIN without resetting any account',
    async (status) => {
      const receipt = await provisionFirstAdmin(db, credentials());
      if (status === 'INACTIVE')
        await db.users.update({
          where: { id: BigInt(receipt.id) },
          data: { status },
        });
      const before = await snapshot();
      const result = await cli(
        credentials({
          email: 'another@example.test',
          password: 'DifferentSynthetic123!',
        }),
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('ADMIN_EXISTS');
      expect(await snapshot()).toEqual(before);
      noSecret(result, 'DifferentSynthetic123!');
    },
  );
  it('allows the provisioned ADMIN to sign in and create initial department, major and year data', async () => {
    await provisionFirstAdmin(db, credentials());
    const login = await api().post('/api/auth/login').send({
      identifier: credentials().email,
      password: credentials().password,
    });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.access_token}` };
    expect((await api().get('/api/auth/me').set(auth)).body).toMatchObject({
      role: 'ADMIN',
      user_departments: [],
    });
    const department = await api()
      .post('/api/departments')
      .set(auth)
      .send({ code: 'BOOT', name: 'Bootstrap Synthetic Department' });
    expect(department.status).toBe(201);
    const major = await api().post('/api/majors').set(auth).send({
      code: 'BOOT-M',
      name: 'Bootstrap Synthetic Major',
      department_id: department.body.id,
    });
    expect(major.status).toBe(201);
    const year = await api()
      .post('/api/academic-years')
      .set(auth)
      .send({ name: 'BOOT-2026', start_year: 2026, is_active: false });
    expect(year.status).toBe(201);
    expect(
      (
        await api()
          .post('/api/semesters')
          .set(auth)
          .send({
            semester_name: 'Semester 1',
            academic_year_id: Number(year.body.id),
            semester_number: 1,
          })
      ).status,
    ).toBe(201);
    expect(
      (
        await api()
          .post('/api/users')
          .send({ ...credentials(), role: 'ADMIN' })
      ).status,
    ).toBe(401);
  });
});
