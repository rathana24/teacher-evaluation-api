const { selectedTestDatabase } = require('./test-database.cjs');
const { createHash } = require('node:crypto');
const { Prisma } = require('@prisma/client');

// Suggestions are review evidence only. No function in this module applies mappings.
function generationNumber(value) {
  if (typeof value === 'number')
    return Number.isInteger(value) && value >= 1 && value <= 2147483647
      ? value
      : null;
  if (typeof value !== 'string') return null;
  const match = /^(?:Gen\s+)?([0-9]+)$/i.exec(value.trim());
  if (!match || match[1].length > 100) return null;
  const number = BigInt(match[1]);
  return number >= 1n && number <= 2147483647n ? Number(number) : null;
}

const compareIds = (a, b) =>
  BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0;
const sortedIds = (values) => [...new Set(values.map(String))].sort(compareIds);
function fingerprint(value) {
  return createHash('sha256')
    .update(
      JSON.stringify(value, (_key, entry) =>
        typeof entry === 'bigint' ? String(entry) : entry,
      ),
    )
    .digest('hex');
}

function analyzeGenerations(data) {
  const students = new Map(data.students.map((row) => [String(row.id), row]));
  const rows = [...data.generations]
    .sort((a, b) => compareIds(a.id, b.id))
    .map((generation) => {
      const id = String(generation.id);
      const profiles = data.students.filter(
        (row) => String(row.generation_id) === id,
      );
      // These links are CURRENT profile associations, not proof of the cohort in a past year.
      const records = data.records.filter(
        (row) =>
          String(students.get(String(row.student_id))?.generation_id) === id,
      );
      const scopes = data.scopes.filter(
        (row) => String(row.generation_id) === id,
      );
      const groups = data.groupTargets.filter(
        (row) => String(row.generation_id) === id,
      );
      const targets = data.generationTargets.filter(
        (row) => String(row.generation_id) === id,
      );
      const frozen = [...groups, ...targets];
      const captured = frozen.filter(
        (row) =>
          row.historical_labels != null && row.labels_captured_at != null,
      );
      const historicMajorIds = captured.flatMap((row) => {
        const major = row.historical_labels?.major?.id;
        return typeof major === 'string' && /^[1-9]\d*$/.test(major)
          ? [major]
          : [];
      });
      const observedMajorIds = sortedIds([
        ...records.map((row) => row.major_id),
        ...scopes.map((row) => row.major_id),
        ...groups.map((row) => row.major_id),
        ...historicMajorIds,
      ]);
      const multiMajorProfiles = profiles.filter(
        (profile) =>
          new Set(
            records
              .filter((row) => String(row.student_id) === String(profile.id))
              .map((row) => String(row.major_id)),
          ).size > 1,
      ).length;
      const number = generationNumber(generation.name);
      const issues = [];
      if (number === null) issues.push('UNPARSEABLE_GENERATION_NUMBER');
      if (!observedMajorIds.length) issues.push('NO_MAJOR_EVIDENCE');
      if (observedMajorIds.length > 1) issues.push('MULTIPLE_MAJOR_EVIDENCE');
      if (multiMajorProfiles) issues.push('STUDENT_MULTI_MAJOR_HISTORY');
      if (records.length) issues.push('HISTORICAL_COHORT_NOT_STORED');
      if (records.some((row) => row.progression_action === 'TRANSFER'))
        issues.push('TRANSFER_MAPPING_REQUIRED');
      if (
        profiles.some(
          (profile) =>
            !records.some(
              (row) => String(row.student_id) === String(profile.id),
            ),
        )
      )
        issues.push('PROFILE_WITHOUT_PLACEMENT');
      if (frozen.length) issues.push('FROZEN_REFERENCES_MUST_REMAIN');
      if (captured.length !== frozen.length)
        issues.push('LEGACY_LABELS_UNKNOWN');
      if (
        groups.some(
          (row) =>
            row.historical_labels?.major?.id != null &&
            String(row.historical_labels.major.id) !== String(row.major_id),
        )
      )
        issues.push('CAPTURED_MAJOR_DIFFERS_FROM_REFERENCE');
      return {
        legacy_generation_id: id,
        candidate_generation_number: number,
        entry_academic_year_id: String(generation.entry_academic_year_id),
        starting_year_level: generation.starting_year_level,
        observed_major_ids: observedMajorIds,
        evidence: {
          current_profiles: profiles.length,
          profiles_without_placements: profiles.filter(
            (profile) =>
              !records.some(
                (row) => String(row.student_id) === String(profile.id),
              ),
          ).length,
          records_linked_via_current_profile: records.length,
          multi_major_profile_histories: multiMajorProfiles,
          progression_actions: Object.fromEntries(
            ['NORMAL', 'REPEAT', 'TRANSFER', 'PAUSE', 'RESUME'].map(
              (action) => [
                action,
                records.filter((row) => row.progression_action === action)
                  .length,
              ],
            ),
          ),
          offering_scopes: scopes.length,
          frozen_generation_targets: targets.length,
          frozen_group_targets: groups.length,
          captured_labels: captured.length,
          unknown_labels: frozen.length - captured.length,
        },
        status: 'REVIEW_REQUIRED',
        issues,
      };
    });
  const candidates = new Map();
  for (const row of rows) {
    if (row.candidate_generation_number === null) continue;
    for (const majorId of row.observed_major_ids) {
      const key = `${majorId}:${row.candidate_generation_number}`;
      if (!candidates.has(key)) candidates.set(key, []);
      candidates.get(key).push(row);
    }
  }
  const collisions = [...candidates.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => {
      const [major_id, number] = key.split(':');
      return {
        major_id,
        candidate_generation_number: Number(number),
        legacy_generation_ids: entries.map((row) => row.legacy_generation_id),
        conflicting_entry_metadata:
          new Set(
            entries.map(
              (row) =>
                `${row.entry_academic_year_id}:${row.starting_year_level}`,
            ),
          ).size > 1,
      };
    })
    .sort(
      (a, b) =>
        compareIds(a.major_id, b.major_id) ||
        a.candidate_generation_number - b.candidate_generation_number,
    );
  return {
    schema_version: 1,
    purpose: 'READ_ONLY_REVIEW_NOT_APPROVED_MAPPINGS',
    cohort_contract_implemented: false,
    ownership_inference:
      'NONE; observations do not establish original ownership',
    source_fingerprint: fingerprint(data),
    totals: {
      generations: rows.length,
      profiles: data.students.length,
      academic_records: data.records.length,
      candidate_collisions: collisions.length,
    },
    cohorts: rows,
    candidate_collisions: collisions,
  };
}

function validateTestConfig(config) {
  let url;
  try {
    url = new URL(config.DATABASE_URL);
  } catch {
    throw new Error('Invalid isolated-test configuration.');
  }
  if (
    config.NODE_ENV !== 'test' ||
    config.DB_NAME !== 'teacher_evaluation_test' ||
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    decodeURIComponent(url.pathname.slice(1)) !== 'teacher_evaluation_test' ||
    (url.searchParams.get('schema') || 'public') !== 'public'
  )
    throw new Error(
      'Blocked: preflight requires local teacher_evaluation_test, public schema and NODE_ENV=test.',
    );
  url.pathname = `/${selectedTestDatabase()}`;
  return url.toString();
}

async function inReadOnlySnapshot(db, operation) {
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [context] =
        await tx.$queryRaw`SELECT current_database() AS database, current_schema() AS schema, current_setting('transaction_read_only') AS read_only, current_setting('transaction_isolation') AS isolation`;
      if (
        context.database !== selectedTestDatabase() ||
        context.schema !== 'public' ||
        context.read_only !== 'on' ||
        context.isolation !== 'repeatable read'
      )
        throw new Error('Blocked: unexpected read-only database context.');
      return operation(tx, context);
    },
    { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 30000 },
  );
}

async function collectGenerations(db) {
  return inReadOnlySnapshot(db, async (tx, context) => {
    const data = {
      generations: await tx.student_generations.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          name: true,
          entry_academic_year_id: true,
          starting_year_level: true,
        },
      }),
      students: await tx.students.findMany({
        orderBy: { id: 'asc' },
        select: { id: true, generation_id: true },
      }),
      records: await tx.student_academic_records.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          student_id: true,
          academic_year_id: true,
          major_id: true,
          progression_action: true,
        },
      }),
      scopes: await tx.course_offering_group_scopes.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          generation_id: true,
          major_id: true,
          academic_year_id: true,
        },
      }),
      generationTargets: await tx.evaluation_generation_targets.findMany({
        orderBy: [{ evaluation_id: 'asc' }, { generation_id: 'asc' }],
        select: {
          evaluation_id: true,
          generation_id: true,
          historical_labels: true,
          labels_captured_at: true,
        },
      }),
      groupTargets: await tx.evaluation_group_targets.findMany({
        orderBy: { id: 'asc' },
        select: {
          id: true,
          generation_id: true,
          major_id: true,
          academic_year_id: true,
          historical_labels: true,
          labels_captured_at: true,
        },
      }),
    };
    return { database_context: context, ...analyzeGenerations(data) };
  });
}

// Hash in PostgreSQL; never bring credentials, identities or answer contents into output.
async function databaseFingerprint(db) {
  return inReadOnlySnapshot(db, async (tx) => {
    const tables = [
      ...Prisma.dmmf.datamodel.models.map((row) => row.dbName || row.name),
      '_prisma_migrations',
    ].sort();
    const rows = [];
    for (const table of tables) {
      if (!/^[a-z_]+$/.test(table))
        throw new Error('Unexpected table identifier.');
      const hashes = await tx.$queryRaw(
        Prisma.sql`SELECT md5(to_jsonb(t)::text) AS hash FROM ${Prisma.raw(`public."${table}"`)} t ORDER BY 1`,
      );
      rows.push({ table, count: hashes.length, sha256: fingerprint(hashes) });
    }
    const sequenceNames =
      await tx.$queryRaw`SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename`;
    const sequences = [];
    for (const { sequencename } of sequenceNames) {
      if (!/^[a-z_]+$/.test(sequencename))
        throw new Error('Unexpected sequence identifier.');
      const [state] = await tx.$queryRaw(
        Prisma.sql`SELECT last_value::text, is_called FROM ${Prisma.raw(`public."${sequencename}"`)}`,
      );
      sequences.push({ name: sequencename, ...state });
    }
    return {
      tables: rows,
      sequences,
      sha256: fingerprint({ rows, sequences }),
    };
  });
}

module.exports = {
  generationNumber,
  analyzeGenerations,
  validateTestConfig,
  collectGenerations,
  databaseFingerprint,
  inReadOnlySnapshot,
};
