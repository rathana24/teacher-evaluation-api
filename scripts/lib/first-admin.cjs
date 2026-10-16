const fs = require('node:fs');
const path = require('node:path');
const bcrypt = require('bcrypt');
const { isEmail } = require('class-validator');
const { Prisma } = require('@prisma/client');

class BootstrapError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function validateCredentials(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (key) => !['full_name', 'email', 'password'].includes(key),
    )
  ) {
    throw new BootstrapError(
      'INVALID_INPUT',
      'Supply only full_name, email and password.',
    );
  }
  const fullName =
    typeof input.full_name === 'string' ? input.full_name.trim() : '';
  const email =
    typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (!fullName || Array.from(fullName).length > 150)
    throw new BootstrapError(
      'INVALID_INPUT',
      'Name must contain 1 to 150 characters after trimming.',
    );
  if (!isEmail(email) || email.length > 255)
    throw new BootstrapError(
      'INVALID_INPUT',
      'Supply a valid email address up to 255 characters.',
    );
  if (
    typeof input.password !== 'string' ||
    !input.password.trim() ||
    Array.from(input.password).length < 6 ||
    Buffer.byteLength(input.password, 'utf8') > 72
  ) {
    throw new BootstrapError(
      'INVALID_INPUT',
      'Password must contain 6 to 72 characters and at most 72 UTF-8 bytes.',
    );
  }
  return { full_name: fullName, email, password: input.password };
}

const quote = (name) => `"${name.replaceAll('"', '""')}"`;
const models = Prisma.dmmf.datamodel.models;
const tableNames = models.map((model) => model.dbName || model.name).sort();

function requiredMigrations() {
  const folder = path.resolve(__dirname, '../../prisma/migrations');
  return fs
    .readdirSync(folder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

async function provisionFirstAdmin(prisma, input) {
  const credentials = validateCredentials(input);
  const migrations = requiredMigrations();
  // Match normal staff authentication: bcrypt with cost 10, never return the hash.
  const passwordHash = await bcrypt.hash(credentials.password, 10);
  return prisma.$transaction(
    async (tx) => {
      const [context] = await tx.$queryRaw`SELECT current_schema() AS schema`;
      if (!context?.schema)
        throw new BootstrapError(
          'DATABASE_NOT_READY',
          'Apply the repository migrations before provisioning.',
        );
      const schema = quote(context.schema);
      await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      // ReadCommitted + table locks: wait first, then observe the previous winner.
      // Lock all application tables to keep the empty-installation check atomic
      // against other setup writers as well as concurrent bootstrap processes.
      const tables = [...tableNames, '_prisma_migrations']
        .sort()
        .map((name) => Prisma.raw(`${schema}.${quote(name)}`));
      await tx.$executeRaw(
        Prisma.sql`LOCK TABLE ${Prisma.join(tables)} IN SHARE ROW EXCLUSIVE MODE`,
      );
      const applied = await tx.$queryRaw(
        Prisma.sql`SELECT migration_name, finished_at FROM ${Prisma.raw(`${schema}."_prisma_migrations"`)} WHERE rolled_back_at IS NULL`,
      );
      if (
        applied.length !== migrations.length ||
        migrations.some(
          (migration) =>
            applied.filter(
              (row) => row.migration_name === migration && row.finished_at,
            ).length !== 1,
        )
      ) {
        throw new BootstrapError(
          'DATABASE_NOT_READY',
          'Apply and verify all repository migrations before provisioning.',
        );
      }
      if (await tx.users.count({ where: { role: 'ADMIN' } }))
        throw new BootstrapError(
          'ADMIN_EXISTS',
          'An administrator already exists; no account was changed.',
        );
      for (const model of models) {
        if (model.name === 'departments') {
          // This one row is inserted by an existing migration, not the sample seed.
          const departments = await tx.departments.findMany();
          if (
            departments.length > 1 ||
            departments.some(
              (row) =>
                row.code !== 'AMS' ||
                row.name !== 'Applied Mathematics and Statistics' ||
                row.status !== 'ACTIVE',
            )
          )
            throw new BootstrapError(
              'INSTALLATION_NOT_EMPTY',
              'School data already exists; provisioning is for an empty installation only.',
            );
        } else if (await tx[model.name].count()) {
          throw new BootstrapError(
            'INSTALLATION_NOT_EMPTY',
            'Accounts or school data already exist; no account was changed.',
          );
        }
      }
      const now = new Date();
      const user = await tx.users.create({
        data: {
          full_name: credentials.full_name,
          email: credentials.email,
          password_hash: passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          created_at: now,
          updated_at: now,
        },
        select: { id: true, role: true, status: true },
      });
      return { id: user.id.toString(), role: user.role, status: user.status };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 5000,
      timeout: 20000,
    },
  );
}

module.exports = { BootstrapError, validateCredentials, provisionFirstAdmin };
