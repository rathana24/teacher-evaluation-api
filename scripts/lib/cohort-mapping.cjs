const { createHash } = require('node:crypto');
const { Prisma } = require('@prisma/client');

const tables = [
  ...new Set([
    ...Prisma.dmmf.datamodel.models.map((row) => row.dbName || row.name),
    '_prisma_migrations',
    'cohort_mapping_operations',
    'student_cohort_assignment_events',
    'cohort_mapping_receipts',
  ]),
].sort();
const idPattern = /^[1-9]\d{0,18}$/;
const uuidPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const shaPattern = /^[a-f0-9]{64}$/;
const keyPattern = /^[A-Za-z][A-Za-z0-9_-]{0,49}$/;
class MappingError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
const fail = (code, message) => {
  throw new MappingError(code, message);
};
const invalid = () =>
  fail(
    'INVALID_MANIFEST',
    'Supply a complete, bounded reviewed mapping manifest.',
  );
function canonical(value) {
  if (typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const digest = (value) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
const object = (row, keys) => {
  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row) ||
    Object.keys(row).sort().join('|') !== [...keys].sort().join('|')
  )
    invalid();
};
const id = (value) => {
  if (
    typeof value !== 'string' ||
    !idPattern.test(value) ||
    BigInt(value) > 9223372036854775807n
  )
    invalid();
};
const sha = (value) => {
  if (typeof value !== 'string' || !shaPattern.test(value)) invalid();
};
const array = (value, limit) => {
  if (!Array.isArray(value) || value.length > limit) invalid();
};
const date = (value) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    invalid();
};

function adapterSchema(schema) {
  return (
    schema === 'public' ||
    /^cohort_import_test_[a-f0-9]{32}$/.test(schema) ||
    /^cohort_test_[a-f0-9]{32}$/.test(schema)
  );
}
function validateManifest(input, adapter = false) {
  let size;
  try {
    size = Buffer.byteLength(JSON.stringify(input));
  } catch {
    invalid();
  }
  if (size > 5 * 1024 * 1024) invalid();
  object(input, [
    'schema_version',
    'operation_id',
    'database',
    'schema',
    'source_fingerprint',
    'reviewer_id',
    'reviewed_at',
    'expires_at',
    'reason',
    'cohorts',
    'profiles',
    'records',
    'scopes',
    'frozen_targets',
  ]);
  if (
    input.schema_version !== 1 ||
    !uuidPattern.test(input.operation_id) ||
    input.database !== 'teacher_evaluation_test' ||
    !(adapter
      ? adapterSchema(input.schema)
      : /^cohort_test_[a-f0-9]{32}$/.test(input.schema))
  )
    invalid();
  sha(input.source_fingerprint);
  id(input.reviewer_id);
  date(input.reviewed_at);
  date(input.expires_at);
  if (
    Date.parse(input.expires_at) <= Date.parse(input.reviewed_at) ||
    Date.parse(input.expires_at) - Date.parse(input.reviewed_at) >
      30 * 60 * 1000 ||
    typeof input.reason !== 'string' ||
    !input.reason.trim() ||
    input.reason.length > 2000
  )
    invalid();
  array(input.cohorts, 500);
  array(input.profiles, 5000);
  array(input.records, 10000);
  array(input.scopes, 10000);
  array(input.frozen_targets, 20000);
  for (const row of input.cohorts) {
    object(row, ['id', 'expected_sha256', 'disposition', 'destinations']);
    id(row.id);
    sha(row.expected_sha256);
    array(row.destinations, 50);
    if (
      ![
        'KEEP_ID_AS_CANONICAL',
        'SPLIT_KEEP_LEGACY_REFERENCE',
        'RETAIN_UNRESOLVED',
        'KEEP_EXISTING_CANONICAL',
      ].includes(row.disposition)
    )
      invalid();
    for (const dest of row.destinations) {
      object(dest, [
        'key',
        'major_id',
        'generation_number',
        'entry_academic_year_id',
        'starting_year_level',
        'existing_generation_id',
      ]);
      if (
        typeof dest.key !== 'string' ||
        !keyPattern.test(dest.key) ||
        !Number.isInteger(dest.generation_number) ||
        dest.generation_number < 1 ||
        dest.generation_number > 2147483647 ||
        !Number.isInteger(dest.starting_year_level) ||
        dest.starting_year_level < 1 ||
        dest.starting_year_level > 5
      )
        invalid();
      id(dest.major_id);
      id(dest.entry_academic_year_id);
      if (dest.existing_generation_id !== null) id(dest.existing_generation_id);
    }
  }
  for (const rows of [input.profiles, input.records, input.scopes])
    for (const row of rows) {
      object(row, ['id', 'expected_sha256', 'destination_key']);
      id(row.id);
      sha(row.expected_sha256);
      if (
        row.destination_key !== null &&
        (typeof row.destination_key !== 'string' ||
          !keyPattern.test(row.destination_key))
      )
        invalid();
    }
  for (const row of input.frozen_targets) {
    object(row, ['id', 'expected_sha256', 'disposition']);
    sha(row.expected_sha256);
    if (
      typeof row.id !== 'string' ||
      !/^(?:G:[1-9]\d{0,18}:[1-9]\d{0,18}|R:[1-9]\d{0,18})$/.test(row.id) ||
      row.disposition !== 'KEEP_ORIGINAL_REFERENCE'
    )
      invalid();
  }
  return structuredClone(input);
}

async function context(tx, adapter = false) {
  const [ctx] =
    await tx.$queryRaw`SELECT current_database() AS database,current_schema() AS schema`;
  if (
    ctx.database !== 'teacher_evaluation_test' ||
    !(adapter
      ? adapterSchema(ctx.schema)
      : /^cohort_test_[a-f0-9]{32}$/.test(ctx.schema))
  )
    fail(
      'ISOLATED_FIXTURE_REQUIRED',
      'Mapping is restricted to an owned isolated cohort fixture.',
    );
  return ctx;
}
async function authorize(tx, principal) {
  if (
    !principal ||
    typeof principal.id !== 'string' ||
    !idPattern.test(principal.id) ||
    BigInt(principal.id) > 9223372036854775807n ||
    !Number.isInteger(principal.auth_version) ||
    principal.auth_version < 0
  )
    fail('FORBIDDEN', 'A current authenticated administrator is required.');
  const [actor] =
    await tx.$queryRaw`SELECT id::text,role,status,auth_version,full_name FROM users WHERE id=${BigInt(principal.id)}`;
  if (
    !actor ||
    actor.role !== 'ADMIN' ||
    actor.status !== 'ACTIVE' ||
    actor.auth_version !== principal.auth_version
  )
    fail('FORBIDDEN', 'A current authenticated administrator is required.');
  return actor;
}
const sqlHash = Prisma.raw(
  "encode(sha256(convert_to(to_jsonb(t)::text,'UTF8')),'hex')",
);
async function state(tx, adapter = false) {
  const hashes = {};
  for (const name of tables)
    hashes[name] = await tx.$queryRaw(
      Prisma.sql`SELECT ${sqlHash} AS hash FROM ${Prisma.raw(`"${name}"`)} t ORDER BY 1`,
    );
  const columns =
    await tx.$queryRaw`SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema=current_schema() ORDER BY table_name,ordinal_position`;
  const constraints =
    await tx.$queryRaw`SELECT c.conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname=current_schema() ORDER BY c.conname,c.oid`;
  const indexes =
    await tx.$queryRaw`SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() ORDER BY indexname`;
  const functions =
    await tx.$queryRaw`SELECT p.proname,pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname=current_schema() ORDER BY p.proname,p.oid`;
  const triggers =
    await tx.$queryRaw`SELECT t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON c.relnamespace=n.oid WHERE n.nspname=current_schema() AND NOT t.tgisinternal ORDER BY t.tgname,t.oid`;
  if (
    [...new Set(columns.map((row) => row.table_name))].sort().join('|') !==
    tables.join('|')
  )
    fail(
      'MAPPING_SCHEMA_MISMATCH',
      'The candidate mapping schema does not match this executor.',
    );
  const metadata = { columns, constraints, indexes, functions, triggers };
  if (
    adapter &&
    !constraints.some(
      (row) =>
        row.conname === 'reviewed_operations_kind_check' &&
        row.definition.includes("'COHORT_MAPPING'"),
    )
  )
    fail(
      'MAPPING_MIGRATION_REQUIRED',
      'Apply the reviewed cohort-mapping migration in the isolated test environment before enabling this workflow.',
    );
  return {
    hashes,
    schema_fingerprint: digest(metadata),
    // Review storage is not school data. Exclude it from adapter staleness so
    // persisting a preview cannot invalidate that same preview.
    source_fingerprint: digest({
      hashes: adapter
        ? Object.fromEntries(
            Object.entries(hashes).filter(
              ([name]) => name !== 'reviewed_operations',
            ),
          )
        : hashes,
      metadata,
    }),
  };
}
async function inventory(tx) {
  const cohorts = await tx.$queryRaw(
    Prisma.sql`SELECT id::text,name,entry_academic_year_id::text,starting_year_level,major_id::text,generation_number,ownership_state,mapping_operation_id::text,${sqlHash} AS expected_sha256 FROM student_generations t ORDER BY id`,
  );
  const profiles = await tx.$queryRaw(
    Prisma.sql`SELECT id::text,generation_id::text,${sqlHash} AS expected_sha256 FROM students t ORDER BY id`,
  );
  const records = await tx.$queryRaw(
    Prisma.sql`SELECT id::text,student_id::text,academic_year_id::text,major_id::text,generation_id::text,${sqlHash} AS expected_sha256 FROM student_academic_records t ORDER BY id`,
  );
  const scopes = await tx.$queryRaw(
    Prisma.sql`SELECT id::text,generation_id::text,major_id::text,academic_year_id::text,${sqlHash} AS expected_sha256 FROM course_offering_group_scopes t ORDER BY id`,
  );
  const generations = await tx.$queryRaw(
    Prisma.sql`SELECT 'G:'||evaluation_id::text||':'||generation_id::text AS id,generation_id::text,${sqlHash} AS expected_sha256 FROM evaluation_generation_targets t ORDER BY evaluation_id,generation_id`,
  );
  const groups = await tx.$queryRaw(
    Prisma.sql`SELECT 'R:'||id::text AS id,generation_id::text,major_id::text,academic_year_id::text,${sqlHash} AS expected_sha256 FROM evaluation_group_targets t ORDER BY id`,
  );
  const years =
    await tx.$queryRaw`SELECT id::text,start_year FROM academic_years ORDER BY id`;
  const majors = await tx.$queryRaw`SELECT id::text FROM majors ORDER BY id`;
  return {
    cohorts,
    profiles,
    records,
    scopes,
    frozen_targets: [...generations, ...groups],
    years,
    majors,
  };
}
function bindRows(proposed, actual) {
  const byId = new Map(actual.map((row) => [row.id, row]));
  if (
    proposed.length !== actual.length ||
    new Set(proposed.map((row) => row.id)).size !== proposed.length
  )
    fail(
      'INCOMPLETE_MAPPING',
      'Every source reference requires exactly one reviewed disposition.',
    );
  for (const row of proposed)
    if (byId.get(row.id)?.expected_sha256 !== row.expected_sha256)
      fail(
        'MAPPING_STALE',
        'A reviewed source reference has changed or is unavailable.',
      );
  return byId;
}
function plan(manifest, data, adapter = false) {
  const existing = {};
  for (const key of [
    'cohorts',
    'profiles',
    'records',
    'scopes',
    'frozen_targets',
  ])
    existing[key] = bindRows(manifest[key], data[key]);
  const years = new Map(data.years.map((row) => [row.id, row.start_year]));
  const majors = new Set(data.majors.map((row) => row.id));
  const destinations = new Map();
  const pairs = new Set();
  for (const cohort of manifest.cohorts) {
    const old = existing.cohorts.get(cohort.id);
    if (
      (old.ownership_state === 'MAJOR_SCOPED') !==
      (cohort.disposition === 'KEEP_EXISTING_CANONICAL')
    )
      fail(
        'INVALID_MAPPING',
        'Canonical and legacy dispositions must match stored ownership.',
      );
    if (
      cohort.disposition === 'RETAIN_UNRESOLVED'
        ? cohort.destinations.length !== 0
        : cohort.disposition === 'SPLIT_KEEP_LEGACY_REFERENCE'
          ? cohort.destinations.length < 1
          : cohort.disposition === 'KEEP_EXISTING_CANONICAL'
            ? cohort.destinations.length > 1
            : cohort.destinations.length !== 1
    )
      fail(
        'INVALID_MAPPING',
        'Supply explicit destinations for each reviewed cohort disposition.',
      );
    for (const dest of cohort.destinations) {
      const pair = `${dest.major_id}:${dest.generation_number}`;
      if (destinations.has(dest.key) || pairs.has(pair))
        fail(
          'DESTINATION_CONFLICT',
          'Destination keys and major/number pairs must be distinct; cohorts are never merged automatically.',
        );
      if (
        !majors.has(dest.major_id) ||
        years.get(dest.entry_academic_year_id) == null
      )
        fail(
          'INVALID_MAPPING',
          'Destination major and structured entry year must exist.',
        );
      let target = null;
      if (
        cohort.disposition === 'KEEP_ID_AS_CANONICAL' ||
        cohort.disposition === 'KEEP_EXISTING_CANONICAL'
      ) {
        if (
          dest.existing_generation_id !== old.id ||
          dest.entry_academic_year_id !== old.entry_academic_year_id ||
          dest.starting_year_level !== old.starting_year_level
        )
          fail(
            'INVALID_MAPPING',
            'Preserving a cohort ID must preserve its entry metadata.',
          );
        target = old;
      } else if (dest.existing_generation_id !== null) {
        target = existing.cohorts.get(dest.existing_generation_id);
        if (!target || target.ownership_state !== 'MAJOR_SCOPED')
          fail(
            'INVALID_MAPPING',
            'An explicitly reused destination must already be canonical.',
          );
      }
      if (
        target?.ownership_state === 'MAJOR_SCOPED' &&
        (target.major_id !== dest.major_id ||
          target.generation_number !== dest.generation_number ||
          target.entry_academic_year_id !== dest.entry_academic_year_id ||
          target.starting_year_level !== dest.starting_year_level)
      )
        fail(
          'DESTINATION_CONFLICT',
          'An existing destination has different ownership or entry metadata.',
        );
      const collision = data.cohorts.find(
        (row) =>
          row.major_id === dest.major_id &&
          row.generation_number === dest.generation_number,
      );
      if (collision && collision.id !== target?.id)
        fail(
          'DESTINATION_CONFLICT',
          'The destination major/number already belongs to another cohort.',
        );
      pairs.add(pair);
      destinations.set(dest.key, {
        ...dest,
        source_id: old.id,
        keep_id: cohort.disposition === 'KEEP_ID_AS_CANONICAL',
        id: target?.id || null,
      });
    }
  }
  const mapped = {};
  for (const kind of ['profiles', 'records', 'scopes']) {
    mapped[kind] = new Map();
    for (const row of manifest[kind]) {
      const old = existing[kind].get(row.id);
      const dest =
        row.destination_key === null
          ? null
          : destinations.get(row.destination_key);
      if (row.destination_key !== null && !dest)
        fail(
          'INVALID_MAPPING',
          'A mapped reference names an unavailable destination.',
        );
      const source =
        kind === 'records'
          ? existing.profiles.get(old.student_id)?.generation_id
          : old.generation_id;
      if (dest && source !== dest.source_id && !(adapter && kind === 'records'))
        fail(
          'INVALID_MAPPING',
          'Each reference must belong to its explicitly reviewed source cohort.',
        );
      if (dest && kind !== 'profiles') {
        if (
          dest.major_id !== old.major_id ||
          years.get(old.academic_year_id) == null ||
          years.get(dest.entry_academic_year_id) >
            years.get(old.academic_year_id)
        )
          fail(
            'INVALID_MAPPING',
            'The destination must match the recorded major and precede its structured academic year.',
          );
        if (kind === 'records' && old.generation_id !== null)
          fail(
            'INVALID_MAPPING',
            'Resolved historical cohort links cannot be rewritten.',
          );
      }
      mapped[kind].set(row.id, dest);
    }
  }
  for (const [profileId, dest] of mapped.profiles)
    if (dest) {
      const records = data.records.filter(
        (row) => row.student_id === profileId,
      );
      if (
        !records.length ||
        records.some((row) => years.get(row.academic_year_id) == null)
      )
        fail(
          'INVALID_MAPPING',
          'A profile pointer requires unambiguous reviewed placement history.',
        );
      records.sort(
        (a, b) => years.get(b.academic_year_id) - years.get(a.academic_year_id),
      );
      if (
        records.length > 1 &&
        years.get(records[0].academic_year_id) ===
          years.get(records[1].academic_year_id)
      )
        fail(
          'INVALID_MAPPING',
          'The latest placement chronology is ambiguous.',
        );
      const latest = records[0];
      const target = mapped.records.get(latest.id);
      if (
        latest.major_id !== dest.major_id ||
        (target ? target.key !== dest.key : latest.generation_id !== dest.id)
      )
        fail(
          'INVALID_MAPPING',
          'A profile pointer must match its latest reviewed yearly cohort.',
        );
    }
  if (adapter) {
    for (const dest of destinations.values())
      if (dest.keep_id) {
        if (
          data.frozen_targets.some(
            (row) => row.generation_id === dest.source_id,
          )
        )
          fail(
            'INVALID_MAPPING',
            'Frozen legacy references require a split that retains the original cohort identity.',
          );
        for (const scope of data.scopes)
          if (
            scope.generation_id === dest.source_id &&
            scope.major_id !== dest.major_id &&
            !mapped.scopes.get(scope.id)
          )
            fail(
              'INVALID_MAPPING',
              'Canonicalization cannot leave an incompatible legacy offering scope.',
            );
      }
    for (const [scopeId, dest] of mapped.scopes) {
      const old = existing.scopes.get(scopeId);
      if (
        dest &&
        existing.cohorts.get(old.generation_id)?.ownership_state ===
          'MAJOR_SCOPED' &&
        old.generation_id !== dest.id
      )
        fail(
          'INVALID_MAPPING',
          'Canonical offering scopes cannot be moved through legacy mapping.',
        );
    }
    for (const profile of data.profiles) {
      const profileDest = mapped.profiles.get(profile.id);
      if (
        profileDest &&
        existing.cohorts.get(profile.generation_id)?.ownership_state ===
          'MAJOR_SCOPED' &&
        profileDest.id !== profile.generation_id
      )
        fail(
          'INVALID_MAPPING',
          'Canonical profile changes require a yearly transfer, not legacy mapping.',
        );
      const records = data.records.filter(
        (row) => row.student_id === profile.id,
      );
      if (!records.some((row) => mapped.records.get(row.id))) continue;
      if (
        records.some((row) => years.get(row.academic_year_id) == null) ||
        new Set(records.map((row) => years.get(row.academic_year_id))).size !==
          records.length
      )
        fail(
          'INVALID_MAPPING',
          'Affected student history needs unambiguous structured yearly chronology.',
        );
      records.sort(
        (a, b) => years.get(b.academic_year_id) - years.get(a.academic_year_id),
      );
      const latest = records[0],
        latestDest = mapped.records.get(latest.id);
      const latestId = latestDest?.id || latest.generation_id;
      const pointerId = profileDest?.id || profile.generation_id;
      // New split destinations have no ID yet: compare their reviewed keys.
      if (
        latestDest && profileDest
          ? latestDest.key !== profileDest.key
          : !latestId || latestId !== pointerId
      )
        fail(
          'INVALID_MAPPING',
          'Affected profile must agree with its latest reviewed yearly cohort.',
        );
    }
  }
  return { destinations, mapped };
}

async function protectedState(tx) {
  const result = {};
  for (const name of [
    'student_generations',
    'students',
    'student_academic_records',
    'course_offering_group_scopes',
  ]) {
    const remove =
      name === 'student_generations'
        ? [
            'ownership_state',
            'major_id',
            'generation_number',
            'mapping_operation_id',
          ]
        : ['generation_id'];
    result[name] = await tx.$queryRaw(
      Prisma.sql`SELECT id::text,encode(sha256(convert_to((to_jsonb(t)-${remove}::text[])::text,'UTF8')),'hex') AS hash FROM ${Prisma.raw(`"${name}"`)} t ORDER BY id`,
    );
  }
  return result;
}
async function verifyPreservation(
  tx,
  before,
  protectedBefore,
  data,
  proposed,
  manifest,
  actor,
  receipt,
  requestHash,
) {
  const after = await state(tx);
  if (after.schema_fingerprint !== before.schema_fingerprint)
    fail('PRESERVATION_FAILED', 'Schema changed during mapping.');
  for (const name of tables)
    if (
      ![
        'student_generations',
        'students',
        'student_academic_records',
        'course_offering_group_scopes',
        'cohort_mapping_operations',
        'student_cohort_assignment_events',
        'cohort_mapping_receipts',
      ].includes(name)
    ) {
      if (digest(before.hashes[name]) !== digest(after.hashes[name]))
        fail(
          'PRESERVATION_FAILED',
          'An unrelated or frozen historical table changed.',
        );
    }
  const currentProtected = await protectedState(tx);
  for (const [name, rows] of Object.entries(protectedBefore)) {
    const current = currentProtected[name].filter((row) =>
      rows.some((old) => old.id === row.id),
    );
    if (digest(rows) !== digest(current))
      fail(
        'PRESERVATION_FAILED',
        'Original academic or identity values changed.',
      );
  }
  const current = await inventory(tx);
  for (const old of data.cohorts) {
    const changed = [...proposed.destinations.values()].find(
      (row) => row.source_id === old.id && row.keep_id,
    );
    const actual = current.cohorts.find((row) => row.id === old.id);
    if (
      !actual ||
      actual.ownership_state !==
        (changed ? 'MAJOR_SCOPED' : old.ownership_state) ||
      actual.major_id !== (changed?.major_id || old.major_id) ||
      actual.generation_number !==
        (changed?.generation_number || old.generation_number) ||
      actual.mapping_operation_id !==
        (changed ? manifest.operation_id : old.mapping_operation_id)
    )
      fail(
        'PRESERVATION_FAILED',
        'A cohort differs from its approved disposition.',
      );
  }
  for (const dest of proposed.destinations.values()) {
    const actual = current.cohorts.find((row) => row.id === dest.id);
    if (
      !actual ||
      actual.ownership_state !== 'MAJOR_SCOPED' ||
      actual.major_id !== dest.major_id ||
      actual.generation_number !== dest.generation_number ||
      actual.entry_academic_year_id !== dest.entry_academic_year_id ||
      actual.starting_year_level !== dest.starting_year_level ||
      ((dest.created || dest.keep_id) &&
        actual.mapping_operation_id !== manifest.operation_id)
    )
      fail(
        'PRESERVATION_FAILED',
        'A destination differs from its approved identity.',
      );
  }
  for (const kind of ['profiles', 'records', 'scopes'])
    for (const old of data[kind]) {
      const row = current[kind].find((value) => value.id === old.id);
      const expected =
        proposed.mapped[kind].get(old.id)?.id || old.generation_id;
      if (!row || row.generation_id !== expected)
        fail(
          'PRESERVATION_FAILED',
          'A reference differs from its approved destination.',
        );
    }
  if (
    current.profiles.length !== data.profiles.length ||
    current.records.length !== data.records.length ||
    current.scopes.length !== data.scopes.length ||
    current.cohorts.length !==
      data.cohorts.length +
        [...proposed.destinations.values()].filter((row) => row.created).length
  )
    fail(
      'PRESERVATION_FAILED',
      'Unexpected academic rows were added or removed.',
    );
  for (const name of [
    'cohort_mapping_operations',
    'student_cohort_assignment_events',
    'cohort_mapping_receipts',
  ]) {
    const expectedAdded =
      name === 'cohort_mapping_operations'
        ? 1
        : name === 'student_cohort_assignment_events'
          ? [...proposed.mapped.records.values()].filter(Boolean).length
          : 1;
    const remaining = after.hashes[name].map((row) => row.hash);
    for (const row of before.hashes[name]) {
      const index = remaining.indexOf(row.hash);
      if (index < 0)
        fail('PRESERVATION_FAILED', 'Prior operation evidence changed.');
      remaining.splice(index, 1);
    }
    if (remaining.length !== expectedAdded)
      fail('PRESERVATION_FAILED', 'Unexpected operation evidence was written.');
  }
  const [stored] =
    await tx.$queryRaw`SELECT actor_id::text,request_fingerprint,receipt_json FROM cohort_mapping_receipts WHERE operation_id=${manifest.operation_id}::uuid`;
  const [operation] =
    await tx.$queryRaw`SELECT manifest_sha256,source_fingerprint,reviewer_label,manifest FROM cohort_mapping_operations WHERE id=${manifest.operation_id}::uuid`;
  const events =
    await tx.$queryRaw`SELECT academic_record_id::text,action FROM student_cohort_assignment_events WHERE mapping_operation_id=${manifest.operation_id}::uuid ORDER BY student_cohort_assignment_events.academic_record_id`;
  const expectedIds = [...proposed.mapped.records]
    .filter(([, dest]) => dest)
    .map(([id]) => id)
    .sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
  if (
    !stored ||
    stored.actor_id !== actor.id ||
    stored.request_fingerprint !== requestHash ||
    digest(stored.receipt_json) !== digest(receipt) ||
    !operation ||
    operation.manifest_sha256 !== requestHash ||
    operation.source_fingerprint !== manifest.source_fingerprint ||
    operation.reviewer_label !== actor.full_name ||
    digest(operation.manifest) !== requestHash ||
    digest(events.map((row) => row.academic_record_id)) !==
      digest(expectedIds) ||
    events.some((row) => row.action !== 'MIGRATION')
  )
    fail(
      'PRESERVATION_FAILED',
      'Mapping evidence or receipt differs from the approved operation.',
    );
}
function safeError(error) {
  if (error instanceof MappingError) return error;
  const code = error?.meta?.code || error?.code;
  if (['23505', 'P2002'].includes(code))
    return new MappingError(
      'DESTINATION_CONFLICT',
      'A mapping destination already exists.',
    );
  if (['55P03', '40001', '40P01', 'P2034'].includes(code))
    return new MappingError(
      'MAPPING_BUSY',
      'The mapping was not applied; retry the unchanged operation.',
    );
  return new MappingError(
    'MAPPING_FAILED',
    'The mapping failed and its transaction was rolled back.',
  );
}
async function inspectMapping(db, principal, adapter = false) {
  try {
    return await db.$transaction(
      async (tx) => {
        if (!adapter) await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const ctx = await context(tx, adapter);
        await authorize(tx, principal);
        const snapshot = await state(tx, adapter);
        const data = await inventory(tx);
        return {
          ...ctx,
          source_fingerprint: snapshot.source_fingerprint,
          ...data,
        };
      },
      { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 30000 },
    );
  } catch (error) {
    throw safeError(error);
  }
}

// Library for a trusted authenticated adapter, not a public route or normal DB CLI.
async function applyMapping(
  db,
  principal,
  input,
  { clock = Date.now, adapter = false } = {},
) {
  try {
    const manifest = validateManifest(input, adapter);
    const requestHash = digest(manifest);
    return await db.$transaction(
      async (tx) => {
        const ctx = await context(tx, adapter);
        if (
          ctx.database !== manifest.database ||
          ctx.schema !== manifest.schema
        )
          fail(
            'TARGET_MISMATCH',
            'The reviewed mapping belongs to another database context.',
          );
        await tx.$executeRaw`SET LOCAL lock_timeout='5s'`;
        await tx.$executeRaw(
          Prisma.sql`LOCK TABLE ${Prisma.join(tables.map((name) => Prisma.raw(`"${ctx.schema}"."${name}"`)))} IN SHARE ROW EXCLUSIVE MODE`,
        );
        const actor = await authorize(tx, principal);
        const [previous] =
          await tx.$queryRaw`SELECT actor_id::text,request_fingerprint,receipt_json FROM cohort_mapping_receipts WHERE operation_id=${manifest.operation_id}::uuid`;
        if (previous) {
          if (previous.actor_id !== actor.id)
            fail(
              'FORBIDDEN',
              'This operation belongs to another administrator.',
            );
          if (previous.request_fingerprint !== requestHash)
            fail(
              'OPERATION_REUSED',
              'The operation ID is already bound to different reviewed input.',
            );
          return previous.receipt_json;
        }
        if (manifest.reviewer_id !== actor.id)
          fail(
            'FORBIDDEN',
            'The current administrator must be the recorded reviewer.',
          );
        const now = clock();
        if (
          Date.parse(manifest.reviewed_at) > now ||
          Date.parse(manifest.expires_at) <= now
        )
          fail(
            'REVIEW_EXPIRED',
            'Review the mapping again before an uncommitted application.',
          );
        const before = await state(tx, adapter);
        if (before.source_fingerprint !== manifest.source_fingerprint)
          fail(
            'MAPPING_STALE',
            'Database rows or schema changed after review.',
          );
        const data = await inventory(tx);
        const proposed = plan(manifest, data, adapter);
        const protectedBefore = await protectedState(tx);
        await tx.$executeRaw`INSERT INTO cohort_mapping_operations(id,manifest_sha256,source_fingerprint,reviewer_label,reviewed_at,manifest)
        VALUES (${manifest.operation_id}::uuid,${requestHash},${manifest.source_fingerprint},${actor.full_name},${new Date(manifest.reviewed_at)},${JSON.stringify(manifest)}::jsonb)`;
        for (const dest of proposed.destinations.values()) {
          if (dest.keep_id)
            await tx.$executeRaw`UPDATE student_generations SET ownership_state='MAJOR_SCOPED',major_id=${BigInt(dest.major_id)},generation_number=${dest.generation_number},mapping_operation_id=${manifest.operation_id}::uuid WHERE id=${BigInt(dest.id)}`;
          else if (!dest.id) {
            const [row] =
              await tx.$queryRaw`INSERT INTO student_generations(name,entry_academic_year_id,starting_year_level,created_at,updated_at,ownership_state,major_id,generation_number,mapping_operation_id)
            VALUES (${`Gen ${dest.generation_number}`},${BigInt(dest.entry_academic_year_id)},${dest.starting_year_level},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'MAJOR_SCOPED',${BigInt(dest.major_id)},${dest.generation_number},${manifest.operation_id}::uuid) RETURNING id::text`;
            dest.id = row.id;
            dest.created = true;
          }
        }
        for (const [recordId, dest] of proposed.mapped.records)
          if (dest) {
            const row = data.records.find((value) => value.id === recordId);
            await tx.$executeRaw`UPDATE student_academic_records SET generation_id=${BigInt(dest.id)} WHERE id=${BigInt(recordId)}`;
            await tx.$executeRaw`INSERT INTO student_cohort_assignment_events(academic_record_id,student_id,academic_year_id,major_id,generation_id,action,mapping_operation_id)
          VALUES (${BigInt(recordId)},${BigInt(row.student_id)},${BigInt(row.academic_year_id)},${BigInt(row.major_id)},${BigInt(dest.id)},'MIGRATION',${manifest.operation_id}::uuid)`;
          }
        for (const [profileId, dest] of proposed.mapped.profiles)
          if (dest)
            await tx.$executeRaw`UPDATE students SET generation_id=${BigInt(dest.id)} WHERE id=${BigInt(profileId)}`;
        for (const [scopeId, dest] of proposed.mapped.scopes)
          if (dest)
            await tx.$executeRaw`UPDATE course_offering_group_scopes SET generation_id=${BigInt(dest.id)} WHERE id=${BigInt(scopeId)}`;
        await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
        const receipt = {
          schema_version: 1,
          operation_id: manifest.operation_id,
          cohorts: [...proposed.destinations.values()].map((row) => ({
            key: row.key,
            generation_id: row.id,
          })),
          mapped: Object.fromEntries(
            ['profiles', 'records', 'scopes'].map((kind) => [
              kind,
              [...proposed.mapped[kind].values()].filter(Boolean).length,
            ]),
          ),
          retained_unresolved_cohorts: manifest.cohorts.filter(
            (row) =>
              row.disposition === 'RETAIN_UNRESOLVED' ||
              row.disposition === 'SPLIT_KEEP_LEGACY_REFERENCE',
          ).length,
        };
        await tx.$executeRaw`INSERT INTO cohort_mapping_receipts(operation_id,actor_id,request_fingerprint,receipt_json) VALUES (${manifest.operation_id}::uuid,${BigInt(actor.id)},${requestHash},${JSON.stringify(receipt)}::jsonb)`;
        await verifyPreservation(
          tx,
          before,
          protectedBefore,
          data,
          proposed,
          manifest,
          actor,
          receipt,
          requestHash,
        );
        return receipt;
      },
      { isolationLevel: 'ReadCommitted', maxWait: 5000, timeout: 30000 },
    );
  } catch (error) {
    throw safeError(error);
  }
}

async function previewAdapterMapping(db, principal, input) {
  try {
    const manifest = validateManifest(input, true);
    return await db.$transaction(
      async (tx) => {
        const ctx = await context(tx, true);
        if (
          manifest.database !== ctx.database ||
          manifest.schema !== ctx.schema
        )
          fail(
            'TARGET_MISMATCH',
            'The reviewed mapping belongs to another database context.',
          );
        await authorize(tx, principal);
        const snapshot = await state(tx, true);
        if (snapshot.source_fingerprint !== manifest.source_fingerprint)
          fail(
            'MAPPING_STALE',
            'Database rows or schema changed after inspection.',
          );
        const data = await inventory(tx);
        const proposed = plan(manifest, data, true);
        return {
          operation_id: manifest.operation_id,
          source_fingerprint: snapshot.source_fingerprint,
          destinations: [...proposed.destinations.values()].map((row) => ({
            key: row.key,
            source_generation_id: row.source_id,
            generation_id: row.id,
            major_id: row.major_id,
            generation_number: row.generation_number,
            entry_academic_year_id: row.entry_academic_year_id,
            starting_year_level: row.starting_year_level,
          })),
          mapped: Object.fromEntries(
            ['profiles', 'records', 'scopes'].map((kind) => [
              kind,
              [...proposed.mapped[kind].values()].filter(Boolean).length,
            ]),
          ),
          retained_frozen_targets: data.frozen_targets.length,
        };
      },
      { isolationLevel: 'RepeatableRead', maxWait: 5000, timeout: 30000 },
    );
  } catch (error) {
    throw safeError(error);
  }
}

// The HTTP adapter has a separate explicit test-only target policy. Original
// inspectMapping/applyMapping defaults still reject shared public databases.
function isolatedHttpMappingAdapter() {
  return {
    inspect: (db, principal) => inspectMapping(db, principal, true),
    preview: previewAdapterMapping,
    apply: (db, principal, input) =>
      applyMapping(db, principal, input, { adapter: true }),
  };
}
module.exports = {
  MappingError,
  inspectMapping,
  applyMapping,
  isolatedHttpMappingAdapter,
};
