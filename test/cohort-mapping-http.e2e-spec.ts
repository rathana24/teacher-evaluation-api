import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CohortImportFixture } from './helpers/cohort-import-fixture';
import {
  CohortMappingProposalDto,
  CohortMappingManifestDto,
} from '../src/student-generations/dto/cohort-mapping.dto';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Authenticated reviewed cohort mapping (owned migrated-schema HTTP)', () => {
  const fixture = new CohortImportFixture();
  let app: INestApplication, db: PrismaClient;
  const originalFlag = process.env.COHORT_MAPPING_ENABLED;
  const path = '/api/student-generations/mapping';
  const tokens: Record<string, string> = {};
  const users: bigint[] = [],
    majors: bigint[] = [],
    years: bigint[] = [],
    cohorts: bigint[] = [],
    profiles: bigint[] = [],
    records: bigint[] = [];
  let saved: { review_id: string; manifest: CohortMappingManifestDto };
  let result: Record<string, any>;
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const api = () => request(app.getHttpServer());
  const get = (suffix = 'inventory', role = 'ADMIN') =>
    api().get(`${path}/${suffix}`).set(auth(role));
  const post = (suffix: string, body: object, role = 'ADMIN') =>
    api().post(`${path}/${suffix}`).set(auth(role)).send(body);
  async function proposal(): Promise<CohortMappingProposalDto> {
    const response = await get();
    expect(response.status).toBe(200);
    const data = response.body;
    const ref = (row: { id: string; expected_sha256: string }) => ({
      id: row.id,
      expected_sha256: row.expected_sha256,
    });
    return {
      source_fingerprint: data.source_fingerprint,
      reason:
        'Explicit synthetic review; retain unknown and original frozen references.',
      cohorts: data.cohorts.map((row: any) => ({
        ...ref(row),
        disposition:
          row.ownership_state === 'MAJOR_SCOPED'
            ? 'KEEP_EXISTING_CANONICAL'
            : row.id === String(cohorts[0])
              ? 'SPLIT_KEEP_LEGACY_REFERENCE'
              : 'RETAIN_UNRESOLVED',
        destinations:
          row.id === String(cohorts[0]) &&
          row.ownership_state !== 'MAJOR_SCOPED'
            ? [0, 1].map((index) => ({
                key: index ? 'FE' : 'DS',
                major_id: String(majors[index]),
                generation_number: 1,
                entry_academic_year_id: String(years[index]),
                starting_year_level: 1,
                existing_generation_id: null,
              }))
            : [],
      })),
      profiles: data.profiles.map((row: any) => ({
        ...ref(row),
        destination_key: row.id === String(profiles[0]) ? 'FE' : null,
      })),
      records: data.records.map((row: any) => ({
        ...ref(row),
        destination_key:
          row.generation_id !== null
            ? null
            : row.id === String(records[1])
              ? 'FE'
              : 'DS',
      })),
      scopes: data.scopes.map((row: any) => ({
        ...ref(row),
        destination_key: 'DS',
      })),
      frozen_targets: data.frozen_targets.map((row: any) => ({
        ...ref(row),
        disposition: 'KEEP_ORIGINAL_REFERENCE',
      })),
    };
  }
  async function snapshot(withReviews = true) {
    const rows = await fixture.snapshot(db);
    return withReviews
      ? rows
      : rows.filter((row) => row.name !== 'reviewed_operations');
  }
  async function preview(input?: CohortMappingProposalDto) {
    const body = input ?? (await proposal());
    const before = await snapshot(false);
    const response = await post('preview', body);
    expect(response.status).toBe(200);
    expect(await snapshot(false)).toEqual(before);
    return response.body as {
      review_id: string;
      expires_at: string;
      manifest: CohortMappingManifestDto;
      impact: any;
    };
  }
  async function unchanged(
    operation: () => PromiseLike<request.Response>,
    status: number,
    code?: string,
  ) {
    const before = await snapshot();
    const response = await operation();
    expect(response.status).toBe(status);
    if (code) expect(response.body.code).toBe(code);
    expect(await snapshot()).toEqual(before);
    return response;
  }
  function safe(value: unknown) {
    if (Array.isArray(value)) value.forEach(safe);
    else if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'auth_version',
          'notes',
          'answers_json',
          'text_value',
          'student_code',
        ]).not.toContain(key);
        safe(child);
      }
    if (typeof value === 'string') expect(value).not.toContain('PRIVATE');
  }
  beforeAll(async () => {
    process.env.COHORT_MAPPING_ENABLED = 'true';
    await fixture.open();
    db = fixture.db;
    const now = new Date(),
      hash = await bcrypt.hash('SyntheticMapping123!', 10);
    for (const [index, role] of (
      ['ADMIN', 'ADMIN', 'STUDENT', 'STUDENT', 'STUDENT', 'LECTURER'] as const
    ).entries())
      users.push(
        (
          await db.users.create({
            data: {
              email: `map${index}@example.test`,
              full_name: `Synthetic map ${index}`,
              role,
              password_hash: hash,
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    const department = await db.departments.create({
      data: { code: 'MH', name: 'Synthetic mapping', status: 'ACTIVE' },
    });
    for (const code of ['DS', 'FE'])
      majors.push(
        (
          await db.majors.create({
            data: { code, name: code, department_id: department.id },
          })
        ).id,
      );
    for (const start of [2080, 2081])
      years.push(
        (
          await db.academic_years.create({
            data: { name: `MH ${start}`, start_year: start },
          })
        ).id,
      );
    for (const name of ['Shared legacy', 'Unused legacy'])
      cohorts.push(
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
    cohorts.push(
      (
        await db.student_generations.create({
          data: {
            name: 'Gen 3',
            ownership_state: 'MAJOR_SCOPED',
            major_id: majors[1],
            generation_number: 3,
            entry_academic_year_id: years[1],
            starting_year_level: 1,
          },
        })
      ).id,
    );
    for (const index of [0, 1, 2])
      profiles.push(
        (
          await db.students.create({
            data: {
              ...(index === 1 ? { id: 9007199254740993n } : {}),
              user_id: users[index + 2],
              student_code: `SYN-MH-${index}`,
              generation_id: cohorts[index === 2 ? 2 : 0],
              notes: 'PRIVATE synthetic mapping note',
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    for (const [index, id] of [10n, 2n].entries())
      records.push(
        (
          await db.student_academic_records.create({
            data: {
              id,
              student_id: profiles[0],
              academic_year_id: years[index],
              major_id: majors[index],
              year_level: 1,
              class_group: index ? 'B' : 'A',
              progression_action: index ? 'TRANSFER' : 'PAUSE',
            },
          })
        ).id,
      );
    await db.$transaction(async (tx) => {
      const record = await tx.student_academic_records.create({
        data: {
          id: 20n,
          student_id: profiles[2],
          academic_year_id: years[1],
          major_id: majors[1],
          generation_id: cohorts[2],
          year_level: 1,
          class_group: 'B',
        },
      });
      await tx.student_cohort_assignment_events.create({
        data: {
          academic_record_id: record.id,
          student_id: profiles[2],
          academic_year_id: years[1],
          major_id: majors[1],
          generation_id: cohorts[2],
          action: 'INITIAL',
        },
      });
    });
    records.push(
      (
        await db.student_academic_records.create({
          data: {
            id: 30n,
            student_id: profiles[2],
            academic_year_id: years[0],
            major_id: majors[0],
            year_level: 1,
            class_group: 'A',
          },
        })
      ).id,
    );
    const semester = await db.semesters.create({
      data: {
        semester_name: 'MH semester',
        semester_number: 1,
        academic_year_id: years[0],
        created_at: now,
        updated_at: now,
      },
    });
    const course = await db.courses.create({
      data: {
        course_code: 'MH001',
        course_name: 'Synthetic MH course',
        department_id: department.id,
        created_at: now,
        updated_at: now,
      },
    });
    const offering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: users[5],
        semester_id: semester.id,
        year_level: 1,
        class_type: 'TD',
        section_code: 'MH',
        created_at: now,
        updated_at: now,
        group_scopes: {
          create: {
            academic_year_id: years[0],
            generation_id: cohorts[0],
            major_id: majors[0],
            year_level: 1,
            class_group: 'A',
          },
        },
      },
    });
    const survey = await db.surveys.create({
      data: {
        title: 'Synthetic mapping history',
        created_by: users[0],
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
        created_by: users[0],
        created_at: now,
      },
    });
    await db.survey_versions.create({
      data: {
        survey_id: survey.id,
        version_no: 2,
        status: 'DRAFT',
        created_by: users[0],
        created_at: now,
      },
    });
    const question = await db.questions.create({
      data: {
        survey_version_id: version.id,
        question_text: 'PRIVATE synthetic question',
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
        participant_scope: 'SELECTED_GENERATIONS',
        created_by: users[0],
        created_at: now,
        updated_at: now,
      },
    });
    const labels = {
      schema_version: 1,
      generation: { id: String(cohorts[0]), name: 'Captured original cohort' },
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
        historical_labels: labels,
        labels_captured_at: now,
      },
    });
    for (const [index, student_id] of users.slice(2, 4).entries()) {
      await db.enrollments.create({
        data: { course_offering_id: offering.id, student_id, enrolled_at: now },
      });
      const participant = await db.evaluation_participants.create({
        data: {
          evaluation_id: evaluation.id,
          student_id,
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
            answers_json: { protected: 'PRIVATE draft' },
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
        text_value: 'PRIVATE answer',
        created_at: now,
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
    for (const [role, index] of [
      ['ADMIN', 0],
      ['OTHER_ADMIN', 1],
      ['STUDENT', 2],
      ['LECTURER', 5],
    ] as const) {
      const response = await api()
        .post('/api/auth/login')
        .send({
          identifier: `map${index}@example.test`,
          password: 'SyntheticMapping123!',
        });
      expect(response.status).toBe(200);
      tokens[role] = response.body.access_token;
    }
  }, 90000);
  afterEach(async () => {
    process.env.COHORT_MAPPING_ENABLED = 'true';
    await fixture.unchangedPublic();
  });
  afterAll(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await fixture.close();
      } finally {
        if (originalFlag === undefined)
          delete process.env.COHORT_MAPPING_ENABLED;
        else process.env.COHORT_MAPPING_ENABLED = originalFlag;
      }
    }
  });

  it('inspects complete safe references read-only, including high IDs and frozen target context', async () => {
    const response = await unchanged(() => get(), 200);
    safe(response.body);
    expect(response.body.database).toBe(selectedTestDatabase());
    expect(response.body.schema).toBe(fixture.schema);
    expect(response.body.profiles.map((row: any) => row.id)).toContain(
      '9007199254740993',
    );
    expect(response.body.records).toHaveLength(4);
    expect(response.body.frozen_targets).toHaveLength(2);
  });
  it('reports the missing migration prerequisite without mapping or review writes', async () => {
    expect(await db.reviewed_operations.count()).toBe(0);
    await db.$executeRawUnsafe(
      "DO $$ BEGIN ALTER TABLE reviewed_operations DROP CONSTRAINT reviewed_operations_kind_check; ALTER TABLE reviewed_operations ADD CONSTRAINT reviewed_operations_kind_check CHECK (operation_kind IN ('ENROLL_GROUP','CREATE_EVALUATION','REASSIGN_ENROLLMENT','BULK_GROUP_PLACEMENT','OPEN_ASSIGNED_VERSION','APPLY_LATEST_VERSION')); END $$",
    );
    try {
      await unchanged(() => get(), 409, 'MAPPING_MIGRATION_REQUIRED');
    } finally {
      await db.$executeRawUnsafe(
        fs.readFileSync(
          'prisma/migrations/20261016030000_add_course_creation_receipts/migration.sql',
          'utf8',
        ),
      );
    }
  });
  it.each(['inventory', 'preview', 'confirm', 'receipts'])(
    'defaults disabled without mapping or review writes for %s',
    async (route) => {
      process.env.COHORT_MAPPING_ENABLED = 'false';
      await unchanged(
        () =>
          route === 'inventory'
            ? get()
            : route === 'receipts'
              ? get(`receipts/${randomUUID()}`)
              : post(route, {}),
        503,
        'COHORT_MAPPING_DISABLED',
      );
    },
  );
  it.each(['LECTURER', 'STUDENT'])(
    'rejects direct mapping routes for %s',
    async (role) => {
      for (const route of ['inventory', 'preview', 'confirm', 'receipts'])
        await unchanged(
          () =>
            route === 'inventory'
              ? get(route, role)
              : route === 'receipts'
                ? get(`receipts/${randomUUID()}`, role)
                : post(route, {}, role),
          403,
        );
    },
  );
  it('requires authentication before inventory, preview, confirmation and receipts', async () => {
    for (const route of ['inventory', 'preview', 'confirm', 'receipts'])
      await unchanged(
        () =>
          route === 'inventory'
            ? api().get(`${path}/inventory`)
            : route === 'receipts'
              ? api().get(`${path}/receipts/${randomUUID()}`)
              : api().post(`${path}/${route}`).send({}),
        401,
      );
  });
  it('rejects disabled and revoked synthetic administrator sessions', async () => {
    await db.users.update({
      where: { id: users[1] },
      data: { status: 'INACTIVE' },
    });
    try {
      await unchanged(() => get('inventory', 'OTHER_ADMIN'), 401);
    } finally {
      await db.users.update({
        where: { id: users[1] },
        data: { status: 'ACTIVE' },
      });
    }
    await db.users.update({
      where: { id: users[1] },
      data: { auth_version: 1 },
    });
    try {
      await unchanged(() => get('inventory', 'OTHER_ADMIN'), 401);
    } finally {
      await db.users.update({
        where: { id: users[1] },
        data: { auth_version: 0 },
      });
    }
  });
  it('authors target, reviewer, dates and operation ID on the server and previews only review storage', async () => {
    const reviewed = await preview();
    safe(reviewed);
    expect(reviewed.manifest).toMatchObject({
      database: selectedTestDatabase(),
      schema: fixture.schema,
      reviewer_id: String(users[0]),
    });
    expect(reviewed.manifest.operation_id).toMatch(/^[a-f0-9-]{36}$/);
    expect(reviewed.impact.mapped).toEqual({
      profiles: 1,
      records: 3,
      scopes: 1,
    });
    expect(reviewed.impact.retained_frozen_targets).toBe(2);
    expect(await db.cohort_mapping_operations.count()).toBe(0);
  });
  const invalid: Array<[string, (proposal: any) => void, number, string]> = [
    [
      'unknown root field',
      (p) => {
        p.unexpected = true;
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'client-selected normal database',
      (p) => {
        p.database = 'teacher_evaluation';
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'client reviewer',
      (p) => {
        p.reviewer_id = '999';
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'client operation UUID',
      (p) => {
        p.operation_id = randomUUID();
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'missing records section',
      (p) => {
        delete p.records;
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'unknown nested field',
      (p) => {
        p.records[0].unexpected = true;
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'numeric row ID',
      (p) => {
        p.records[0].id = 2;
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'overflow row ID',
      (p) => {
        p.records[0].id = '9223372036854775808';
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'blank reason',
      (p) => {
        p.reason = ' ';
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'null destination array',
      (p) => {
        p.cohorts[0].destinations = null;
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'oversized cohort review',
      (p) => {
        p.cohorts = Array.from({ length: 501 }, () => null);
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'string cohort number',
      (p) => {
        p.cohorts[0].destinations[0].generation_number = '1';
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'overflow cohort number',
      (p) => {
        p.cohorts[0].destinations[0].generation_number = 2147483648;
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'duplicate reference',
      (p) => {
        p.records[1] = structuredClone(p.records[0]);
      },
      400,
      'INCOMPLETE_MAPPING',
    ],
    [
      'omitted reference',
      (p) => {
        p.profiles.pop();
      },
      400,
      'INCOMPLETE_MAPPING',
    ],
    [
      'changed source hash',
      (p) => {
        p.records[0].expected_sha256 = '0'.repeat(64);
      },
      409,
      'MAPPING_STALE',
    ],
    [
      'unknown destination',
      (p) => {
        p.records[0].destination_key = 'UNKNOWN';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'wrong recorded major',
      (p) => {
        p.records.find(
          (row: any) => row.id === String(records[0]),
        ).destination_key = 'FE';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'orphan ownership guess',
      (p) => {
        p.profiles.find(
          (row: any) => row.id === String(profiles[1]),
        ).destination_key = 'DS';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'wrong latest profile',
      (p) => {
        p.profiles.find(
          (row: any) => row.id === String(profiles[0]),
        ).destination_key = 'DS';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'split with unchanged stale profile',
      (p) => {
        p.profiles.find(
          (row: any) => row.id === String(profiles[0]),
        ).destination_key = null;
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'resolved record relabel',
      (p) => {
        p.records.find((row: any) => row.id === '20').destination_key = 'FE';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'duplicate destination key',
      (p) => {
        p.cohorts[0].destinations[1].key = 'DS';
      },
      409,
      'DESTINATION_CONFLICT',
    ],
    [
      'duplicate major-number pair',
      (p) => {
        p.cohorts[0].destinations[1].major_id = String(majors[0]);
      },
      409,
      'DESTINATION_CONFLICT',
    ],
    [
      'entry after record year',
      (p) => {
        p.cohorts[0].destinations[0].entry_academic_year_id = String(years[1]);
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'missing destination year',
      (p) => {
        p.cohorts[0].destinations[0].entry_academic_year_id =
          '9223372036854775807';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'missing destination major',
      (p) => {
        p.cohorts[0].destinations[0].major_id = '9223372036854775807';
      },
      400,
      'INVALID_MAPPING',
    ],
    [
      'frozen reference rewrite',
      (p) => {
        p.frozen_targets[0].disposition = 'MAP';
      },
      400,
      'INVALID_MANIFEST',
    ],
    [
      'incomplete frozen review',
      (p) => {
        p.frozen_targets.pop();
      },
      400,
      'INCOMPLETE_MAPPING',
    ],
  ];
  for (const [name, mutate, status, code] of invalid)
    it(`rejects ${name} without school or review writes`, async () => {
      const input = await proposal();
      mutate(input);
      await unchanged(() => post('preview', input), status, code);
    });
  it('rejects stale inspection after an unrelated school-data change and ignores separate preview metadata', async () => {
    const input = await proposal();
    await preview(input);
    await preview(input);
    await db.students.update({
      where: { id: profiles[1] },
      data: { notes: 'PRIVATE changed synthetic note' },
    });
    try {
      await unchanged(() => post('preview', input), 409, 'MAPPING_STALE');
    } finally {
      await db.students.update({
        where: { id: profiles[1] },
        data: { notes: 'PRIVATE synthetic mapping note' },
      });
    }
  });
  it('rejects keep-ID canonicalization when frozen legacy targets still reference that identity', async () => {
    const input = await proposal();
    input.cohorts[0].disposition = 'KEEP_ID_AS_CANONICAL';
    input.cohorts[0].destinations = [
      {
        ...input.cohorts[0].destinations[0],
        existing_generation_id: String(cohorts[0]),
      },
    ];
    input.profiles = input.profiles.map((row) => ({
      ...row,
      destination_key: null,
    }));
    input.records = input.records.map((row) => ({
      ...row,
      destination_key: null,
    }));
    input.scopes = input.scopes.map((row) => ({
      ...row,
      destination_key: null,
    }));
    await unchanged(() => post('preview', input), 400, 'INVALID_MAPPING');
  });
  it('previews identity-preserving canonicalization for an unused legacy cohort', async () => {
    const input = await proposal();
    const row = input.cohorts.find((row) => row.id === String(cohorts[1]))!;
    row.disposition = 'KEEP_ID_AS_CANONICAL';
    row.destinations = [
      {
        key: 'NINE',
        major_id: String(majors[0]),
        generation_number: 9,
        entry_academic_year_id: String(years[0]),
        starting_year_level: 1,
        existing_generation_id: row.id,
      },
    ];
    const reviewed = await preview(input);
    expect(
      reviewed.impact.destinations.find((row: any) => row.key === 'NINE')
        .generation_id,
    ).toBe(String(cohorts[1]));
  });
  it('previews explicit reuse of an existing canonical destination without merging historical identities', async () => {
    const input = await proposal();
    input.cohorts[0].destinations[1] = {
      ...input.cohorts[0].destinations[1],
      generation_number: 3,
      existing_generation_id: String(cohorts[2]),
    };
    const reviewed = await preview(input);
    expect(
      reviewed.impact.destinations.find((row: any) => row.key === 'FE')
        .generation_id,
    ).toBe(String(cohorts[2]));
  });
  it('binds confirmation to the exact manifest and original administrator', async () => {
    const reviewed = await preview();
    const body = { review_id: reviewed.review_id, manifest: reviewed.manifest };
    await unchanged(() => post('confirm', body, 'OTHER_ADMIN'), 404);
    await unchanged(
      () =>
        post('confirm', {
          ...body,
          manifest: { ...body.manifest, reason: 'Changed after review' },
        }),
      409,
      'REVIEW_INPUT_MISMATCH',
    );
    await unchanged(
      () =>
        post('confirm', {
          ...body,
          manifest: { ...body.manifest, unexpected: true },
        }),
      409,
      'REVIEW_INPUT_MISMATCH',
    );
    await unchanged(
      () => post('confirm', { ...body, unexpected: true }),
      400,
      'INVALID_MANIFEST',
    );
    await unchanged(
      () =>
        post('confirm', { review_id: 'not-a-uuid', manifest: body.manifest }),
      400,
      'INVALID_MANIFEST',
    );
  });
  it('reports an uncommitted receipt honestly and hides it from other administrators', async () => {
    const reviewed = await preview();
    await unchanged(
      () => get(`receipts/${reviewed.review_id}`),
      409,
      'MAPPING_NOT_COMMITTED',
    );
    await unchanged(
      () => get(`receipts/${reviewed.review_id}`, 'OTHER_ADMIN'),
      404,
    );
    await unchanged(() => get(`receipts/${randomUUID()}`), 404);
    await unchanged(() => get('receipts/not-a-uuid'), 400);
  });
  it('rejects a token revoked after preview before confirmation can write', async () => {
    const reviewed = await preview();
    await db.users.update({
      where: { id: users[0] },
      data: { auth_version: 1 },
    });
    try {
      await unchanged(
        () =>
          post('confirm', {
            review_id: reviewed.review_id,
            manifest: reviewed.manifest,
          }),
        401,
      );
    } finally {
      await db.users.update({
        where: { id: users[0] },
        data: { auth_version: 0 },
      });
    }
  });
  it('rejects a review from a different operation kind and hides its mapping receipt', async () => {
    const reviewed = await preview();
    await db.reviewed_operations.update({
      where: { id: reviewed.review_id },
      data: { operation_kind: 'ENROLL_GROUP' },
    });
    await unchanged(
      () =>
        post('confirm', {
          review_id: reviewed.review_id,
          manifest: reviewed.manifest,
        }),
      409,
      'REVIEW_OPERATION_MISMATCH',
    );
    await unchanged(() => get(`receipts/${reviewed.review_id}`), 404);
  });
  it('rejects expired uncommitted review without partial mapping', async () => {
    const reviewed = await preview();
    await db.reviewed_operations.update({
      where: { id: reviewed.review_id },
      data: { expires_at: new Date(0) },
    });
    await unchanged(
      () =>
        post('confirm', {
          review_id: reviewed.review_id,
          manifest: reviewed.manifest,
        }),
      409,
      'REVIEW_EXPIRED',
    );
  });
  it('invalidates confirmation after a source label change', async () => {
    const reviewed = await preview();
    await db.student_generations.update({
      where: { id: cohorts[1] },
      data: { name: 'Changed unused legacy' },
    });
    try {
      await unchanged(
        () =>
          post('confirm', {
            review_id: reviewed.review_id,
            manifest: reviewed.manifest,
          }),
        409,
        'REVIEW_STALE',
      );
    } finally {
      await db.student_generations.update({
        where: { id: cohorts[1] },
        data: { name: 'Unused legacy' },
      });
    }
  });
  it('rolls back all mapping writes and both receipts on an injected profile failure', async () => {
    await db.$executeRawUnsafe(
      "CREATE FUNCTION mapping_http_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic profile failure' USING ERRCODE='23503'; END $$",
    );
    await db.$executeRawUnsafe(
      'CREATE TRIGGER mapping_http_fail AFTER UPDATE ON students FOR EACH ROW EXECUTE FUNCTION mapping_http_fail()',
    );
    const reviewed = await preview();
    try {
      await unchanged(
        () =>
          post('confirm', {
            review_id: reviewed.review_id,
            manifest: reviewed.manifest,
          }),
        500,
        'MAPPING_FAILED',
      );
    } finally {
      await db.$executeRawUnsafe('DROP TRIGGER mapping_http_fail ON students');
      await db.$executeRawUnsafe('DROP FUNCTION mapping_http_fail()');
    }
    expect(await db.cohort_mapping_operations.count()).toBe(0);
    expect(await db.cohort_mapping_receipts.count()).toBe(0);
  });
  it('documents the ADMIN-only four-route workflow without enabling full E', async () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(doc.paths[`${path}/inventory`].get?.description).toContain(
      'COHORT_MAPPING_ENABLED',
    );
    expect(doc.paths[`${path}/preview`].post?.requestBody).toBeDefined();
    expect(doc.paths[`${path}/confirm`].post?.description).toContain(
      'unchanged',
    );
    expect(doc.paths[`${path}/receipts/{reviewId}`].get).toBeDefined();
    const me = await api().get('/api/auth/me').set(auth());
    expect(me.status).toBe(200);
    expect(me.body.capabilities.major_scoped_generations).not.toBe(true);
  });
  it('commits the reviewed split exactly once under competing confirmations and preserves original school/history values', async () => {
    const reviewed = await preview();
    saved = { review_id: reviewed.review_id, manifest: reviewed.manifest };
    const before = await snapshot();
    const academic = await db.student_academic_records.findMany({
      orderBy: { id: 'asc' },
    });
    const originalProfiles = await db.students.findMany({
      orderBy: { id: 'asc' },
    });
    const responses = await Promise.all([
      post('confirm', saved),
      post('confirm', saved),
    ]);
    expect(responses.some((row) => row.status === 201)).toBe(true);
    expect(responses.every((row) => [201, 409].includes(row.status))).toBe(
      true,
    );
    const retried = await post('confirm', saved);
    expect(retried.status).toBe(201);
    result = retried.body;
    safe(result);
    expect(result.mapped).toEqual({ profiles: 1, records: 3, scopes: 1 });
    expect(result.already_applied).toBe(true);
    expect(result.cohorts.map((row: any) => row.generation_id)[0]).not.toBe(
      result.cohorts.map((row: any) => row.generation_id)[1],
    );
    expect(await db.cohort_mapping_operations.count()).toBe(1);
    expect(await db.cohort_mapping_receipts.count()).toBe(1);
    expect(
      await db.student_cohort_assignment_events.count({
        where: { action: 'MIGRATION' },
      }),
    ).toBe(3);
    const changed = new Set([
      'student_generations',
      'students',
      'student_academic_records',
      'course_offering_group_scopes',
      'cohort_mapping_operations',
      'cohort_mapping_receipts',
      'student_cohort_assignment_events',
      'reviewed_operations',
    ]);
    const after = await snapshot();
    expect(after.filter((row) => !changed.has(row.name))).toEqual(
      before.filter((row) => !changed.has(row.name)),
    );
    const strip = (rows: any[]) =>
      rows.map(({ generation_id: _generationId, ...rest }) => rest);
    expect(
      strip(
        await db.student_academic_records.findMany({ orderBy: { id: 'asc' } }),
      ),
    ).toEqual(strip(academic));
    expect(
      strip(await db.students.findMany({ orderBy: { id: 'asc' } })),
    ).toEqual(strip(originalProfiles));
    const ds = result.cohorts.find(
      (row: any) => row.key === 'DS',
    ).generation_id;
    const fe = result.cohorts.find(
      (row: any) => row.key === 'FE',
    ).generation_id;
    expect(
      (await db.students.findUniqueOrThrow({ where: { id: profiles[0] } }))
        .generation_id,
    ).toBe(BigInt(fe));
    expect(
      (await db.students.findUniqueOrThrow({ where: { id: profiles[2] } }))
        .generation_id,
    ).toBe(cohorts[2]);
    expect(
      (
        await db.student_academic_records.findUniqueOrThrow({
          where: { id: records[2] },
        })
      ).generation_id,
    ).toBe(BigInt(ds));
    const read = await api()
      .get(`/api/students/${profiles[0]}`)
      .query({ academic_year_id: String(years[1]) })
      .set(auth());
    expect(read.status).toBe(200);
    expect(read.body.academic_context).toMatchObject({
      progression_status: 'PAUSED',
      placement_eligible: false,
      cohort_context: { generation_id: fe },
    });
    const orphan = await db.students.findUniqueOrThrow({
      where: { id: profiles[1] },
    });
    expect(orphan.generation_id).toBe(cohorts[0]);
  });
  it('returns the original committed receipt after expiry and source drift without any new writes', async () => {
    await db.reviewed_operations.update({
      where: { id: saved.review_id },
      data: { expires_at: new Date(0) },
    });
    await db.students.update({
      where: { id: profiles[1] },
      data: { notes: 'PRIVATE later note' },
    });
    const confirmation = await unchanged(() => post('confirm', saved), 201);
    expect(confirmation.body).toEqual(result);
    const receipt = await unchanged(
      () => get(`receipts/${saved.review_id}`),
      200,
    );
    expect(receipt.body).toEqual(result);
    await unchanged(
      () => get(`receipts/${saved.review_id}`, 'OTHER_ADMIN'),
      404,
    );
    await unchanged(
      () =>
        post('confirm', {
          ...saved,
          manifest: { ...saved.manifest, reason: 'Changed committed input' },
        }),
      409,
      'REVIEW_INPUT_MISMATCH',
    );
    const actualNow = Date.now,
      oldToken = tokens.ADMIN;
    Date.now = () => actualNow() + 16 * 60000;
    try {
      expect(Date.parse(saved.manifest.expires_at)).toBeLessThan(Date.now());
      const login = await api().post('/api/auth/login').send({
        identifier: 'map0@example.test',
        password: 'SyntheticMapping123!',
      });
      expect(login.status).toBe(200);
      tokens.ADMIN = login.body.access_token;
      expect((await unchanged(() => post('confirm', saved), 201)).body).toEqual(
        result,
      );
      expect(
        (await unchanged(() => get(`receipts/${saved.review_id}`), 200)).body,
      ).toEqual(result);
    } finally {
      Date.now = actualNow;
      tokens.ADMIN = oldToken;
    }
  });
  it('commits an unused legacy cohort canonicalization with its exact original ID/name/entry/timestamps', async () => {
    const inventory = await get();
    expect(inventory.status).toBe(200);
    const data = inventory.body;
    const ref = (row: any) => ({
      id: row.id,
      expected_sha256: row.expected_sha256,
    });
    const before = await db.student_generations.findUniqueOrThrow({
      where: { id: cohorts[1] },
    });
    const input = {
      source_fingerprint: data.source_fingerprint,
      reason: 'Explicit unused-cohort identity review.',
      cohorts: data.cohorts.map((row: any) => ({
        ...ref(row),
        disposition:
          row.id === String(cohorts[1])
            ? 'KEEP_ID_AS_CANONICAL'
            : row.ownership_state === 'MAJOR_SCOPED'
              ? 'KEEP_EXISTING_CANONICAL'
              : 'RETAIN_UNRESOLVED',
        destinations:
          row.id === String(cohorts[1])
            ? [
                {
                  key: 'NINE',
                  major_id: String(majors[0]),
                  generation_number: 9,
                  entry_academic_year_id: String(years[0]),
                  starting_year_level: 1,
                  existing_generation_id: row.id,
                },
              ]
            : [],
      })),
      ...Object.fromEntries(
        ['profiles', 'records', 'scopes'].map((kind) => [
          kind,
          data[kind].map((row: any) => ({
            ...ref(row),
            destination_key: null,
          })),
        ]),
      ),
      frozen_targets: data.frozen_targets.map((row: any) => ({
        ...ref(row),
        disposition: 'KEEP_ORIGINAL_REFERENCE',
      })),
    } as CohortMappingProposalDto;
    const reviewed = await preview(input);
    const confirmation = await post('confirm', {
      review_id: reviewed.review_id,
      manifest: reviewed.manifest,
    });
    expect(confirmation.status).toBe(201);
    const after = await db.student_generations.findUniqueOrThrow({
      where: { id: cohorts[1] },
    });
    expect(after).toEqual({
      ...before,
      ownership_state: 'MAJOR_SCOPED',
      major_id: majors[0],
      generation_number: 9,
      mapping_operation_id: reviewed.manifest.operation_id,
    });
    expect(confirmation.body.cohorts).toEqual([
      { key: 'NINE', generation_id: String(cohorts[1]) },
    ]);
  });
});
