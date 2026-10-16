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

describe('Student cohort creation and safe personal edits (owned schema HTTP)', () => {
  const fixture = new CohortImportFixture();
  let app: INestApplication;
  let db: PrismaClient;
  const tokens: Record<string, string> = {};
  const majors: bigint[] = [],
    years: bigint[] = [],
    cohorts: bigint[] = [],
    departments: bigint[] = [];
  let legacyId: bigint;
  let canonicalId: string;
  let serial = 0;
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const payload = (extra: Record<string, unknown> = {}) => ({
    student_code: `crud-${++serial}`,
    full_name: 'Synthetic Cohort Student',
    email: `crud-${serial}@example.test`,
    password: 'SyntheticCrud123!',
    generation_id: String(cohorts[0]),
    academic_year_id: String(years[1]),
    major_id: String(majors[0]),
    year_level: 2,
    class_group: ' a   b ',
    ...extra,
  });
  const post = (body: Record<string, unknown>, role = 'ADMIN') =>
    api().post('/api/students').set(auth(role)).send(body);
  const put = (
    id: string | bigint,
    body: Record<string, unknown>,
    role = 'ADMIN',
  ) => api().put(`/api/students/${id}`).set(auth(role)).send(body);
  async function unchanged(
    operation: () => PromiseLike<request.Response>,
    status: number,
  ) {
    const before = await fixture.snapshot(db);
    const response = await operation();
    expect(response.status).toBe(status);
    expect(await fixture.snapshot(db)).toEqual(before);
    return response;
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
  function safe(value: unknown) {
    if (Array.isArray(value)) value.forEach(safe);
    else if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'auth_version',
          'mapping_operation_id',
          'mapping_operations',
          'cohort_assignment_events',
        ]).not.toContain(key);
        safe(child);
      }
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    const hash = await bcrypt.hash('SyntheticCrud123!', 10);
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
              code: `CRUD-${index}`,
              name: `Synthetic CRUD ${index}`,
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
    for (const [index, start] of [2090, 2091, 2092, null].entries())
      years.push(
        (
          await db.academic_years.create({
            data: { name: `CRUD year ${index}`, start_year: start },
          })
        ).id,
      );
    for (const [major, number, year] of [
      [0, 1, 0],
      [0, 2, 1],
      [1, 1, 1],
      [2, 1, 0],
      [0, 3, 3],
    ])
      cohorts.push(
        (
          await db.student_generations.create({
            data: {
              name: `Gen ${number}`,
              major_id: majors[major],
              generation_number: number,
              ownership_state: 'MAJOR_SCOPED',
              entry_academic_year_id: years[year],
            },
          })
        ).id,
      );
    for (const name of ['Legacy first', 'Legacy second'])
      cohorts.push(
        (
          await db.student_generations.create({
            data: { name, entry_academic_year_id: years[0] },
          })
        ).id,
      );
    const user = await db.users.create({
      data: {
        full_name: 'Synthetic old paused student',
        role: 'STUDENT',
        password_hash: hash,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const legacy = await db.students.create({
      data: {
        user_id: user.id,
        student_code: 'legacy-existing',
        generation_id: cohorts[5],
        notes: 'Historical note',
      },
    });
    legacyId = legacy.id;
    await db.student_academic_records.create({
      data: {
        student_id: legacy.id,
        academic_year_id: years[0],
        major_id: majors[0],
        year_level: 1,
        class_group: 'OLD',
        progression_action: 'PAUSE',
      },
    });
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
          password: 'SyntheticCrud123!',
        });
      expect(response.status).toBe(200);
      tokens[role] = response.body.access_token;
    }
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

  it('creates independent DS/FE students with explicit yearly cohort and INITIAL event in one commit', async () => {
    for (const index of [0, 1]) {
      const response = await post(
        payload(
          index
            ? {
                generation_id: String(cohorts[2]),
                major_id: String(majors[1]),
                year_level: 3,
              }
            : {},
        ),
      );
      expect(response.status).toBe(201);
      if (!index) canonicalId = response.body.id;
      safe(response.body);
      expect(response.body.id).not.toBe(response.body.user_id);
      const cohortId = String(cohorts[index ? 2 : 0]);
      expect(response.body.student_generations).toMatchObject({
        id: cohortId,
        ownership_state: 'MAJOR_SCOPED',
        major_id: String(majors[index]),
        generation_number: 1,
        majors: { id: String(majors[index]) },
        entry_academic_year_id: String(years[index]),
      });
      expect(response.body.student_academic_records[0]).toMatchObject({
        generation_id: cohortId,
        major_id: String(majors[index]),
        class_group: 'A B',
        student_generations: {
          id: cohortId,
          major_id: String(majors[index]),
          generation_number: 1,
        },
      });
      const saved = await history(response.body.id);
      expect(saved.events).toHaveLength(1);
      expect(saved.events[0]).toMatchObject({
        action: 'INITIAL',
        academic_record_id: saved.records[0].id,
        generation_id: BigInt(cohortId),
        student_id: BigInt(response.body.id),
        major_id: majors[index],
        mapping_operation_id: null,
      });
    }
  });
  it('exposes safe explicit cohort metadata in student list and detail without rewriting rows', async () => {
    const detail = await unchanged(
      () => api().get(`/api/students/${canonicalId}`).set(auth()),
      200,
    );
    expect(detail.body.student_generations.generation_number).toBe(1);
    safe(detail.body);
    const list = await unchanged(
      () =>
        api()
          .get('/api/students')
          .query({ generation_id: String(cohorts[0]) })
          .set(auth()),
      200,
    );
    expect(
      list.body.data.find((item: { id: string }) => item.id === canonicalId)
        .student_generations.majors.code,
    ).toBe('DS');
    safe(list.body);
  });
  it('keeps unresolved legacy creation transitional and old yearly links null', async () => {
    const response = await post(payload({ generation_id: String(cohorts[5]) }));
    expect(response.status).toBe(201);
    expect(response.body.student_generations).toMatchObject({
      ownership_state: 'LEGACY_READ_ONLY',
      major_id: null,
      generation_number: null,
      majors: null,
    });
    expect(response.body.student_academic_records[0]).toMatchObject({
      generation_id: null,
      student_generations: null,
    });
    expect((await history(response.body.id)).events).toEqual([]);
  });
  it('supports null email and blank group without inventing yearly eligibility', async () => {
    const response = await post(payload({ email: null, class_group: '  ' }));
    expect(response.status).toBe(201);
    expect(response.body.users.email).toBeNull();
    expect(response.body.student_academic_records[0].class_group).toBeNull();
    const detail = await api()
      .get(`/api/students/${response.body.id}`)
      .query({ academic_year_id: String(years[1]) })
      .set(auth());
    expect(detail.status).toBe(200);
    expect(detail.body.academic_context.placement_eligible).toBe(false);
    expect(detail.body.academic_context.ineligibility_reason).toBe(
      'MISSING_YEARLY_GROUP',
    );
  });
  it.each([
    ['wrong owner', () => ({ major_id: String(majors[1]) })],
    [
      'inactive department',
      () => ({
        generation_id: String(cohorts[3]),
        major_id: String(majors[2]),
      }),
    ],
    [
      'future entry year',
      () => ({
        generation_id: String(cohorts[1]),
        academic_year_id: String(years[0]),
      }),
    ],
    ['unstructured entry', () => ({ generation_id: String(cohorts[4]) })],
    ['unstructured placement', () => ({ academic_year_id: String(years[3]) })],
  ] as Array<[string, () => Record<string, unknown>]>)(
    'rejects %s before creating any account or history',
    async (_label, extra) => {
      await unchanged(() => post(payload(extra())), 400);
    },
  );
  for (const field of ['generation_id', 'academic_year_id', 'major_id']) {
    it(`rejects absent ${field} references without writes`, async () => {
      await unchanged(
        () => post(payload({ [field]: '9000000000000000000' })),
        404,
      );
    });
    for (const value of [1, '0', '-1', '1.5', '9223372036854775808', null])
      it(`rejects create ${field} ${String(value)}`, async () => {
        await unchanged(() => post(payload({ [field]: value })), 400);
      });
  }
  it.each([
    ['blank code', { student_code: '  ' }],
    ['blank name', { full_name: '  ' }],
    ['UTF8 password overflow', { password: '🎓'.repeat(19) }],
    ['invalid year level', { year_level: 6 }],
  ])('rejects create %s without writes', async (_label, extra) => {
    await unchanged(() => post(payload(extra as Record<string, unknown>)), 400);
  });
  it('does not interpret a cohort number as its database ID', async () => {
    await db.student_generations.create({
      data: {
        name: 'Gen 77',
        major_id: majors[0],
        generation_number: 77,
        ownership_state: 'MAJOR_SCOPED',
        entry_academic_year_id: years[0],
      },
    });
    expect(
      await db.student_generations.findUnique({ where: { id: 77n } }),
    ).toBeNull();
    await unchanged(() => post(payload({ generation_id: '77' })), 404);
  });
  it.each(['student_code', 'email'])(
    'rolls back every new row on duplicate %s',
    async (field) => {
      const body = payload();
      expect((await post(body)).status).toBe(201);
      await unchanged(
        () =>
          post(payload({ [field]: body[field as 'student_code' | 'email'] })),
        409,
      );
    },
  );
  it('creates one account/profile/placement/event under concurrent duplicate submissions', async () => {
    const before = [
      await db.users.count(),
      await db.students.count(),
      await db.student_academic_records.count(),
      await db.student_cohort_assignment_events.count(),
    ];
    const body = payload({ email: undefined });
    const responses = await Promise.all([post(body), post(body)]);
    expect(responses.map((value) => value.status).sort()).toEqual([201, 409]);
    expect([
      await db.users.count(),
      await db.students.count(),
      await db.student_academic_records.count(),
      await db.student_cohort_assignment_events.count(),
    ]).toEqual(before.map((value) => value + 1));
  });
  it('rolls back account/profile/placement when immutable assignment evidence cannot be saved', async () => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION reject_owned_crud() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic private evidence failure' USING ERRCODE='23503'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER reject_owned_crud BEFORE INSERT ON student_cohort_assignment_events FOR EACH ROW EXECUTE FUNCTION reject_owned_crud()',
    );
    try {
      const response = await unchanged(() => post(payload()), 409);
      expect(JSON.stringify(response.body)).not.toContain(
        'Synthetic private evidence failure',
      );
    } finally {
      await db.$executeRawUnsafe(
        'DROP TRIGGER reject_owned_crud ON student_cohort_assignment_events',
      );
      await db.$executeRawUnsafe('DROP FUNCTION reject_owned_crud()');
    }
  });
  it.each([
    ['canonical to another major', () => canonicalId, () => cohorts[2]],
    ['canonical to another number', () => canonicalId, () => cohorts[1]],
    ['canonical to legacy', () => canonicalId, () => cohorts[5]],
    ['legacy to canonical', () => legacyId, () => cohorts[0]],
    ['legacy to another legacy', () => legacyId, () => cohorts[6]],
  ] as Array<[string, () => string | bigint, () => bigint]>)(
    'blocks %s through personal edits before accompanying writes',
    async (_label, id, cohort) => {
      const response = await unchanged(
        () =>
          put(id(), {
            generation_id: String(cohort()),
            full_name: 'Must not save',
            email: 'must-not-save@example.test',
            notes: 'Must not save',
            status: 'INACTIVE',
          }),
        409,
      );
      expect(response.body.code).toBe('COHORT_CHANGE_REQUIRES_TRANSFER');
    },
  );
  for (const kind of ['canonical', 'legacy']) {
    it(`accepts identical ${kind} cohort as a no-op including timestamps`, async () => {
      await unchanged(
        () =>
          put(kind === 'canonical' ? canonicalId : legacyId, {
            generation_id: String(cohorts[kind === 'canonical' ? 0 : 5]),
          }),
        200,
      );
    });
    it(`accepts an empty ${kind} personal edit as a no-op`, async () => {
      await unchanged(
        () => put(kind === 'canonical' ? canonicalId : legacyId, {}),
        200,
      );
    });
  }
  it('preserves canonical cohort, yearly records, INITIAL evidence, role and password during personal edits', async () => {
    const before = await history(canonicalId);
    const profile = await db.students.findUniqueOrThrow({
      where: { id: BigInt(canonicalId) },
      include: { users: true },
    });
    const response = await put(canonicalId, {
      generation_id: String(cohorts[0]),
      student_code: ' UPDATED-CODE ',
      full_name: ' Updated name ',
      email: ' UPDATED@EXAMPLE.TEST ',
      gender: 'FEMALE',
      notes: ' Updated note ',
      role: 'ADMIN',
      password: 'IgnoredPassword123!',
    });
    expect(response.status).toBe(400); // Email syntax is validated before service normalization.
    const valid = await put(canonicalId, {
      generation_id: String(cohorts[0]),
      student_code: ' UPDATED-CODE ',
      full_name: ' Updated name ',
      email: 'UPDATED@EXAMPLE.TEST',
      gender: 'FEMALE',
      notes: ' Updated note ',
      role: 'ADMIN',
      password: 'IgnoredPassword123!',
    });
    expect(valid.status).toBe(200);
    expect(valid.body).toMatchObject({
      generation_id: String(cohorts[0]),
      student_code: 'updated-code',
      notes: 'Updated note',
      users: {
        full_name: 'Updated name',
        email: 'updated@example.test',
        role: 'STUDENT',
        gender: 'FEMALE',
      },
    });
    safe(valid.body);
    expect(await history(canonicalId)).toEqual(before);
    const user = await db.users.findUniqueOrThrow({
      where: { id: profile.user_id },
    });
    expect(user.password_hash).toBe(profile.users.password_hash);
  });
  it('preserves an already-linked paused legacy history and ignores academic fields on personal updates', async () => {
    const before = await history(legacyId);
    const response = await put(legacyId, {
      generation_id: String(cohorts[5]),
      full_name: 'Legacy renamed',
      major_id: String(majors[1]),
      academic_year_id: String(years[1]),
      year_level: 5,
      class_group: 'NEW',
      progression_action: 'RESUME',
    });
    expect(response.status).toBe(200);
    expect(response.body.users.full_name).toBe('Legacy renamed');
    expect(await history(legacyId)).toEqual(before);
    expect(before.records[0].progression_action).toBe('PAUSE');
  });
  it('clears nullable personal fields without rewriting cohort history', async () => {
    const before = await history(canonicalId);
    const response = await put(canonicalId, {
      email: null,
      gender: null,
      notes: null,
    });
    expect(response.status).toBe(200);
    expect(response.body.users.email).toBeNull();
    expect(response.body.users.gender).toBeNull();
    expect(response.body.notes).toBeNull();
    expect(await history(canonicalId)).toEqual(before);
  });
  it.each(['student_code', 'full_name', 'generation_id', 'status'])(
    'rejects explicit null %s update without writes',
    async (field) => {
      await unchanged(
        () => put(canonicalId, { [field]: null, notes: 'Must not save' }),
        400,
      );
    },
  );
  it.each(['student_code', 'full_name'])(
    'rejects whitespace %s update without writes',
    async (field) => {
      await unchanged(
        () => put(canonicalId, { [field]: '  ', notes: 'Must not save' }),
        400,
      );
    },
  );
  it.each([1, '0', '-1', '1.5', '9223372036854775808'])(
    'rejects invalid update cohort ID %s without writes',
    async (value) => {
      await unchanged(() => put(canonicalId, { generation_id: value }), 400);
    },
  );
  it('retains historical records and INITIAL events when deletion is rejected', async () => {
    await unchanged(
      () => api().delete(`/api/students/${canonicalId}`).set(auth()),
      409,
    );
  });
  it('preserves cohort, major and year IDs above JavaScript safe integer precision', async () => {
    const id = 9007199254740993n;
    await db.majors.create({
      data: {
        id,
        code: 'BIG',
        name: 'BigInt major',
        department_id: departments[0],
      },
    });
    await db.academic_years.create({
      data: { id, name: 'BigInt year', start_year: 2090 },
    });
    await db.student_generations.create({
      data: {
        id,
        name: 'Gen 12',
        major_id: id,
        generation_number: 12,
        ownership_state: 'MAJOR_SCOPED',
        entry_academic_year_id: id,
      },
    });
    const response = await post(
      payload({
        generation_id: String(id),
        academic_year_id: String(id),
        major_id: String(id),
      }),
    );
    expect(response.status).toBe(201);
    expect(response.body.student_generations).toMatchObject({
      id: String(id),
      major_id: String(id),
      generation_number: 12,
    });
    expect(response.body.student_academic_records[0]).toMatchObject({
      generation_id: String(id),
      major_id: String(id),
      academic_year_id: String(id),
    });
    await unchanged(
      () => put(response.body.id, { generation_id: String(id) }),
      200,
    );
  });
  it.each(['LECTURER', 'STUDENT'])(
    'denies %s creation and personal edits without writes',
    async (role) => {
      await unchanged(() => post(payload(), role), 403);
      await unchanged(
        () => put(canonicalId, { full_name: 'Denied' }, role),
        403,
      );
    },
  );
  it('denies anonymous creation and updates without writes', async () => {
    await unchanged(() => api().post('/api/students').send(payload()), 401);
    await unchanged(
      () => api().put(`/api/students/${canonicalId}`).send({ notes: 'Denied' }),
      401,
    );
  });
  it('documents the immutable personal cohort boundary and retains disabled full capability', async () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(doc.paths['/api/students'].post?.description).toContain('INITIAL');
    expect(doc.paths['/api/students/{id}'].put?.description).toContain(
      'COHORT_CHANGE_REQUIRES_TRANSFER',
    );
    const me = await api().get('/api/auth/me').set(auth());
    expect(me.body.capabilities.major_scoped_generations).not.toBe(true);
  });
});
