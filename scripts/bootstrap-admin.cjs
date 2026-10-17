const { selectedTestDatabase } = require('./lib/test-database.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { Writable } = require('node:stream');
const { createInterface } = require('node:readline/promises');
const { PrismaClient } = require('@prisma/client');
const {
  BootstrapError,
  validateCredentials,
  provisionFirstAdmin,
} = require('./lib/first-admin.cjs');

const help = `Create the first administrator on a migrated empty installation.
Usage: npm run admin:bootstrap -- [--env-file PATH] [--stdin]
Default: hidden password and confirmation prompts in an interactive terminal.
--stdin: read one JSON object with full_name, email and password from a secure pipe.
Never supply a password as a command-line argument. No seed or migration runs.
An existing administrator/account or school data causes refusal; the unchanged
migration-created AMS department is allowed. Existing environment values take
precedence over the selected env file (default: project .env).
`;

function parseArguments(args) {
  const options = { stdin: false, envFile: null, help: false };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--help' && !options.help) options.help = true;
    else if (args[index] === '--stdin' && !options.stdin) options.stdin = true;
    else if (
      args[index] === '--env-file' &&
      !options.envFile &&
      args[index + 1] &&
      !args[index + 1].startsWith('--')
    )
      options.envFile = args[++index];
    else
      throw new BootstrapError(
        'INVALID_ARGUMENTS',
        'Use --help for supported options; credentials must not be command-line arguments.',
      );
  }
  return options;
}

function configuration(options, environment) {
  const file = options.envFile
    ? path.resolve(options.envFile)
    : path.resolve(__dirname, '../.env');
  if (options.envFile && !fs.existsSync(file))
    throw new BootstrapError(
      'INVALID_CONFIGURATION',
      'The selected environment file is unavailable.',
    );
  const values = {
    ...(fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {}),
    ...environment,
  };
  let url;
  try {
    url = new URL(values.DATABASE_URL);
  } catch {
    throw new BootstrapError(
      'INVALID_CONFIGURATION',
      'Set DATABASE_URL explicitly for the intended migrated installation.',
    );
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.pathname.slice(1)
  )
    throw new BootstrapError(
      'INVALID_CONFIGURATION',
      'DATABASE_URL must identify a PostgreSQL database.',
    );
  if (
    values.NODE_ENV === 'test' &&
    (!['localhost', '127.0.0.1'].includes(url.hostname) ||
      decodeURIComponent(url.pathname.slice(1)) !== selectedTestDatabase())
  )
    throw new BootstrapError(
      'INVALID_CONFIGURATION',
      'Test mode requires the local teacher_evaluation_test database.',
    );
  return {
    url: url.toString(),
    database: decodeURIComponent(url.pathname.slice(1)),
    schema: url.searchParams.get('schema') || 'public',
  };
}

async function readCredentials(input) {
  const chunks = [];
  let size = 0;
  for await (const chunk of input) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 8192)
      throw new BootstrapError(
        'INVALID_INPUT',
        'Credential input exceeds the 8192-byte limit.',
      );
    chunks.push(buffer);
  }
  let inputObject;
  try {
    inputObject = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new BootstrapError(
      'INVALID_INPUT',
      'Supply one JSON credential object through standard input.',
    );
  }
  return validateCredentials(inputObject);
}

async function promptCredentials(
  input = process.stdin,
  output = process.stdout,
) {
  if (!input.isTTY || !output.isTTY)
    throw new BootstrapError(
      'INTERACTIVE_TERMINAL_REQUIRED',
      'Use an interactive terminal or the documented secure --stdin mode.',
    );
  let muted = false;
  const terminal = new Writable({
    write(chunk, encoding, done) {
      if (!muted) output.write(chunk, encoding);
      done();
    },
  });
  const reader = createInterface({
    input,
    output: terminal,
    terminal: true,
    historySize: 0,
  });
  const controller = new AbortController();
  reader.on('SIGINT', () => controller.abort());
  reader.on('close', () => controller.abort());
  const question = (text) =>
    reader.question(text, { signal: controller.signal });
  const secret = async (text) => {
    const answer = question(text);
    muted = true;
    try {
      return await answer;
    } finally {
      muted = false;
      output.write('\n');
    }
  };
  try {
    const full_name = await question('Administrator name: ');
    const email = await question('Administrator email: ');
    const password = await secret('Password (hidden): ');
    if ((await secret('Confirm password (hidden): ')) !== password)
      throw new BootstrapError(
        'INVALID_INPUT',
        'Password confirmation does not match.',
      );
    return validateCredentials({ full_name, email, password });
  } catch (error) {
    if (error?.name === 'AbortError')
      throw new BootstrapError(
        'CANCELLED',
        'Provisioning cancelled; no account was created.',
      );
    throw error;
  } finally {
    reader.close();
    terminal.end();
  }
}

async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    process.stdout.write(help);
    return;
  }
  const config = configuration(options, process.env);
  process.stdout.write(
    `Target: ${JSON.stringify(config.database)} / ${JSON.stringify(config.schema)}\n`,
  );
  const credentials = options.stdin
    ? await readCredentials(process.stdin)
    : await promptCredentials();
  const prisma = new PrismaClient({ datasources: { db: { url: config.url } } });
  try {
    const result = await provisionFirstAdmin(prisma, credentials);
    process.stdout.write(`Administrator created: ${JSON.stringify(result)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module)
  main().catch((error) => {
    // Prisma/configuration errors can contain connection details or query data.
    // Emit only controlled messages; never print an error object, password or hash.
    const safe = error instanceof BootstrapError;
    process.stderr.write(
      safe
        ? `${error.code}: ${error.message}\n`
        : 'BOOTSTRAP_FAILED: Verify database connectivity, migrations and installation readiness; no credential details are logged.\n',
    );
    process.exitCode = safe && error.code === 'CANCELLED' ? 130 : 1;
  });

module.exports = {
  parseArguments,
  configuration,
  readCredentials,
  promptCredentials,
};
