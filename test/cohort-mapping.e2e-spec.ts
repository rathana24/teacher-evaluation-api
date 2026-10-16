import { Prisma } from '@prisma/client';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { CohortExpansionFixture } from './helpers/cohort-expansion-fixture';

type Principal = { id: string; auth_version: number };
type Ref = { id: string; expected_sha256: string };
type Inventory = {
  database: string;
  schema: string;
  source_fingerprint: string;
  cohorts: Array<
    Ref & {
      ownership_state: string;
      entry_academic_year_id: string;
      starting_year_level: number;
    }
  >;
  profiles: Ref[];
  records: Ref[];
  scopes: Ref[];
  frozen_targets: Ref[];
};
type Destination = {
  key: string;
  major_id: string;
  generation_number: number;
  entry_academic_year_id: string;
  starting_year_level: number;
  existing_generation_id: string | null;
};
type Manifest = {
  schema_version: number;
  operation_id: string;
  database: string;
  schema: string;
  source_fingerprint: string;
  reviewer_id: string;
  reviewed_at: string;
  expires_at: string;
  reason: string;
  cohorts: Array<Ref & { disposition: string; destinations: Destination[] }>;
  profiles: Array<Ref & { destination_key: string | null }>;
  records: Array<Ref & { destination_key: string | null }>;
  scopes: Array<Ref & { destination_key: string | null }>;
  frozen_targets: Array<Ref & { disposition: string }>;
};
type Receipt = {
  schema_version: number;
  operation_id: string;
  cohorts: Array<{ key: string; generation_id: string }>;
  mapped: { profiles: number; records: number; scopes: number };
};
const requireLocal = createRequire(`${process.cwd()}/package.json`);
const {
  inspectMapping,
  applyMapping,
}: {
  inspectMapping(db: object, principal: Principal): Promise<Inventory>;
  applyMapping(
    db: object,
    principal: Principal,
    input: unknown,
    options?: { clock: () => number },
  ): Promise<Receipt>;
} = requireLocal('./scripts/lib/cohort-mapping.cjs');

describe('Reviewed cohort mapping executor (owned schema only)', () => {
  const fixture = new CohortExpansionFixture();
  let db: typeof fixture.db;
  let f: Awaited<ReturnType<typeof seed>>;
  let principal: Principal;
  let savedManifest: Manifest;
  let savedReceipt: Receipt;
  const ref = (row: Ref): Ref => ({
    id: row.id,
    expected_sha256: row.expected_sha256,
  });

  async function seed() {
    const now = new Date();
    const users = [];
    for (const role of [
      'ADMIN',
      'ADMIN',
      'STUDENT',
      'STUDENT',
      'LECTURER',
    ] as const)
      users.push(
        (
          await db.users.create({
            data: {
              full_name: `Synthetic ${role}`,
              role,
              password_hash: 'Not-a-login-account',
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    const department = await db.departments.create({
      data: { code: 'MAP', name: 'Mapping synthetic department' },
    });
    const majors = [];
    for (const code of ['DS', 'FE'])
      majors.push(
        (
          await db.majors.create({
            data: { code, name: code, department_id: department.id },
          })
        ).id,
      );
    const years = [];
    for (const start of [2070, 2071])
      years.push(
        (
          await db.academic_years.create({
            data: { name: `${start}-${start + 1}`, start_year: start },
          })
        ).id,
      );
    const generations = [];
    for (const name of ['Legacy shared', 'Gen 9'])
      generations.push(
        (
          await db.student_generations.create({
            data: {
              name,
              entry_academic_year_id: years[0],
              starting_year_level: 1,
            },
          })
        ).id,
      );
    const profiles = [];
    for (const index of [2, 3])
      profiles.push(
        (
          await db.students.create({
            data: {
              user_id: users[index],
              student_code: `SYN-${index}`,
              ...(index === 3 ? { id: 9007199254740993n } : {}),
              generation_id: generations[0],
              notes: 'PRIVATE mapping note',
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    const records = [];
    for (const index of [0, 1])
      records.push(
        (
          await db.student_academic_records.create({
            data: {
              student_id: profiles[0],
              academic_year_id: years[index],
              major_id: majors[index],
              year_level: 1,
              class_group: 'A',
              progression_action: index ? 'TRANSFER' : 'NORMAL',
              id: index ? 2n : 10n,
            },
          })
        ).id,
      );
    const semester = await db.semesters.create({
      data: {
        semester_name: 'Semester 1',
        semester_number: 1,
        academic_year_id: years[0],
        created_at: now,
        updated_at: now,
      },
    });
    const course = await db.courses.create({
      data: {
        course_code: 'MAP001',
        course_name: 'Synthetic mapping course',
        department_id: department.id,
        created_at: now,
        updated_at: now,
      },
    });
    const offering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: users[4],
        semester_id: semester.id,
        year_level: 1,
        class_type: 'COURSE',
        created_at: now,
        updated_at: now,
      },
    });
    await db.course_offering_group_scopes.create({
      data: {
        course_offering_id: offering.id,
        academic_year_id: years[0],
        generation_id: generations[0],
        major_id: majors[0],
        year_level: 1,
        class_group: 'A',
      },
    });
    await db.enrollments.create({
      data: {
        student_id: users[2],
        course_offering_id: offering.id,
        enrolled_at: now,
      },
    });
    const survey = await db.surveys.create({
      data: {
        title: 'Synthetic mapping questionnaire',
        created_by: users[0],
        created_at: now,
        updated_at: now,
      },
    });
    const version = await db.survey_versions.create({
      data: {
        survey_id: survey.id,
        version_no: 1,
        created_by: users[0],
        created_at: now,
      },
    });
    const question = await db.questions.create({
      data: {
        survey_version_id: version.id,
        question_text: 'Synthetic question',
        question_type: 'TEXT',
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
    });
    const evaluation = await db.evaluations.create({
      data: {
        course_offering_id: offering.id,
        survey_version_id: version.id,
        status: 'CLOSED',
        created_by: users[0],
        created_at: now,
        updated_at: now,
      },
    });
    await db.evaluation_generation_targets.create({
      data: {
        evaluation_id: evaluation.id,
        generation_id: generations[0],
        historical_labels: {
          schema_version: 1,
          generation: { id: String(generations[0]), name: 'Legacy shared' },
        },
        labels_captured_at: now,
      },
    });
    await db.evaluation_group_targets.create({
      data: {
        evaluation_id: evaluation.id,
        academic_year_id: years[0],
        generation_id: generations[0],
        major_id: majors[0],
        year_level: 1,
        class_group: 'A',
      },
    });
    for (const [index, user] of users.slice(2, 4).entries()) {
      const participant = await db.evaluation_participants.create({
        data: {
          evaluation_id: evaluation.id,
          student_id: user,
          survey_version_id: version.id,
          has_submitted: index === 0,
          submitted_at: index === 0 ? now : null,
          created_at: now,
        },
      });
      if (index === 1)
        await db.assessment_drafts.create({
          data: {
            participant_id: participant.id,
            survey_version_id: version.id,
            answers_json: { protected: 'PRIVATE synthetic draft' },
            created_at: now,
            updated_at: now,
          },
        });
    }
    const response = await db.responses.create({
      data: {
        evaluation_id: evaluation.id,
        survey_version_id: version.id,
        created_at: now,
        submitted_at: now,
      },
    });
    await db.answers.create({
      data: {
        response_id: response.id,
        question_id: question.id,
        text_value: 'PRIVATE synthetic answer',
        created_at: now,
      },
    });
    return { users, majors, years, generations, profiles, records };
  }
  async function manifest(): Promise<Manifest> {
    const data = await inspectMapping(db, principal);
    return {
      schema_version: 1,
      operation_id: randomUUID(),
      database: data.database,
      schema: data.schema,
      source_fingerprint: data.source_fingerprint,
      reviewer_id: principal.id,
      reviewed_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 600000).toISOString(),
      reason: 'Explicit synthetic split; retain unknown and frozen references.',
      cohorts: data.cohorts.map((row) => ({
        ...ref(row),
        disposition:
          row.ownership_state === 'MAJOR_SCOPED'
            ? 'KEEP_EXISTING_CANONICAL'
            : row.id === String(f.generations[0])
              ? 'SPLIT_KEEP_LEGACY_REFERENCE'
              : 'RETAIN_UNRESOLVED',
        destinations:
          row.id === String(f.generations[0]) &&
          row.ownership_state !== 'MAJOR_SCOPED'
            ? [0, 1].map((index) => ({
                key: index ? 'FE' : 'DS',
                major_id: String(f.majors[index]),
                generation_number: 1,
                entry_academic_year_id: String(f.years[index]),
                starting_year_level: 1,
                existing_generation_id: null,
              }))
            : [],
      })),
      profiles: data.profiles.map((row) => ({
        ...ref(row),
        destination_key: row.id === String(f.profiles[0]) ? 'FE' : null,
      })),
      records: data.records.map((row) => ({
        ...ref(row),
        destination_key: row.id === String(f.records[0]) ? 'DS' : 'FE',
      })),
      scopes: data.scopes.map((row) => ({
        ...ref(row),
        destination_key: 'DS',
      })),
      frozen_targets: data.frozen_targets.map((row) => ({
        ...ref(row),
        disposition: 'KEEP_ORIGINAL_REFERENCE',
      })),
    };
  }
  // Most scenarios exercise the real executor transaction callback inside an
  // outer rollback transaction. Separate tests below prove real commit/retry/concurrency.
  async function sandbox(
    work: (client: object, tx: Prisma.TransactionClient) => Promise<unknown>,
  ) {
    const before = (await inspectMapping(db, principal)).source_fingerprint;
    const sentinel = new Error('Owned mapping test rollback');
    try {
      await db.$transaction(
        async (tx) => {
          const client = {
            $transaction: (
              callback: (value: Prisma.TransactionClient) => Promise<unknown>,
            ) => callback(tx),
          };
          await work(client, tx);
          throw sentinel;
        },
        { isolationLevel: 'ReadCommitted', timeout: 30000 },
      );
    } catch (error) {
      if (error !== sentinel) throw error;
    } finally {
      expect((await inspectMapping(db, principal)).source_fingerprint).toBe(
        before,
      );
    }
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    f = await seed();
    principal = { id: String(f.users[0]), auth_version: 0 };
    for (const file of [
      'major-scoped-generations-expand.sql',
      'cohort-mapping-receipts.sql',
    ])
      await db.$executeRawUnsafe(
        fs.readFileSync(`scripts/migrations/${file}`, 'utf8'),
      );
  }, 90000);
  afterEach(async () => {
    await fixture.assertPublicUnchanged();
  });
  afterAll(async () => {
    await fixture.close();
  }, 30000);

  it('inspects a complete review without exposing credentials, student codes, drafts or answers', async () => {
    const data = await inspectMapping(db, principal);
    expect(data.records).toHaveLength(2);
    expect(data.frozen_targets).toHaveLength(2);
    expect(data.profiles.map((row) => row.id)).toContain('9007199254740993');
    const [counts] = await db.$queryRaw<
      Array<{ tables: bigint; columns: bigint }>
    >`SELECT count(DISTINCT table_name) AS tables,count(*) AS columns FROM information_schema.columns WHERE table_schema=${fixture.schema} AND table_name <> '_prisma_migrations'`;
    expect(counts).toEqual({ tables: 31n, columns: 226n });
    const output = JSON.stringify(data);
    for (const secret of [
      'Not-a-login-account',
      'PRIVATE',
      'SYN-2',
      'password_hash',
      'text_value',
      'answers_json',
    ])
      expect(output).not.toContain(secret);
  });
  it('refuses inspection and mapping against shared public schema', async () => {
    await expect(inspectMapping(fixture.root, principal)).rejects.toMatchObject(
      { code: 'ISOLATED_FIXTURE_REQUIRED' },
    );
    await expect(
      applyMapping(fixture.root, principal, await manifest()),
    ).rejects.toMatchObject({ code: 'ISOLATED_FIXTURE_REQUIRED' });
  });
  it('refuses forged role claims from a lecturer', async () => {
    const actor = { id: String(f.users[4]), auth_version: 0, role: 'ADMIN' };
    await expect(
      applyMapping(db, actor, await manifest()),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('refuses inactive administrators and revoked sessions', async () => {
    const input = await manifest();
    await sandbox(async (client, tx) => {
      await tx.$executeRaw`UPDATE users SET status='INACTIVE' WHERE id=${f.users[0]}`;
      await expect(
        applyMapping(client, principal, input),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });
    await expect(
      applyMapping(db, { ...principal, auth_version: 1 }, input),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  const mutations: Array<[string, (input: Manifest) => void, string]> = [
    [
      'unknown fields',
      (m) => {
        Object.assign(m, { unexpected: true });
      },
      'INVALID_MANIFEST',
    ],
    [
      'missing section',
      (m) => {
        Reflect.deleteProperty(m, 'records');
      },
      'INVALID_MANIFEST',
    ],
    [
      'unsafe numeric ID',
      (m) => {
        Object.assign(m.records[0], { id: 1 });
      },
      'INVALID_MANIFEST',
    ],
    [
      'out-of-range string ID',
      (m) => {
        m.records[0].id = '9223372036854775808';
      },
      'INVALID_MANIFEST',
    ],
    [
      'too many cohorts',
      (m) => {
        m.cohorts = Array.from({ length: 501 }, () =>
          structuredClone(m.cohorts[0]),
        );
      },
      'INVALID_MANIFEST',
    ],
    [
      'blank review reason',
      (m) => {
        m.reason = '   ';
      },
      'INVALID_MANIFEST',
    ],
    [
      'string cohort number',
      (m) => {
        Object.assign(m.cohorts[0].destinations[0], { generation_number: '1' });
      },
      'INVALID_MANIFEST',
    ],
    [
      'missing destination major',
      (m) => {
        m.cohorts[0].destinations[0].major_id = '9223372036854775807';
      },
      'INVALID_MAPPING',
    ],
    [
      'missing destination year',
      (m) => {
        m.cohorts[0].destinations[0].entry_academic_year_id =
          '9223372036854775807';
      },
      'INVALID_MAPPING',
    ],
    [
      'duplicate frozen target',
      (m) => {
        m.frozen_targets[1] = structuredClone(m.frozen_targets[0]);
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'invalid UUID',
      (m) => {
        m.operation_id = 'not-a-uuid';
      },
      'INVALID_MANIFEST',
    ],
    [
      'normal target',
      (m) => {
        m.database = 'teacher_evaluation';
      },
      'INVALID_MANIFEST',
    ],
    [
      'other owned target',
      (m) => {
        m.schema = `cohort_test_${'a'.repeat(32)}`;
      },
      'TARGET_MISMATCH',
    ],
    [
      'wrong reviewer',
      (m) => {
        m.reviewer_id = String(f.users[1]);
      },
      'FORBIDDEN',
    ],
    [
      'expired review',
      (m) => {
        m.reviewed_at = new Date(Date.now() - 120000).toISOString();
        m.expires_at = new Date(Date.now() - 60000).toISOString();
      },
      'REVIEW_EXPIRED',
    ],
    [
      'future review',
      (m) => {
        m.reviewed_at = new Date(Date.now() + 60000).toISOString();
        m.expires_at = new Date(Date.now() + 120000).toISOString();
      },
      'REVIEW_EXPIRED',
    ],
    [
      'unbounded review window',
      (m) => {
        m.expires_at = new Date(Date.now() + 3600000).toISOString();
      },
      'INVALID_MANIFEST',
    ],
    [
      'missing cohort',
      (m) => {
        m.cohorts.pop();
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'missing profile',
      (m) => {
        m.profiles.pop();
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'missing yearly record',
      (m) => {
        m.records.pop();
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'missing scope',
      (m) => {
        m.scopes.pop();
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'missing frozen target',
      (m) => {
        m.frozen_targets.pop();
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'duplicate record',
      (m) => {
        m.records[1] = structuredClone(m.records[0]);
      },
      'INCOMPLETE_MAPPING',
    ],
    [
      'stale row hash',
      (m) => {
        m.records[0].expected_sha256 = '0'.repeat(64);
      },
      'MAPPING_STALE',
    ],
    [
      'stale full state',
      (m) => {
        m.source_fingerprint = '0'.repeat(64);
      },
      'MAPPING_STALE',
    ],
    [
      'unknown destination',
      (m) => {
        m.records[0].destination_key = 'UNKNOWN';
      },
      'INVALID_MAPPING',
    ],
    [
      'wrong-major record',
      (m) => {
        m.records[0].destination_key = 'FE';
      },
      'INVALID_MAPPING',
    ],
    [
      'wrong-major scope',
      (m) => {
        m.scopes[0].destination_key = 'FE';
      },
      'INVALID_MAPPING',
    ],
    [
      'profile mismatches latest year',
      (m) => {
        m.profiles[0].destination_key = 'DS';
      },
      'INVALID_MAPPING',
    ],
    [
      'orphan profile ownership guess',
      (m) => {
        m.profiles[1].destination_key = 'DS';
      },
      'INVALID_MAPPING',
    ],
    [
      'destination before entry',
      (m) => {
        m.cohorts[0].destinations[0].entry_academic_year_id = String(
          f.years[1],
        );
      },
      'INVALID_MAPPING',
    ],
    [
      'duplicate destination keys',
      (m) => {
        m.cohorts[0].destinations[1].key = 'DS';
      },
      'DESTINATION_CONFLICT',
    ],
    [
      'same-major alias merge',
      (m) => {
        m.cohorts[0].destinations[1].major_id = String(f.majors[0]);
      },
      'DESTINATION_CONFLICT',
    ],
    [
      'overflow number',
      (m) => {
        m.cohorts[0].destinations[0].generation_number = 2147483648;
      },
      'INVALID_MANIFEST',
    ],
    [
      'fractional number',
      (m) => {
        m.cohorts[0].destinations[0].generation_number = 1.5;
      },
      'INVALID_MANIFEST',
    ],
    [
      'frozen target rewrite',
      (m) => {
        m.frozen_targets[0].disposition = 'REMAP';
      },
      'INVALID_MANIFEST',
    ],
    [
      'keep-ID metadata change',
      (m) => {
        const row = m.cohorts[1];
        row.disposition = 'KEEP_ID_AS_CANONICAL';
        row.destinations = [
          {
            ...m.cohorts[0].destinations[0],
            key: 'NINE',
            generation_number: 9,
            entry_academic_year_id: String(f.years[1]),
            existing_generation_id: row.id,
          },
        ];
      },
      'INVALID_MAPPING',
    ],
  ];
  for (const [name, change, code] of mutations)
    it(`rejects ${name} without application writes`, async () => {
      const input = await manifest();
      change(input);
      await sandbox(async (client) => {
        await expect(
          applyMapping(client, principal, input),
        ).rejects.toMatchObject({ code });
      });
    });
  it('applies the explicit split with a complete receipt and preserves frozen/anonymous history', async () => {
    const input = await manifest();
    await sandbox(async (client, tx) => {
      const result = await applyMapping(client, principal, input);
      expect(result.mapped).toEqual({ profiles: 1, records: 2, scopes: 1 });
      expect(result.cohorts.map((row) => row.key)).toEqual(['DS', 'FE']);
      expect(result.cohorts[0].generation_id).not.toBe(
        result.cohorts[1].generation_id,
      );
      const records = await tx.$queryRaw<
        Array<{ generation_id: bigint; progression_action: string }>
      >`SELECT generation_id,progression_action FROM student_academic_records ORDER BY academic_year_id`;
      expect(records.map((row) => row.generation_id.toString())).toEqual(
        result.cohorts.map((row) => row.generation_id),
      );
      expect(records.map((row) => row.progression_action)).toEqual([
        'NORMAL',
        'TRANSFER',
      ]);
      expect(
        await tx.$queryRaw`SELECT generation_id FROM evaluation_generation_targets`,
      ).toEqual([{ generation_id: f.generations[0] }]);
      expect(await tx.$queryRaw`SELECT text_value FROM answers`).toEqual([
        { text_value: 'PRIVATE synthetic answer' },
      ]);
      const output = JSON.stringify(result);
      expect(output).not.toContain('PRIVATE');
      expect(output).not.toContain('student_id');
    });
  });
  it('can explicitly keep every legacy reference unresolved without inventing an owner', async () => {
    const input = await manifest();
    for (const row of input.cohorts) {
      row.disposition = 'RETAIN_UNRESOLVED';
      row.destinations = [];
    }
    for (const key of ['profiles', 'records', 'scopes'] as const)
      for (const row of input[key]) row.destination_key = null;
    await sandbox(async (client) => {
      const result = await applyMapping(client, principal, input);
      expect(result.mapped).toEqual({ profiles: 0, records: 0, scopes: 0 });
      expect(result.cohorts).toEqual([]);
    });
  });
  it('preserves a reviewed unambiguous legacy ID and original entry metadata', async () => {
    const input = await manifest();
    const row = input.cohorts[1];
    row.disposition = 'KEEP_ID_AS_CANONICAL';
    row.destinations = [
      {
        key: 'NINE',
        major_id: String(f.majors[0]),
        generation_number: 9,
        entry_academic_year_id: String(f.years[0]),
        starting_year_level: 1,
        existing_generation_id: row.id,
      },
    ];
    await sandbox(async (client) => {
      expect(
        (await applyMapping(client, principal, input)).cohorts.find(
          (row) => row.key === 'NINE',
        )?.generation_id,
      ).toBe(String(f.generations[1]));
    });
  });
  it('detects changed unrelated data even when all explicitly mapped rows are unchanged', async () => {
    const input = await manifest();
    await sandbox(async (client, tx) => {
      await tx.$executeRaw`UPDATE users SET full_name='Changed synthetic reviewer' WHERE id=${f.users[1]}`;
      await expect(
        applyMapping(client, principal, input),
      ).rejects.toMatchObject({ code: 'MAPPING_STALE' });
    });
  });
  it('detects changed schema before writing mapping data', async () => {
    const input = await manifest();
    await sandbox(async (client, tx) => {
      await tx.$executeRaw`ALTER TABLE students ADD COLUMN synthetic_drift INTEGER`;
      await expect(
        applyMapping(client, principal, input),
      ).rejects.toMatchObject({ code: 'MAPPING_STALE' });
    });
  });
  it('rolls back mapping, journals and allocations when receipt persistence fails', async () => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION fail_synthetic_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic receipt failure'; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_receipt_failure BEFORE INSERT ON cohort_mapping_receipts FOR EACH ROW EXECUTE FUNCTION fail_synthetic_receipt()`,
    );
    try {
      const input = await manifest();
      const before = (await inspectMapping(db, principal)).source_fingerprint;
      await expect(applyMapping(db, principal, input)).rejects.toMatchObject({
        code: 'MAPPING_FAILED',
      });
      expect((await inspectMapping(db, principal)).source_fingerprint).toBe(
        before,
      );
      expect(
        await db.$queryRaw`SELECT id FROM cohort_mapping_operations`,
      ).toEqual([]);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER synthetic_receipt_failure ON cohort_mapping_receipts`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION fail_synthetic_receipt()`);
    }
  });
  it('rolls back unexpected answer changes made by a receipt trigger', async () => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_receipt_side_effect() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE answers SET text_value='Unexpected side effect'; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_receipt_side_effect AFTER INSERT ON cohort_mapping_receipts FOR EACH ROW EXECUTE FUNCTION synthetic_receipt_side_effect()`,
    );
    try {
      const input = await manifest();
      const before = (await inspectMapping(db, principal)).source_fingerprint;
      await expect(applyMapping(db, principal, input)).rejects.toMatchObject({
        code: 'PRESERVATION_FAILED',
      });
      expect((await inspectMapping(db, principal)).source_fingerprint).toBe(
        before,
      );
      expect(await db.$queryRaw`SELECT text_value FROM answers`).toEqual([
        { text_value: 'PRIVATE synthetic answer' },
      ]);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER synthetic_receipt_side_effect ON cohort_mapping_receipts`,
      );
      await db.$executeRawUnsafe(
        `DROP FUNCTION synthetic_receipt_side_effect()`,
      );
    }
  });
  it('rolls back a receipt whose payload was changed by a trigger', async () => {
    await db.$executeRawUnsafe(
      `CREATE FUNCTION synthetic_receipt_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.receipt_json='{}'::jsonb; RETURN NEW; END $$`,
    );
    await db.$executeRawUnsafe(
      `CREATE TRIGGER synthetic_receipt_rewrite BEFORE INSERT ON cohort_mapping_receipts FOR EACH ROW EXECUTE FUNCTION synthetic_receipt_rewrite()`,
    );
    try {
      const input = await manifest();
      const before = (await inspectMapping(db, principal)).source_fingerprint;
      await expect(applyMapping(db, principal, input)).rejects.toMatchObject({
        code: 'PRESERVATION_FAILED',
      });
      expect((await inspectMapping(db, principal)).source_fingerprint).toBe(
        before,
      );
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER synthetic_receipt_rewrite ON cohort_mapping_receipts`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION synthetic_receipt_rewrite()`);
    }
  });
  it('commits once under concurrent identical confirmations and returns the same durable receipt', async () => {
    savedManifest = await manifest();
    const results = await Promise.all([
      applyMapping(db, principal, savedManifest),
      applyMapping(db, principal, savedManifest),
    ]);
    expect(results[0]).toEqual(results[1]);
    savedReceipt = results[0];
    expect(
      await db.$queryRaw`SELECT operation_id FROM cohort_mapping_receipts`,
    ).toHaveLength(1);
    expect(
      await db.$queryRaw`SELECT id FROM student_cohort_assignment_events`,
    ).toHaveLength(2);
  });
  it('returns the original receipt after expiry and later unrelated state drift', async () => {
    await db.$executeRaw`UPDATE users SET full_name='Later synthetic admin name' WHERE id=${f.users[1]}`;
    expect(
      await applyMapping(db, principal, savedManifest, {
        clock: () => Date.parse(savedManifest.expires_at) + 1,
      }),
    ).toEqual(savedReceipt);
  });
  it('rejects changed input reusing a committed operation and prevents another actor reading its receipt', async () => {
    await expect(
      applyMapping(db, principal, {
        ...savedManifest,
        reason: 'Changed review',
      }),
    ).rejects.toMatchObject({ code: 'OPERATION_REUSED' });
    await expect(
      applyMapping(
        db,
        { id: String(f.users[1]), auth_version: 0 },
        savedManifest,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      applyMapping(db, { ...principal, auth_version: 1 }, savedManifest),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('protects receipt update and deletion at the database layer', async () => {
    await expect(
      db.$executeRaw`DELETE FROM cohort_mapping_receipts WHERE operation_id=${savedManifest.operation_id}::uuid`,
    ).rejects.toThrow('immutable');
    await expect(
      db.$executeRaw`UPDATE cohort_mapping_receipts SET receipt_json='{}'::jsonb WHERE operation_id=${savedManifest.operation_id}::uuid`,
    ).rejects.toThrow('immutable');
  });
  it('explicitly reuses a matching canonical destination without creating or merging a cohort', async () => {
    const input = await manifest();
    for (const row of input.cohorts) {
      row.disposition =
        row.id === String(f.generations[0]) ||
        row.id === String(f.generations[1])
          ? 'RETAIN_UNRESOLVED'
          : 'KEEP_EXISTING_CANONICAL';
      row.destinations = [];
    }
    for (const kind of ['profiles', 'records', 'scopes'] as const)
      for (const row of input[kind]) row.destination_key = null;
    const source = input.cohorts.find(
      (row) => row.id === String(f.generations[1]),
    )!;
    source.disposition = 'SPLIT_KEEP_LEGACY_REFERENCE';
    source.destinations = [
      {
        key: 'EXPLICIT_DS',
        major_id: String(f.majors[0]),
        generation_number: 1,
        entry_academic_year_id: String(f.years[0]),
        starting_year_level: 1,
        existing_generation_id: savedReceipt.cohorts[0].generation_id,
      },
    ];
    const before = await db.student_generations.count();
    const result = await applyMapping(db, principal, input);
    expect(result.cohorts).toEqual([
      {
        key: 'EXPLICIT_DS',
        generation_id: savedReceipt.cohorts[0].generation_id,
      },
    ]);
    expect(await db.student_generations.count()).toBe(before);
  });
});
