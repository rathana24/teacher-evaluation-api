// Load the same guarded local test environment as API tests and synthetic seed.
// This is a test preview API, not the school deployment entry point.
require('./run-e2e.cjs');

const args = process.argv.slice(2);
if (args.length) {
  if (args.length !== 2 || args[0] !== '--port' || !/^[1-9]\d*$/.test(args[1])) {
    throw new Error('Usage: npm run start:test -- [--port 3000]');
  }
  const port = Number(args[1]);
  if (port > 65535) throw new Error('Test API port must be between 1 and 65535.');
  process.env.PORT = String(port);
}

require('../dist/main.js');
