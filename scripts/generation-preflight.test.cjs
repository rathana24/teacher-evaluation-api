const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { PrismaClient } = require('@prisma/client');
const {
  generationNumber,
  analyzeGenerations,
  validateTestConfig,
  collectGenerations,
  databaseFingerprint,
  inReadOnlySnapshot,
} = require('./lib/generation-preflight.cjs');

const fixture = () => ({
  generations: [
    {
      id: '7',
      name: 'Gen 1',
      entry_academic_year_id: '10',
      starting_year_level: 1,
    },
  ],
  students: [{ id: '20', generation_id: '7' }],
  records: [
    {
      id: '30',
      student_id: '20',
      academic_year_id: '10',
      major_id: '40',
      progression_action: 'NORMAL',
    },
  ],
  scopes: [],
  generationTargets: [],
  groupTargets: [],
});

for (const value of [
  5,
  '5',
  '05',
  'Gen 5',
  '  gen 005  ',
  2147483647,
  '2147483647',
])
  test(`numeric compatibility alias ${JSON.stringify(value)}`, () =>
    assert.equal(
      generationNumber(value),
      String(value).includes('2147483647') ? 2147483647 : 5,
    ));

for (const value of [
  0,
  -1,
  1.5,
  2147483648,
  '0',
  '-1',
  '1.5',
  '2147483648',
  '9007199254740993',
  'Cohort 5',
  'Gen5',
  '',
  null,
  true,
  {},
  '5e1',
  '0x10',
])
  test(`reject invalid generation alias ${JSON.stringify(value)}`, () =>
    assert.equal(generationNumber(value), null));

test('one observed major still requires review and is not assigned ownership', () => {
  const result = analyzeGenerations(fixture());
  assert.equal(result.cohort_contract_implemented, false);
  assert.equal(result.cohorts[0].status, 'REVIEW_REQUIRED');
  assert.deepEqual(result.cohorts[0].observed_major_ids, ['40']);
  assert.ok(result.cohorts[0].issues.includes('HISTORICAL_COHORT_NOT_STORED'));
  assert.equal(result.cohorts[0].major_id, undefined);
});
test('unlinked or placement-free cohorts cannot receive a guessed major', () => {
  const data = fixture();
  data.records = [];
  assert.deepEqual(analyzeGenerations(data).cohorts[0].issues, [
    'NO_MAJOR_EVIDENCE',
    'PROFILE_WITHOUT_PLACEMENT',
  ]);
});
test('arbitrary labels are flagged without leaking the legacy label', () => {
  const data = fixture();
  data.generations[0].name = 'Private student name';
  const result = analyzeGenerations(data);
  assert.ok(result.cohorts[0].issues.includes('UNPARSEABLE_GENERATION_NUMBER'));
  assert.ok(!JSON.stringify(result).includes('Private student name'));
});
test('two majors sharing one global cohort need reviewed splitting', () => {
  const data = fixture();
  data.students.push({ id: '21', generation_id: '7' });
  data.records.push({
    id: '31',
    student_id: '21',
    academic_year_id: '10',
    major_id: '41',
    progression_action: 'NORMAL',
  });
  const cohort = analyzeGenerations(data).cohorts[0];
  assert.deepEqual(cohort.observed_major_ids, ['40', '41']);
  assert.ok(cohort.issues.includes('MULTIPLE_MAJOR_EVIDENCE'));
  assert.equal(cohort.evidence.multi_major_profile_histories, 0);
});
test('a transfer is distinguished from two students in different majors; pause history is retained', () => {
  const data = fixture();
  data.records.push(
    {
      id: '31',
      student_id: '20',
      academic_year_id: '11',
      major_id: '41',
      progression_action: 'TRANSFER',
    },
    {
      id: '32',
      student_id: '20',
      academic_year_id: '12',
      major_id: '41',
      progression_action: 'PAUSE',
    },
  );
  const cohort = analyzeGenerations(data).cohorts[0];
  assert.equal(cohort.evidence.multi_major_profile_histories, 1);
  assert.equal(cohort.evidence.progression_actions.PAUSE, 1);
  assert.ok(cohort.issues.includes('TRANSFER_MAPPING_REQUIRED'));
});
test('numeric aliases collide within a candidate major and never silently merge', () => {
  const data = fixture();
  data.generations.push({
    id: '8',
    name: '01',
    entry_academic_year_id: '10',
    starting_year_level: 1,
  });
  data.scopes.push({
    id: '60',
    generation_id: '8',
    major_id: '40',
    academic_year_id: '10',
  });
  assert.deepEqual(analyzeGenerations(data).candidate_collisions, [
    {
      major_id: '40',
      candidate_generation_number: 1,
      legacy_generation_ids: ['7', '8'],
      conflicting_entry_metadata: false,
    },
  ]);
});
test('collision detects different entry years and starting levels', () => {
  const data = fixture();
  data.generations.push({
    id: '8',
    name: '01',
    entry_academic_year_id: '11',
    starting_year_level: 2,
  });
  data.scopes.push({
    id: '60',
    generation_id: '8',
    major_id: '40',
    academic_year_id: '11',
  });
  assert.equal(
    analyzeGenerations(data).candidate_collisions[0].conflicting_entry_metadata,
    true,
  );
});
test('DS and FE may each start at 1 with distinct cohort IDs and entry years', () => {
  const data = fixture();
  data.generations.push({
    id: '8',
    name: '01',
    entry_academic_year_id: '11',
    starting_year_level: 1,
  });
  data.scopes.push({
    id: '60',
    generation_id: '8',
    major_id: '41',
    academic_year_id: '11',
  });
  const result = analyzeGenerations(data);
  assert.equal(result.candidate_collisions.length, 0);
  assert.deepEqual(
    result.cohorts.map((row) => [
      row.legacy_generation_id,
      row.candidate_generation_number,
      row.entry_academic_year_id,
    ]),
    [
      ['7', 1, '10'],
      ['8', 1, '11'],
    ],
  );
});
test('captured and missing target labels remain separate, including contradictory major evidence', () => {
  const data = fixture();
  data.groupTargets.push({
    id: '50',
    generation_id: '7',
    major_id: '40',
    academic_year_id: '10',
    historical_labels: { schema_version: 1, major: { id: '41' } },
    labels_captured_at: '2026-10-15',
  });
  data.generationTargets.push({
    evaluation_id: '100',
    generation_id: '7',
    historical_labels: null,
    labels_captured_at: null,
  });
  const cohort = analyzeGenerations(data).cohorts[0];
  assert.equal(cohort.evidence.captured_labels, 1);
  assert.equal(cohort.evidence.unknown_labels, 1);
  for (const issue of [
    'FROZEN_REFERENCES_MUST_REMAIN',
    'LEGACY_LABELS_UNKNOWN',
    'CAPTURED_MAJOR_DIFFERS_FROM_REFERENCE',
  ])
    assert.ok(cohort.issues.includes(issue));
});
test('analysis preserves source data and emits no student identifiers, notes, group labels or answers', () => {
  const data = fixture();
  Object.assign(data.students[0], {
    full_name: 'Secret Name',
    email: 'secret@example.test',
    notes: 'Secret Notes',
    password_hash: 'SecretHash',
  });
  const copy = structuredClone(data);
  const output = JSON.stringify(analyzeGenerations(data));
  assert.deepEqual(data, copy);
  for (const value of [
    'Secret',
    'student_id',
    'class_group',
    'password_hash',
    'responses',
  ])
    assert.ok(!output.includes(value));
});
test('input fingerprint changes when academic mapping evidence changes', () => {
  const data = fixture();
  const old = analyzeGenerations(data).source_fingerprint;
  data.records[0].major_id = '41';
  assert.notEqual(analyzeGenerations(data).source_fingerprint, old);
});
test('empty catalog advertises no implemented capability', () => {
  const data = fixture();
  for (const key of Object.keys(data)) data[key] = [];
  assert.equal(analyzeGenerations(data).cohort_contract_implemented, false);
  assert.deepEqual(analyzeGenerations(data).cohorts, []);
});
test('IDs beyond JS safe integer are retained without rounding', () => {
  const data = fixture();
  data.generations[0].id = '9007199254740993';
  data.students[0].generation_id = '9007199254740993';
  assert.equal(
    analyzeGenerations(data).cohorts[0].legacy_generation_id,
    '9007199254740993',
  );
});
test('test guard accepts only explicit local isolated public-schema configuration', () => {
  const config = {
    NODE_ENV: 'test',
    DB_NAME: 'teacher_evaluation_test',
    DATABASE_URL:
      'postgresql://synthetic:synthetic@localhost:5432/teacher_evaluation_test?schema=public',
  };
  assert.equal(validateTestConfig(config), config.DATABASE_URL);
  for (const change of [
    { NODE_ENV: 'development' },
    { DB_NAME: 'teacher_evaluation' },
    {
      DATABASE_URL: config.DATABASE_URL.replace(
        'teacher_evaluation_test',
        'teacher_evaluation',
      ),
    },
    {
      DATABASE_URL: config.DATABASE_URL.replace(
        'localhost',
        'remote.example.test',
      ),
    },
    {
      DATABASE_URL: config.DATABASE_URL.replace(
        'schema=public',
        'schema=other',
      ),
    },
    { DATABASE_URL: 'invalid' },
  ])
    assert.throws(() => validateTestConfig({ ...config, ...change }));
});
test('collector enables read-only before any context or application read', async () => {
  const calls = [];
  const db = {
    $transaction: async (callback, options) => {
      assert.equal(options.isolationLevel, 'RepeatableRead');
      return callback({
        $executeRaw: async () => {
          calls.push('read-only');
        },
        $queryRaw: async () => {
          calls.push('context');
          return [
            {
              database: 'teacher_evaluation_test',
              schema: 'public',
              read_only: 'on',
              isolation: 'repeatable read',
            },
          ];
        },
      });
    },
  };
  await inReadOnlySnapshot(db, () => {
    calls.push('operation');
  });
  assert.deepEqual(calls, ['read-only', 'context', 'operation']);
});
test('unexpected real database context blocks the operation', async () => {
  let called = false;
  const db = {
    $transaction: async (callback) =>
      callback({
        $executeRaw: async () => {},
        $queryRaw: async () => [
          {
            database: 'teacher_evaluation',
            schema: 'public',
            read_only: 'on',
            isolation: 'repeatable read',
          },
        ],
      }),
  };
  await assert.rejects(
    inReadOnlySnapshot(db, () => {
      called = true;
    }),
  );
  assert.equal(called, false);
});

test('real isolated audit is read-only and preserves all rows, migration ledger and sequence values', async () => {
  const config = parseEnv(
    fs.readFileSync(path.resolve(__dirname, '../.env.test.local'), 'utf8'),
  );
  const db = new PrismaClient({
    datasources: { db: { url: validateTestConfig(config) } },
    log: [],
  });
  try {
    const before = await databaseFingerprint(db);
    const first = await collectGenerations(db);
    const second = await collectGenerations(db);
    assert.deepEqual(first, second);
    assert.deepEqual(await databaseFingerprint(db), before);
    assert.equal(first.database_context.read_only, 'on');
    assert.equal(first.cohort_contract_implemented, false);
    assert.equal(before.tables.length, 32);
    assert.equal(
      before.tables.find((row) => row.table === '_prisma_migrations').count,
      23,
    );
  } finally {
    await db.$disconnect();
  }
});
