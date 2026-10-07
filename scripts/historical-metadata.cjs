const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { parseEnv } = require('node:util');
const { PrismaClient, Prisma } = require('@prisma/client');

const stringify = (value) =>
  JSON.stringify(
    value,
    (_, item) => (typeof item === 'bigint' ? item.toString() : item),
    2,
  );
const hash = (value) =>
  createHash('sha256').update(stringify(value)).digest('hex');
const positiveId = (value) =>
  typeof value === 'string' && /^[1-9]\d*$/.test(value);
const requireCondition = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function inspectRecord(db, kind, id) {
  const isResponse = kind === 'response';
  requireCondition(
    isResponse || kind === 'draft',
    'Record kind must be response or draft.',
  );
  const model = isResponse ? db.responses : db.assessment_drafts;
  const row = await model.findUnique({
    where: { id: BigInt(id) },
    include: isResponse
      ? {
          evaluations: {
            select: { survey_versions: { select: { survey_id: true } } },
          },
          answers: {
            include: { answer_options: true },
            orderBy: { question_id: 'asc' },
          },
        }
      : {
          evaluation_participants: {
            select: {
              evaluations: {
                select: { survey_versions: { select: { survey_id: true } } },
              },
            },
          },
        },
  });
  requireCondition(row, `Missing ${kind} ${id}.`);
  const surveyId = (
    isResponse ? row.evaluations : row.evaluation_participants.evaluations
  ).survey_versions.survey_id;
  const answers = isResponse
    ? row.answers.map((answer) => ({
        question_id: answer.question_id.toString(),
        rating_value: answer.rating_value,
        text_value: answer.text_value,
        selected_option_ids: answer.answer_options
          .map((option) => option.option_id.toString())
          .sort(),
      }))
    : row.answers_json;
  const validShape =
    Array.isArray(answers) &&
    answers.length > 0 &&
    answers.every(
      (answer) =>
        answer &&
        positiveId(answer.question_id) &&
        (answer.selected_option_ids === undefined ||
          (Array.isArray(answer.selected_option_ids) &&
            answer.selected_option_ids.every(positiveId))),
    );
  const questions = validShape
    ? await db.questions.findMany({
        where: {
          id: { in: answers.map((answer) => BigInt(answer.question_id)) },
        },
        include: {
          survey_versions: { select: { survey_id: true } },
          question_options: { orderBy: { id: 'asc' } },
        },
        orderBy: { id: 'asc' },
      })
    : [];
  const questionMap = new Map(
    questions.map((question) => [question.id.toString(), question]),
  );
  const issues = [];
  if (!validShape) issues.push('EMPTY_OR_INVALID_ANSWERS_REQUIRE_PROVENANCE');
  if (
    validShape &&
    new Set(answers.map((answer) => answer.question_id)).size !== answers.length
  )
    issues.push('DUPLICATE_QUESTION_IDS');
  if (validShape)
    for (const answer of answers) {
      const question = questionMap.get(answer.question_id);
      if (!question) {
        issues.push('MISSING_ORIGINAL_QUESTION');
        continue;
      }
      if (question.survey_versions.survey_id !== surveyId)
        issues.push('QUESTION_BELONGS_TO_ANOTHER_SET');
      const optionIds = new Set(
        question.question_options.map((option) => option.id.toString()),
      );
      if (
        (answer.selected_option_ids || []).some(
          (option) => !optionIds.has(option),
        )
      )
        issues.push('OPTION_DOES_NOT_BELONG_TO_QUESTION');
    }
  const versions = [
    ...new Set(
      questions.map((question) => question.survey_version_id.toString()),
    ),
  ];
  if (versions.length !== 1) issues.push('NO_SINGLE_ORIGINAL_VERSION');
  const fingerprint = hash({
    kind,
    id,
    surveyId,
    answers,
    questions,
    created_at: row.created_at,
    updated_at: isResponse ? row.submitted_at : row.updated_at,
  });
  return {
    kind,
    id,
    survey_id: surveyId.toString(),
    current_version_id: row.survey_version_id?.toString() ?? null,
    candidate_version_id: issues.length === 0 ? versions[0] : null,
    fingerprint,
    question_ids: questions.map((question) => question.id.toString()),
    status: issues.length
      ? 'AMBIGUOUS_REQUIRES_REVIEW'
      : 'CANDIDATE_REQUIRES_VERIFIED_PROVENANCE',
    issues: [...new Set(issues)],
  };
}

async function review(db) {
  const [accounts, profiles, evaluations, submissions, savedDrafts] =
    await Promise.all([
      db.users.count(),
      db.students.count(),
      db.evaluations.count(),
      db.responses.count(),
      db.assessment_drafts.count(),
    ]);
  const [responses, drafts, semesters, offerings, years] = await Promise.all([
    db.responses.findMany({
      where: { survey_version_id: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    }),
    db.assessment_drafts.findMany({
      where: { survey_version_id: null },
      select: { id: true },
      orderBy: { id: 'asc' },
    }),
    db.semesters.findMany({
      where: { semester_number: null },
      select: { id: true },
    }),
    db.course_offerings.findMany({
      where: { OR: [{ class_type: null }, { year_level: null }] },
      select: { id: true, class_type: true, year_level: true },
    }),
    db.academic_years.findMany({
      where: { start_year: null },
      select: { id: true },
    }),
  ]);
  const records = [];
  for (const row of responses)
    records.push(await inspectRecord(db, 'response', row.id.toString()));
  for (const row of drafts)
    records.push(await inspectRecord(db, 'draft', row.id.toString()));
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    mode: 'READ_ONLY_REVIEW',
    preservation_counts: {
      accounts,
      student_profiles: profiles,
      evaluations,
      submissions,
      drafts: savedDrafts,
    },
    unversioned_submission_count: responses.length,
    unversioned_draft_count: drafts.length,
    candidate_count: records.filter((record) => record.candidate_version_id)
      .length,
    ambiguous_count: records.filter((record) => !record.candidate_version_id)
      .length,
    verified_count: 0,
    records,
    missing_official_metadata: { semesters, offerings, academic_years: years },
    instruction:
      'A candidate inferred from current question IDs is not verified historical provenance. Supply independently verified school evidence before approving any record. No metadata has been changed.',
  };
}

function validateManifest(manifest) {
  requireCondition(
    manifest.schema_version === 1 &&
      Array.isArray(manifest.records) &&
      manifest.records.length > 0,
    'Invalid or empty manifest.',
  );
  const seen = new Set();
  for (const record of manifest.records) {
    requireCondition(
      ['response', 'draft'].includes(record.kind) &&
        positiveId(record.id) &&
        positiveId(record.verified_version_id),
      'Invalid record identifiers.',
    );
    requireCondition(
      typeof record.fingerprint === 'string' &&
        /^[a-f0-9]{64}$/.test(record.fingerprint),
      'Missing review fingerprint.',
    );
    requireCondition(
      typeof record.verified_by === 'string' &&
        record.verified_by.trim().length > 0 &&
        typeof record.evidence_reference === 'string' &&
        record.evidence_reference.trim().length > 0,
      'Every record needs a named verifier and independent evidence reference.',
    );
    const key = `${record.kind}:${record.id}`;
    requireCondition(!seen.has(key), 'Duplicate record in manifest.');
    seen.add(key);
  }
}

/** Atomic and idempotent. Only explicitly verified, structurally matching records may move. */
async function reconcile(
  db,
  manifest,
  { rollback = false, dryRun = true } = {},
) {
  validateManifest(manifest);
  const results = [];
  for (const requested of manifest.records) {
    const current = await inspectRecord(db, requested.kind, requested.id);
    requireCondition(
      current.fingerprint === requested.fingerprint,
      `Record ${requested.kind}:${requested.id} changed after review.`,
    );
    requireCondition(
      current.candidate_version_id === requested.verified_version_id,
      `Verified version does not match original questions/options for ${requested.kind}:${requested.id}.`,
    );
    const desired = rollback ? null : requested.verified_version_id;
    const expected = rollback ? requested.verified_version_id : null;
    if (current.current_version_id === desired) {
      results.push({
        kind: requested.kind,
        id: requested.id,
        outcome: 'ALREADY_APPLIED',
      });
      continue;
    }
    requireCondition(
      current.current_version_id === expected,
      `Refusing to overwrite another saved version for ${requested.kind}:${requested.id}.`,
    );
    if (!dryRun) {
      const model =
        requested.kind === 'response' ? db.responses : db.assessment_drafts;
      // Version metadata only. Do not change timestamps, answers, identities or participants.
      const changed = await model.updateMany({
        where: {
          id: BigInt(requested.id),
          survey_version_id: expected === null ? null : BigInt(expected),
        },
        data: { survey_version_id: desired === null ? null : BigInt(desired) },
      });
      requireCondition(
        changed.count === 1,
        `Concurrent change for ${requested.kind}:${requested.id}; all writes must roll back.`,
      );
    }
    results.push({
      kind: requested.kind,
      id: requested.id,
      outcome: dryRun ? 'WOULD_CHANGE' : 'CHANGED',
    });
  }
  return results;
}

function checkBackup(filename) {
  requireCondition(
    filename &&
      fs.statSync(filename).isFile() &&
      fs.statSync(filename).size > 100,
    'A nonempty PostgreSQL backup file is required.',
  );
  const fd = fs.openSync(filename, 'r');
  const header = Buffer.alloc(4_096);
  try {
    fs.readSync(fd, header, 0, header.length, 0);
  } finally {
    fs.closeSync(fd);
  }
  const text = header.toString('utf8');
  requireCondition(
    text.startsWith('PGDMP') || text.includes('PostgreSQL database dump'),
    'Unrecognized PostgreSQL backup format.',
  );
  // A header is only a guard. The operator must have tested restore and verified coverage.
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'review';
  requireCondition(
    ['review', 'dry-run', 'apply', 'rollback'].includes(mode),
    'Use review, dry-run, apply or rollback.',
  );
  const option = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  if (args.includes('--test')) require('../test/run-e2e.cjs');
  else {
    const file = path.resolve(__dirname, '..', '.env');
    if (fs.existsSync(file)) {
      const config = parseEnv(fs.readFileSync(file, 'utf8'));
      for (const [key, value] of Object.entries(config))
        if (process.env[key] === undefined) process.env[key] = value;
    }
  }
  requireCondition(process.env.DATABASE_URL, 'DATABASE_URL is required.');
  const url = new URL(process.env.DATABASE_URL);
  const databaseFingerprint = hash({
    host: url.hostname,
    port: url.port,
    database: url.pathname,
    schema: url.searchParams.get('schema') || 'public',
  });
  const prisma = new PrismaClient();
  try {
    if (mode === 'review') {
      const report = await prisma.$transaction((tx) => review(tx), {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 60_000,
      });
      const file =
        option('--output') ||
        path.resolve('.tmp', 'historical-version-review.json');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        stringify({ ...report, database_fingerprint: databaseFingerprint }),
        { flag: 'wx' },
      );
      console.log(
        `Read-only review: ${report.unversioned_submission_count} unversioned submissions, ${report.unversioned_draft_count} unversioned drafts; no backfill performed.`,
      );
      return;
    }
    requireCondition(option('--manifest'), '--manifest is required.');
    const manifest = JSON.parse(fs.readFileSync(option('--manifest'), 'utf8'));
    requireCondition(
      manifest.database_fingerprint === databaseFingerprint,
      'Manifest belongs to a different database.',
    );
    validateManifest(manifest);
    const dryRun = mode === 'dry-run';
    const rollback = mode === 'rollback';
    let journalFile;
    if (!dryRun) {
      checkBackup(option('--backup'));
      journalFile = option('--journal');
      requireCondition(
        journalFile,
        '--journal is required for apply or rollback.',
      );
      // Persist rollback intent BEFORE committing. A crash leaves an idempotent recovery manifest.
      fs.writeFileSync(
        journalFile,
        stringify({
          ...manifest,
          direction: mode,
          prepared_at: new Date().toISOString(),
          instruction:
            'Use these exact verified records for rollback. If execution was interrupted, dry-run before retrying.',
        }),
        { flag: 'wx' },
      );
    }
    const results = await prisma.$transaction(
      (tx) => reconcile(tx, manifest, { dryRun, rollback }),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 60_000,
      },
    );
    console.log(
      stringify({
        mode,
        changed: results.filter((row) => row.outcome === 'CHANGED').length,
        would_change: results.filter((row) => row.outcome === 'WOULD_CHANGE')
          .length,
        already_applied: results.filter(
          (row) => row.outcome === 'ALREADY_APPLIED',
        ).length,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { inspectRecord, review, validateManifest, reconcile };
if (require.main === module)
  main().catch((error) => {
    if (error?.code === 'P2034' || error?.code === 'P2028')
      console.error(
        'Atomic operation conflicted; no partial writes. Review and retry.',
      );
    else
      console.error(
        error instanceof Prisma.PrismaClientKnownRequestError
          ? `Database operation failed (${error.code}); review before retrying.`
          : error.message,
      );
    process.exitCode = 1;
  });
