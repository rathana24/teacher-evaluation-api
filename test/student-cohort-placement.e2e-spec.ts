import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CohortImportFixture } from './helpers/cohort-import-fixture';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Explicit yearly cohorts and transfers (owned-schema real HTTP)', () => {
  const fixture = new CohortImportFixture();
  let app: INestApplication, db: PrismaClient, hash: string;
  const tokens: Record<string, string> = {};
  const majors: bigint[] = [],
    years: bigint[] = [],
    cohorts: bigint[] = [],
    departments: bigint[] = [];
  let serial = 0;
  let trackedId: string;
  let validationId: string;
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const payload = (
    id: string | bigint = trackedId,
    extra: Record<string, unknown> = {},
  ) => ({
    student_id: String(id),
    academic_year_id: String(years[1]),
    major_id: String(majors[0]),
    generation_id: String(cohorts[0]),
    year_level: 2,
    class_group: ' b  c ',
    ...extra,
  });
  const send = (body: Record<string, unknown>, role = 'ADMIN') =>
    api().post('/api/student-academic-records').set(auth(role)).send(body);
  const edit = (
    id: string | bigint,
    body: Record<string, unknown>,
    role = 'ADMIN',
  ) =>
    api().put(`/api/student-academic-records/${id}`).set(auth(role)).send(body);
  async function unchanged(
    operation: () => PromiseLike<request.Response>,
    status: number,
    code?: string,
  ) {
    const before = await fixture.snapshot(db);
    const response = await operation();
    expect(response.status).toBe(status);
    if (code) expect(response.body.code).toBe(code);
    expect(await fixture.snapshot(db)).toEqual(before);
    return response;
  }
  async function student() {
    const response = await api()
      .post('/api/students')
      .set(auth())
      .send({
        student_code: `placement-${++serial}`,
        full_name: 'Synthetic placed student',
        password: 'SyntheticPlacement123!',
        generation_id: String(cohorts[0]),
        academic_year_id: String(years[0]),
        major_id: String(majors[0]),
        year_level: 1,
        class_group: 'A',
      });
    expect(response.status).toBe(201);
    return response.body as {
      id: string;
      user_id: string;
      student_academic_records: Array<{ id: string }>;
    };
  }
  async function legacy(placed = true) {
    const user = await db.users.create({
      data: {
        full_name: 'Synthetic legacy placement',
        password_hash: hash,
        role: 'STUDENT',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const profile = await db.students.create({
      data: {
        user_id: user.id,
        student_code: `legacy-${++serial}`,
        generation_id: cohorts[5],
      },
    });
    const record = placed
      ? await db.student_academic_records.create({
          data: {
            student_id: profile.id,
            academic_year_id: years[0],
            major_id: majors[0],
            year_level: 1,
            class_group: 'OLD',
          },
        })
      : null;
    return { ...profile, record };
  }
  async function history(id: string | bigint) {
    return {
      records: await db.student_academic_records.findMany({
        where: { student_id: BigInt(id) },
        orderBy: { id: 'asc' },
      }),
      events: await db.student_cohort_assignment_events.findMany({
        where: { student_id: BigInt(id) },
        orderBy: { id: 'asc' },
      }),
    };
  }
  async function context(id: string | bigint, year: bigint) {
    const response = await api()
      .get(`/api/students/${id}`)
      .set(auth())
      .query({ academic_year_id: String(year) });
    expect(response.status).toBe(200);
    return response.body.academic_context;
  }
  function safe(value: unknown) {
    if (Array.isArray(value)) value.forEach(safe);
    else if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'auth_version',
          'mapping_operation_id',
          'cohort_assignment_event',
          'cohort_assignment_events',
          'answers',
          'responses',
        ]).not.toContain(key);
        safe(child);
      }
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    hash = await bcrypt.hash('SyntheticPlacement123!', 10);
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT'] as const)
      await db.users.create({
        data: {
          email: `${role.toLowerCase()}@example.test`,
          full_name: `Synthetic ${role}`,
          password_hash: hash,
          role,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    for (const [index, status] of ['ACTIVE', 'INACTIVE'].entries())
      departments.push(
        (
          await db.departments.create({
            data: {
              code: `CP-${index}`,
              name: `Synthetic CP ${index}`,
              status: status as 'ACTIVE' | 'INACTIVE',
            },
          })
        ).id,
      );
    for (const [index, code] of ['DS', 'FE', 'INACTIVE'].entries())
      majors.push(
        (
          await db.majors.create({
            data: {
              code,
              name: `Synthetic ${code}`,
              department_id: departments[index === 2 ? 1 : 0],
            },
          })
        ).id,
      );
    for (let index = 0; index <= 8; index++)
      years.push(
        (
          await db.academic_years.create({
            data: { name: `CP ${index}`, start_year: 2090 + index },
          })
        ).id,
      );
    years.push(
      (await db.academic_years.create({ data: { name: 'CP unknown' } })).id,
    );
    for (const [major, number, entry] of [
      [0, 1, 0],
      [0, 2, 0],
      [1, 1, 1],
      [2, 1, 0],
      [1, 2, 4],
    ])
      cohorts.push(
        (
          await db.student_generations.create({
            data: {
              name: `Gen ${number}`,
              ownership_state: 'MAJOR_SCOPED',
              major_id: majors[major],
              generation_number: number,
              entry_academic_year_id: years[entry],
            },
          })
        ).id,
      );
    cohorts.push(
      (
        await db.student_generations.create({
          data: { name: 'Legacy CP', entry_academic_year_id: years[0] },
        })
      ).id,
    );
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
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT']) {
      const response = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${role.toLowerCase()}@example.test`,
          password: 'SyntheticPlacement123!',
        });
      expect(response.status).toBe(200);
      tokens[role] = response.body.access_token;
    }
    trackedId = (await student()).id;
    validationId = (await student()).id;
  }, 90000);
  afterEach(async () => {
    await fixture.unchangedPublic();
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      await fixture.close();
    }
  });

  it('appends a same-cohort NORMAL placement and INITIAL evidence without changing the profile or old rows', async () => {
    const before = await history(trackedId);
    const profile = await db.students.findUniqueOrThrow({
      where: { id: BigInt(trackedId) },
    });
    const response = await send(payload());
    expect(response.status).toBe(201);
    safe(response.body);
    expect(response.body).toMatchObject({
      student_id: trackedId,
      generation_id: String(cohorts[0]),
      major_id: String(majors[0]),
      class_group: 'B C',
      student_generations: {
        ownership_state: 'MAJOR_SCOPED',
        major_id: String(majors[0]),
        generation_number: 1,
        majors: { code: 'DS' },
      },
    });
    const after = await history(trackedId);
    expect(after.records.slice(0, before.records.length)).toEqual(
      before.records,
    );
    expect(after.events.slice(0, before.events.length)).toEqual(before.events);
    expect(after.events.at(-1)).toMatchObject({
      action: 'INITIAL',
      generation_id: cohorts[0],
      previous_generation_id: null,
    });
    expect(
      await db.students.findUnique({ where: { id: BigInt(trackedId) } }),
    ).toEqual(profile);
  });
  it('transfers explicitly to FE number 1 and atomically preserves DS history and records the previous cohort', async () => {
    const before = await history(trackedId);
    const response = await send(
      payload(trackedId, {
        academic_year_id: String(years[2]),
        major_id: String(majors[1]),
        generation_id: String(cohorts[2]),
        progression_action: 'TRANSFER',
      }),
    );
    expect(response.status).toBe(201);
    safe(response.body);
    expect(response.body).toMatchObject({
      generation_id: String(cohorts[2]),
      student_generations: {
        major_id: String(majors[1]),
        generation_number: 1,
      },
      students: { generation_id: String(cohorts[2]) },
    });
    const after = await history(trackedId);
    expect(after.records.slice(0, before.records.length)).toEqual(
      before.records,
    );
    expect(after.events.slice(0, before.events.length)).toEqual(before.events);
    expect(after.events.at(-1)).toMatchObject({
      action: 'TRANSFER',
      previous_generation_id: cohorts[0],
      generation_id: cohorts[2],
      major_id: majors[1],
    });
    expect(
      (
        await db.students.findUniqueOrThrow({
          where: { id: BigInt(trackedId) },
        })
      ).generation_id,
    ).toBe(cohorts[2]);
    const old = await api()
      .get(`/api/student-academic-records/${before.records[0].id}`)
      .set(auth());
    expect(old.body).toMatchObject({
      generation_id: String(cohorts[0]),
      student_generations: { major_id: String(majors[0]) },
      students: { generation_id: String(cohorts[2]) },
    });
  });
  it('keeps PAUSE across NORMAL, REPEAT and TRANSFER until explicit RESUME and never carries a group forward', async () => {
    const s = await student();
    for (const [index, action] of [
      'PAUSE',
      'NORMAL',
      'REPEAT',
      'TRANSFER',
    ].entries()) {
      const transferred = action === 'TRANSFER';
      const response = await send(
        payload(s.id, {
          academic_year_id: String(years[index + 1]),
          progression_action: action,
          ...(transferred && {
            major_id: String(majors[1]),
            generation_id: String(cohorts[2]),
          }),
        }),
      );
      expect(response.status).toBe(201);
      expect(await context(s.id, years[index + 1])).toMatchObject({
        progression_status: 'PAUSED',
        placement_eligible: false,
        ineligibility_reason: 'PAUSED',
      });
    }
    const old = await history(s.id);
    const resumed = await send(
      payload(s.id, {
        academic_year_id: String(years[5]),
        progression_action: 'RESUME',
        major_id: String(majors[1]),
        generation_id: String(cohorts[2]),
        class_group: undefined,
      }),
    );
    expect(resumed.status).toBe(201);
    expect(await context(s.id, years[5])).toMatchObject({
      progression_status: 'ACTIVE',
      placement_eligible: false,
      ineligibility_reason: 'MISSING_YEARLY_GROUP',
      placement: { class_group: null },
    });
    const normal = await send(
      payload(s.id, {
        academic_year_id: String(years[6]),
        major_id: String(majors[1]),
        generation_id: String(cohorts[2]),
        class_group: 'D',
      }),
    );
    expect(normal.status).toBe(201);
    expect(await context(s.id, years[6])).toMatchObject({
      progression_status: 'ACTIVE',
      placement_eligible: true,
      placement: { class_group: 'D' },
    });
    const after = await history(s.id);
    expect(after.records.slice(0, old.records.length)).toEqual(old.records);
    expect(after.events.slice(0, old.events.length)).toEqual(old.events);
    expect(await context(s.id, years[1])).toMatchObject({
      progression_status: 'PAUSED',
      placement_eligible: false,
    });
  }, 20000);
  it('requires an explicit cohort even when a same-cohort continuation could be guessed', async () => {
    await unchanged(
      () => send(payload(validationId, { generation_id: undefined })),
      400,
    );
  });
  it.each(['NORMAL', 'REPEAT', 'PAUSE', 'RESUME'])(
    'rejects changing cohort under %s without writes',
    async (action) => {
      await unchanged(
        () =>
          send(
            payload(validationId, {
              generation_id: String(cohorts[1]),
              progression_action: action,
            }),
          ),
        400,
      );
    },
  );
  it('rejects TRANSFER without a different destination cohort', async () => {
    await unchanged(
      () => send(payload(validationId, { progression_action: 'TRANSFER' })),
      400,
    );
  });
  it('rejects a destination cohort belonging to another major without writes', async () => {
    await unchanged(
      () =>
        send(
          payload(validationId, {
            generation_id: String(cohorts[2]),
            progression_action: 'TRANSFER',
          }),
        ),
      400,
    );
  });
  it('rejects inactive destination departments without writes', async () => {
    await unchanged(
      () =>
        send(
          payload(validationId, {
            generation_id: String(cohorts[3]),
            major_id: String(majors[2]),
            progression_action: 'TRANSFER',
          }),
        ),
      400,
    );
  });
  it('rejects destination entry later than the placement year', async () => {
    await unchanged(
      () =>
        send(
          payload(validationId, {
            generation_id: String(cohorts[4]),
            major_id: String(majors[1]),
            progression_action: 'TRANSFER',
          }),
        ),
      400,
    );
  });
  it('rejects an unstructured destination year without writes', async () => {
    await unchanged(
      () => send(payload(validationId, { academic_year_id: String(years[9]) })),
      400,
    );
  });
  it('rejects RESUME without a previous pause before creating rows or evidence', async () => {
    await unchanged(
      () => send(payload(validationId, { progression_action: 'RESUME' })),
      400,
    );
  });
  it('rejects repeated confirmations as an existing year without additional evidence or pointer changes', async () => {
    await unchanged(
      () =>
        send(
          payload(trackedId, {
            academic_year_id: String(years[2]),
            generation_id: String(cohorts[2]),
            major_id: String(majors[1]),
            progression_action: 'TRANSFER',
          }),
        ),
      409,
      'ACADEMIC_RECORD_EXISTS',
    );
  });
  for (const field of [
    'student_id',
    'academic_year_id',
    'major_id',
    'generation_id',
  ]) {
    it(`rejects a missing ${field} reference without writes`, async () => {
      await unchanged(
        () => send(payload(validationId, { [field]: '9000000000000000000' })),
        404,
      );
    });
    for (const value of [1, '0', '-1', '1.5', '9223372036854775808', null])
      it(`rejects invalid create ${field} ${String(value)}`, async () => {
        await unchanged(
          () => send(payload(validationId, { [field]: value })),
          400,
        );
      });
  }
  it('rejects new explicit assignment to an unresolved legacy cohort', async () => {
    await unchanged(
      () => send(payload(validationId, { generation_id: String(cohorts[5]) })),
      409,
      'COHORT_MAPPING_REQUIRED',
    );
  });
  it('requires reviewed history before transferring a legacy student', async () => {
    const s = await legacy();
    await unchanged(
      () => send(payload(s.id, { progression_action: 'TRANSFER' })),
      409,
      'COHORT_MAPPING_REQUIRED',
    );
  });
  it('does not infer a previous cohort for an orphan legacy profile', async () => {
    const s = await legacy(false);
    await unchanged(() => send(payload(s.id)), 409, 'COHORT_MAPPING_REQUIRED');
  });
  it('keeps entirely legacy omission transitional without inventing an assignment event or owner', async () => {
    const s = await legacy();
    const old = await history(s.id);
    const response = await send(
      payload(s.id, {
        generation_id: undefined,
        major_id: String(majors[1]),
        progression_action: 'TRANSFER',
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      generation_id: null,
      student_generations: null,
    });
    const after = await history(s.id);
    expect(after.records[0]).toEqual(old.records[0]);
    expect(after.events).toEqual([]);
    expect(
      (await db.students.findUniqueOrThrow({ where: { id: s.id } }))
        .generation_id,
    ).toBe(cohorts[5]);
  });
  it('rejects a backdated insertion instead of changing the latest profile pointer', async () => {
    await unchanged(
      () =>
        send(
          payload(trackedId, {
            academic_year_id: String(years[1]),
            generation_id: String(cohorts[2]),
            major_id: String(majors[1]),
          }),
        ),
      409,
      'ACADEMIC_RECORD_EXISTS',
    );
    const s = await student();
    expect(
      (await send(payload(s.id, { academic_year_id: String(years[2]) })))
        .status,
    ).toBe(201);
    await unchanged(
      () => send(payload(s.id)),
      409,
      'COHORT_CHRONOLOGY_REVIEW_REQUIRED',
    );
  });
  it('rejects a different year ID with the same chronology instead of ordering by IDs', async () => {
    const duplicate = await db.academic_years.create({
      data: { name: 'CP same start', start_year: 2090 },
    });
    await unchanged(
      () =>
        send(payload(validationId, { academic_year_id: String(duplicate.id) })),
      409,
      'COHORT_CHRONOLOGY_REVIEW_REQUIRED',
    );
  });
  it('requires review of undated stored history before a new assignment', async () => {
    const s = await student();
    await db.student_academic_records.create({
      data: {
        student_id: BigInt(s.id),
        academic_year_id: years[9],
        major_id: majors[0],
        year_level: 1,
      },
    });
    await unchanged(
      () => send(payload(s.id)),
      409,
      'COHORT_CHRONOLOGY_REVIEW_REQUIRED',
    );
  });
  it('requires review when two stored year IDs share a start_year', async () => {
    const s = await student();
    const duplicate = await db.academic_years.create({
      data: { name: 'CP history tie', start_year: 2090 },
    });
    await db.student_academic_records.create({
      data: {
        student_id: BigInt(s.id),
        academic_year_id: duplicate.id,
        major_id: majors[0],
        year_level: 1,
      },
    });
    await unchanged(
      () => send(payload(s.id)),
      409,
      'COHORT_CHRONOLOGY_REVIEW_REQUIRED',
    );
  });
  it('requires mapping when the latest stored year has no resolved cohort', async () => {
    const s = await student();
    await db.student_academic_records.create({
      data: {
        student_id: BigInt(s.id),
        academic_year_id: years[1],
        major_id: majors[0],
        year_level: 2,
      },
    });
    await unchanged(
      () => send(payload(s.id, { academic_year_id: String(years[2]) })),
      409,
      'COHORT_MAPPING_REQUIRED',
    );
  });
  it('preserves an earlier unresolved link while appending after a later known assignment', async () => {
    const s = await student();
    const year = await db.academic_years.create({
      data: { name: 'CP older unknown', start_year: 2088 },
    });
    const unknown = await db.student_academic_records.create({
      data: {
        student_id: BigInt(s.id),
        academic_year_id: year.id,
        major_id: majors[0],
        year_level: 1,
      },
    });
    const response = await send(payload(s.id));
    expect(response.status).toBe(201);
    expect(
      await db.student_academic_records.findUnique({
        where: { id: unknown.id },
      }),
    ).toEqual(unknown);
  });
  it('rejects a stale compatibility profile pointer without changing any stored history', async () => {
    const s = await student();
    await db.students.update({
      where: { id: BigInt(s.id) },
      data: { generation_id: cohorts[2] },
    });
    await unchanged(() => send(payload(s.id)), 409, 'COHORT_CONTEXT_STALE');
  });
  for (const stage of ['evidence', 'profile'])
    it(`rolls back placement/evidence/profile changes when ${stage} persistence fails`, async () => {
      const s = await student();
      const table =
        stage === 'evidence' ? 'student_cohort_assignment_events' : 'students';
      const when =
        stage === 'evidence'
          ? "NEW.action='TRANSFER'"
          : 'NEW.generation_id IS DISTINCT FROM OLD.generation_id';
      await db.$executeRawUnsafe(
        `CREATE FUNCTION reject_owned_transfer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${when} THEN RAISE EXCEPTION 'Synthetic private transfer failure' USING ERRCODE='23503'; END IF; RETURN NEW; END $$`,
      );
      await db.$executeRawUnsafe(
        `CREATE TRIGGER reject_owned_transfer ${stage === 'evidence' ? 'BEFORE INSERT' : 'AFTER UPDATE'} ON ${table} FOR EACH ROW EXECUTE FUNCTION reject_owned_transfer()`,
      );
      try {
        const response = await unchanged(
          () =>
            send(
              payload(s.id, {
                generation_id: String(cohorts[2]),
                major_id: String(majors[1]),
                progression_action: 'TRANSFER',
              }),
            ),
          409,
        );
        expect(JSON.stringify(response.body)).not.toContain(
          'Synthetic private transfer failure',
        );
      } finally {
        await db.$executeRawUnsafe(
          `DROP TRIGGER reject_owned_transfer ON ${table}`,
        );
        await db.$executeRawUnsafe('DROP FUNCTION reject_owned_transfer()');
      }
    });
  it('commits one complete transfer under duplicate concurrent requests', async () => {
    const s = await student();
    const body = payload(s.id, {
      generation_id: String(cohorts[2]),
      major_id: String(majors[1]),
      progression_action: 'TRANSFER',
    });
    const responses = await Promise.all([send(body), send(body)]);
    expect(responses.map((value) => value.status).sort()).toEqual([201, 409]);
    const saved = await history(s.id);
    expect(saved.records).toHaveLength(2);
    expect(saved.events).toHaveLength(2);
    expect(saved.events[1]).toMatchObject({
      action: 'TRANSFER',
      previous_generation_id: cohorts[0],
      generation_id: cohorts[2],
    });
    expect(
      (await db.students.findUniqueOrThrow({ where: { id: BigInt(s.id) } }))
        .generation_id,
    ).toBe(cohorts[2]);
  });
  it('keeps concurrent different-year transfers chronologically coherent', async () => {
    const s = await student();
    const responses = await Promise.all([
      send(
        payload(s.id, {
          generation_id: String(cohorts[1]),
          progression_action: 'TRANSFER',
        }),
      ),
      send(
        payload(s.id, {
          academic_year_id: String(years[2]),
          generation_id: String(cohorts[2]),
          major_id: String(majors[1]),
          progression_action: 'TRANSFER',
        }),
      ),
    ]);
    expect(responses.some((value) => value.status === 201)).toBe(true);
    expect(responses.every((value) => [201, 409].includes(value.status))).toBe(
      true,
    );
    const records = await db.student_academic_records.findMany({
      where: { student_id: BigInt(s.id) },
      include: { academic_years: true, cohort_assignment_event: true },
    });
    records.sort(
      (a, b) => a.academic_years.start_year! - b.academic_years.start_year!,
    );
    for (let index = 1; index < records.length; index++)
      expect(
        records[index].cohort_assignment_event!.previous_generation_id,
      ).toBe(records[index - 1].generation_id);
    expect(
      (await db.students.findUniqueOrThrow({ where: { id: BigInt(s.id) } }))
        .generation_id,
    ).toBe(records.at(-1)!.generation_id);
  });
  it('rejects unstructured entry metadata without fabricating chronology', async () => {
    const cohort = await db.student_generations.create({
      data: {
        name: 'Gen 99',
        ownership_state: 'MAJOR_SCOPED',
        major_id: majors[1],
        generation_number: 99,
        entry_academic_year_id: years[9],
      },
    });
    await unchanged(
      () =>
        send(
          payload(validationId, {
            generation_id: String(cohort.id),
            major_id: String(majors[1]),
            progression_action: 'TRANSFER',
          }),
        ),
      400,
    );
  });
  for (const field of [
    'student_id',
    'academic_year_id',
    'major_id',
    'generation_id',
  ])
    it(`blocks a changed resolved ${field} and accompanying group edit`, async () => {
      const first = (await history(trackedId)).records[0];
      const value =
        field === 'student_id'
          ? validationId
          : field === 'academic_year_id'
            ? String(years[7])
            : field === 'major_id'
              ? String(majors[1])
              : String(cohorts[1]);
      await unchanged(
        () => edit(first.id, { [field]: value, class_group: 'MUST NOT SAVE' }),
        409,
        'COHORT_ASSIGNMENT_IMMUTABLE',
      );
    });
  it('allows the unchanged cohort ID on a resolved record without a new event or timestamp write', async () => {
    const first = (await history(validationId)).records[0];
    await unchanged(
      () => edit(first.id, { generation_id: String(cohorts[0]) }),
      200,
    );
  });
  it('keeps permitted group/year-level edits without rewriting assignment evidence or the profile pointer', async () => {
    const s = await student();
    const old = await history(s.id);
    const profile = await db.students.findUniqueOrThrow({
      where: { id: BigInt(s.id) },
    });
    const response = await edit(old.records[0].id, {
      year_level: 2,
      class_group: ' c  d ',
      generation_id: String(cohorts[0]),
    });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      generation_id: String(cohorts[0]),
      year_level: 2,
      class_group: 'C D',
    });
    expect((await history(s.id)).events).toEqual(old.events);
    expect(
      await db.students.findUnique({ where: { id: BigInt(s.id) } }),
    ).toEqual(profile);
  });
  it('does not forge TRANSFER evidence by changing an INITIAL progression label', async () => {
    const first = (await history(validationId)).records[0];
    await unchanged(
      () => edit(first.id, { progression_action: 'TRANSFER' }),
      409,
      'COHORT_TRANSFER_REQUIRES_NEW_PLACEMENT',
    );
  });
  it('allows explicit in-place RESUME after a paused transfer while preserving its immutable transfer event', async () => {
    const s = await student();
    expect(
      (await send(payload(s.id, { progression_action: 'PAUSE' }))).status,
    ).toBe(201);
    const moved = await send(
      payload(s.id, {
        academic_year_id: String(years[2]),
        generation_id: String(cohorts[2]),
        major_id: String(majors[1]),
        progression_action: 'TRANSFER',
      }),
    );
    expect(moved.status).toBe(201);
    expect((await context(s.id, years[2])).progression_status).toBe('PAUSED');
    const old = await history(s.id);
    const resumed = await edit(moved.body.id, { progression_action: 'RESUME' });
    expect(resumed.status).toBe(200);
    expect(await context(s.id, years[2])).toMatchObject({
      progression_status: 'ACTIVE',
      placement_eligible: true,
    });
    expect((await history(s.id)).events).toEqual(old.events);
  });
  it('blocks deletion of resolved NORMAL and TRANSFER records without touching evidence', async () => {
    for (const record of (await history(trackedId)).records)
      await unchanged(
        () =>
          api()
            .delete(`/api/student-academic-records/${record.id}`)
            .set(auth()),
        409,
        'COHORT_ASSIGNMENT_PROTECTED',
      );
  });
  it('blocks raw backfilling of an unresolved legacy cohort through PUT', async () => {
    const s = await legacy();
    await unchanged(
      () =>
        edit(s.record!.id, {
          generation_id: String(cohorts[0]),
          class_group: 'MUST NOT SAVE',
        }),
      409,
      'COHORT_MAPPING_REQUIRED',
    );
  });
  it('blocks moving a legacy record into a cohort-tracked student history', async () => {
    const s = await legacy();
    await unchanged(
      () => edit(s.record!.id, { student_id: validationId }),
      409,
      'COHORT_MAPPING_REQUIRED',
    );
  });
  it('protects unresolved older rows once the profile has a resolved cohort history', async () => {
    const s = await student();
    const year = await db.academic_years.create({
      data: { name: 'CP unknown older', start_year: 2087 },
    });
    const record = await db.student_academic_records.create({
      data: {
        student_id: BigInt(s.id),
        academic_year_id: year.id,
        major_id: majors[0],
        year_level: 1,
      },
    });
    await unchanged(
      () =>
        api().delete(`/api/student-academic-records/${record.id}`).set(auth()),
      409,
      'COHORT_ASSIGNMENT_PROTECTED',
    );
    await unchanged(
      () => edit(record.id, { major_id: String(majors[1]) }),
      409,
      'COHORT_MAPPING_REQUIRED',
    );
  });
  for (const field of [
    'student_id',
    'academic_year_id',
    'major_id',
    'generation_id',
    'progression_action',
  ])
    it(`rejects null update ${field} without writes`, async () => {
      const first = (await history(validationId)).records[0];
      await unchanged(() => edit(first.id, { [field]: null }), 400);
    });
  for (const value of [
    '0',
    '-1',
    '1.5',
    '9223372036854775808',
    '1'.repeat(100),
  ])
    it(`rejects bounded route ID ${value.slice(0, 22)} on GET/PUT/DELETE without writes`, async () => {
      await unchanged(
        () => api().get(`/api/student-academic-records/${value}`).set(auth()),
        400,
      );
      await unchanged(
        () =>
          api()
            .put(`/api/student-academic-records/${value}`)
            .set(auth())
            .send({ class_group: 'X' }),
        400,
      );
      await unchanged(
        () =>
          api().delete(`/api/student-academic-records/${value}`).set(auth()),
        400,
      );
    });
  it.each(['LECTURER', 'STUDENT'])(
    'denies %s placement, record reads, update and delete without writes',
    async (role) => {
      const record = (await history(validationId)).records[0];
      await unchanged(() => send(payload(validationId), role), 403);
      await unchanged(
        () =>
          api()
            .get(`/api/student-academic-records/${record.id}`)
            .set(auth(role)),
        403,
      );
      await unchanged(
        () => edit(record.id, { class_group: 'DENIED' }, role),
        403,
      );
      await unchanged(
        () =>
          api()
            .delete(`/api/student-academic-records/${record.id}`)
            .set(auth(role)),
        403,
      );
    },
  );
  it('denies anonymous placements without writes', async () => {
    await unchanged(
      () =>
        api().post('/api/student-academic-records').send(payload(validationId)),
      401,
    );
  });
  it('cannot bypass explicit cohort selection by retaining a legacy profile pointer over resolved history', async () => {
    const s = await student();
    await db.students.update({
      where: { id: BigInt(s.id) },
      data: { generation_id: cohorts[5] },
    });
    await unchanged(
      () => send(payload(s.id, { generation_id: undefined })),
      400,
    );
  });
  it('preserves student/year/major/cohort IDs above JavaScript safe integer precision during transfer', async () => {
    const id = 9007199254740993n;
    const user = await db.users.create({
      data: {
        full_name: 'Synthetic BigInt transfer',
        role: 'STUDENT',
        password_hash: hash,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await db.majors.create({
      data: {
        id,
        code: 'BIG',
        name: 'BigInt transfer major',
        department_id: departments[0],
      },
    });
    await db.academic_years.create({
      data: { id, name: 'BigInt CP year', start_year: 2091 },
    });
    await db.student_generations.create({
      data: {
        id,
        name: 'Gen 7',
        ownership_state: 'MAJOR_SCOPED',
        major_id: id,
        generation_number: 7,
        entry_academic_year_id: years[0],
      },
    });
    await db.$transaction(async (tx) => {
      await tx.students.create({
        data: {
          id,
          user_id: user.id,
          student_code: 'bigint-transfer',
          generation_id: cohorts[0],
        },
      });
      const record = await tx.student_academic_records.create({
        data: {
          student_id: id,
          academic_year_id: years[0],
          major_id: majors[0],
          generation_id: cohorts[0],
          year_level: 1,
          class_group: 'A',
        },
      });
      await tx.student_cohort_assignment_events.create({
        data: {
          academic_record_id: record.id,
          student_id: id,
          academic_year_id: years[0],
          major_id: majors[0],
          generation_id: cohorts[0],
          action: 'INITIAL',
        },
      });
    });
    const response = await send(
      payload(id, {
        academic_year_id: String(id),
        major_id: String(id),
        generation_id: String(id),
        progression_action: 'TRANSFER',
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      student_id: String(id),
      academic_year_id: String(id),
      major_id: String(id),
      generation_id: String(id),
      student_generations: { generation_number: 7 },
    });
    const saved = await history(id);
    expect(saved.events.at(-1)).toMatchObject({
      student_id: id,
      academic_year_id: id,
      major_id: id,
      generation_id: id,
      previous_generation_id: cohorts[0],
    });
  });
  it('preserves enrollments, frozen labels, questionnaire versions, protected drafts, completion and anonymous answers during transfers', async () => {
    const pending = await student(),
      completed = await student();
    const now = new Date();
    const admin = await db.users.findUniqueOrThrow({
      where: { email: 'admin@example.test' },
    });
    const lecturer = await db.users.findUniqueOrThrow({
      where: { email: 'lecturer@example.test' },
    });
    const semester = await db.semesters.create({
      data: {
        semester_name: 'CP history S1',
        semester_number: 1,
        academic_year_id: years[0],
        created_at: now,
        updated_at: now,
      },
    });
    const course = await db.courses.create({
      data: {
        course_code: 'CP-HISTORY',
        course_name: 'Synthetic retained course',
        department_id: departments[0],
        created_at: now,
        updated_at: now,
      },
    });
    const offering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: lecturer.id,
        semester_id: semester.id,
        year_level: 1,
        class_type: 'COURSE',
        section_code: 'CP-HISTORY',
        created_at: now,
        updated_at: now,
      },
    });
    for (const s of [pending, completed])
      await db.enrollments.create({
        data: {
          student_id: BigInt(s.user_id),
          course_offering_id: offering.id,
          enrolled_at: now,
        },
      });
    const survey = await db.surveys.create({
      data: {
        title: 'Synthetic CP retained questionnaire',
        created_by: admin.id,
        created_at: now,
        updated_at: now,
      },
    });
    const version = await db.survey_versions.create({
      data: {
        survey_id: survey.id,
        version_no: 1,
        status: 'LOCKED',
        locked_at: now,
        created_by: admin.id,
        created_at: now,
      },
    });
    await db.survey_versions.create({
      data: {
        survey_id: survey.id,
        version_no: 2,
        status: 'DRAFT',
        created_by: admin.id,
        created_at: now,
      },
    });
    const question = await db.questions.create({
      data: {
        survey_version_id: version.id,
        question_text: 'Synthetic retained feedback',
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
        participant_scope: 'SELECTED_GENERATIONS',
        status: 'CLOSED',
        created_by: admin.id,
        created_at: now,
        updated_at: now,
      },
    });
    const labels = {
      schema_version: 1,
      generation: { id: String(cohorts[0]), name: 'Captured DS Gen 1' },
    };
    await db.evaluation_generation_targets.create({
      data: {
        evaluation_id: evaluation.id,
        generation_id: cohorts[0],
        historical_labels: labels,
        labels_captured_at: now,
      },
    });
    await db.evaluation_group_targets.create({
      data: {
        evaluation_id: evaluation.id,
        academic_year_id: years[0],
        generation_id: cohorts[0],
        major_id: majors[0],
        year_level: 1,
        class_group: 'A',
        historical_labels: {
          ...labels,
          major: {
            id: String(majors[0]),
            code: 'DS',
            name: 'Captured Data Science',
          },
        },
        labels_captured_at: now,
      },
    });
    const participant = await db.evaluation_participants.create({
      data: {
        evaluation_id: evaluation.id,
        student_id: BigInt(pending.user_id),
        survey_version_id: version.id,
        created_at: now,
      },
    });
    await db.assessment_drafts.create({
      data: {
        participant_id: participant.id,
        survey_version_id: version.id,
        answers_json: { retained: 'Synthetic saved draft' },
        created_at: now,
        updated_at: now,
      },
    });
    await db.evaluation_participants.create({
      data: {
        evaluation_id: evaluation.id,
        student_id: BigInt(completed.user_id),
        survey_version_id: version.id,
        has_submitted: true,
        submitted_at: now,
        created_at: now,
      },
    });
    const response = await db.responses.create({
      data: {
        evaluation_id: evaluation.id,
        survey_version_id: version.id,
        submitted_at: now,
        created_at: now,
      },
    });
    await db.answers.create({
      data: {
        response_id: response.id,
        question_id: question.id,
        text_value: 'Synthetic retained anonymous feedback',
        created_at: now,
      },
    });
    const before = await fixture.snapshot(db);
    const profiles = await db.students.findMany({ orderBy: { id: 'asc' } });
    for (const s of [pending, completed]) {
      const moved = await send(
        payload(s.id, {
          generation_id: String(cohorts[2]),
          major_id: String(majors[1]),
          progression_action: 'TRANSFER',
        }),
      );
      expect(moved.status).toBe(201);
      safe(moved.body);
    }
    const after = await fixture.snapshot(db);
    for (const table of before) {
      if (table.name === 'students') continue;
      const current = after.find((item) => item.name === table.name)!
        .hashes as Array<{ hash: string }>;
      if (
        [
          'student_academic_records',
          'student_cohort_assignment_events',
        ].includes(table.name)
      ) {
        expect(current).toHaveLength(
          (table.hashes as Array<{ hash: string }>).length + 2,
        );
        const hashes = new Set(current.map((item) => item.hash));
        expect(
          (table.hashes as Array<{ hash: string }>).every((item) =>
            hashes.has(item.hash),
          ),
        ).toBe(true);
      } else expect(current).toEqual(table.hashes);
    }
    const changed = new Set([pending.id, completed.id]);
    for (const profile of profiles) {
      const saved = await db.students.findUniqueOrThrow({
        where: { id: profile.id },
      });
      if (changed.has(String(profile.id)))
        expect(saved).toEqual({
          ...profile,
          generation_id: cohorts[2],
          updated_at: saved.updated_at,
        });
      else expect(saved).toEqual(profile);
    }
  }, 20000);
  it('returns safe explicit metadata in list/details and keeps the complete feature disabled', async () => {
    const response = await unchanged(
      () => api().get('/api/student-academic-records').set(auth()),
      200,
    );
    safe(response.body);
    expect(
      response.body.find(
        (record: { student_id: string; academic_year_id: string }) =>
          record.student_id === trackedId &&
          record.academic_year_id === String(years[0]),
      ),
    ).toMatchObject({
      generation_id: String(cohorts[0]),
      student_generations: {
        major_id: String(majors[0]),
        generation_number: 1,
      },
    });
    const me = await api().get('/api/auth/me').set(auth());
    expect(me.body.capabilities.major_scoped_generations).not.toBe(true);
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(
      doc.paths['/api/student-academic-records'].post?.description,
    ).toContain('generation_id');
    expect(
      doc.paths['/api/student-academic-records/{id}'].put?.description,
    ).toContain('immutable');
    const schema = doc.components!.schemas!.CreateStudentAcademicRecordDto as {
      properties: Record<string, { type: string }>;
    };
    expect(schema.properties.generation_id.type).toBe('string');
  });
});
