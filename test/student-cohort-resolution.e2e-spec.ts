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

describe('Selected-year cohorts across backend consumers (owned-schema HTTP)', () => {
  const fixture = new CohortImportFixture();
  let app: INestApplication, db: PrismaClient;
  let serial = 0,
    admin: bigint,
    lecturer: bigint,
    department: bigint,
    course: bigint;
  let survey: bigint, version: bigint;
  const years: bigint[] = [],
    majors: bigint[] = [],
    cohorts: bigint[] = [],
    offerings: bigint[] = [];
  const tokens: Record<string, string> = {};
  type Student = { id: string; user_id: string; student_code: string };
  let transferred: Student, mixed: Student, ordinary: Student;
  const api = () => request(app.getHttpServer());
  const auth = (role = 'ADMIN') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const now = () => new Date();
  const post = (route: string, body: object) =>
    api().post(`/api/${route}`).set(auth()).send(body);
  const get = (route: string, query = {}, role = 'ADMIN') =>
    api().get(`/api/${route}`).set(auth(role)).query(query);
  async function student(cohort = 0, year = 0, major = 0, group = 'A') {
    const response = await post('students', {
      student_code: `history-${++serial}`,
      full_name: 'Synthetic historical cohort',
      password: 'SyntheticHistory123!',
      generation_id: String(cohorts[cohort]),
      academic_year_id: String(years[year]),
      major_id: String(majors[major]),
      year_level: 1,
      class_group: group,
    });
    expect(response.status).toBe(201);
    return response.body as Student;
  }
  async function move(
    s: Student,
    year = 2,
    cohort = 1,
    major = 1,
    group = 'B',
    action = 'TRANSFER',
  ) {
    const response = await post('student-academic-records', {
      student_id: s.id,
      academic_year_id: String(years[year]),
      generation_id: String(cohorts[cohort]),
      major_id: String(majors[major]),
      year_level: year === 4 ? 3 : 2,
      class_group: group,
      progression_action: action,
    });
    expect(response.status).toBe(201);
    return response.body;
  }
  async function login(s: Student) {
    const response = await api().post('/api/auth/login').send({
      identifier: s.student_code,
      password: 'SyntheticHistory123!',
    });
    expect(response.status).toBe(200);
    return { Authorization: `Bearer ${response.body.access_token}` };
  }
  const selection = () => ({
    academic_year_id: String(years[0]),
    generation_id: String(cohorts[0]),
    major_id: String(majors[0]),
    year_level: 1,
    class_groups: ['A'],
  });
  async function offering(
    year = 0,
    scoped = true,
    cohort = 0,
    major = 0,
    group = 'A',
  ) {
    const semester = await db.semesters.upsert({
      where: {
        academic_year_id_semester_number: {
          academic_year_id: years[year],
          semester_number: 1,
        },
      },
      update: {},
      create: {
        academic_year_id: years[year],
        semester_number: 1,
        semester_name: `CH S${year}`,
        created_at: now(),
        updated_at: now(),
      },
    });
    // Historical classes are separate teaching identities, not label-only copies.
    const assignmentLecturer = offerings.length === 0 ? lecturer : (await db.users.create({data:{role:'LECTURER',full_name:'Synthetic historical lecturer',email:`ch-class-${++serial}@example.test`,password_hash:(await db.users.findUniqueOrThrow({where:{id:lecturer}})).password_hash,created_at:now(),updated_at:now()}})).id;
    return db.course_offerings.create({
      data: {
        course_id: course,
        semester_id: semester.id,
        lecturer_id: assignmentLecturer,
        year_level: year === 2 ? 2 : 1,
        class_type: 'TD',
        section_code: `CH-${++serial}`,
        created_at: now(),
        updated_at: now(),
        ...(scoped && {
          group_scopes: {
            create: {
              academic_year_id: years[year],
              generation_id: cohorts[cohort],
              major_id: majors[major],
              year_level: year === 2 ? 2 : 1,
              class_group: group,
            },
          },
        }),
      },
    });
  }
  async function enroll(s: Student, id: bigint) {
    await db.enrollments.create({
      data: {
        student_id: BigInt(s.user_id),
        course_offering_id: id,
        enrolled_at: now(),
      },
    });
  }
  const creation = (id: bigint) => ({
    course_offering_id: String(id),
    survey_id: String(survey),
    survey_version_id: String(version),
    start_at: new Date(Date.now() - 60000).toISOString(),
    end_at: new Date(Date.now() + 3600000).toISOString(),
    participant_scope: 'SELECTED_GENERATIONS',
    generation_ids: [String(cohorts[0])],
    group_scope: { ...selection(), class_groups: ['A'] },
  });
  async function noBusinessWrites(
    operation: () => PromiseLike<request.Response>,
    status: number,
  ) {
    const snapshot = async () =>
      (await fixture.snapshot(db)).filter(
        (table) => table.name !== 'reviewed_operations',
      );
    const before = await snapshot();
    const response = await operation();
    expect(response.status).toBe(status);
    expect(await snapshot()).toEqual(before);
    return response;
  }
  function safe(value: unknown) {
    if (Array.isArray(value)) value.forEach(safe);
    else if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password_hash',
          'auth_version',
          'mapping_operation_id',
          'cohort_assignment_event',
          'answers',
          'responses',
        ]).not.toContain(key);
        safe(child);
      }
  }
  beforeAll(async () => {
    await fixture.open();
    db = fixture.db;
    const hash = await bcrypt.hash('SyntheticHistory123!', 10);
    for (const role of ['ADMIN', 'LECTURER', 'STUDENT'] as const) {
      const user = await db.users.create({
        data: {
          email: `${role.toLowerCase()}@history.test`,
          full_name: `Synthetic history ${role}`,
          password_hash: hash,
          role,
          created_at: now(),
          updated_at: now(),
        },
      });
      if (role === 'ADMIN') admin = user.id;
      if (role === 'LECTURER') lecturer = user.id;
    }
    department = (
      await db.departments.create({
        data: { code: 'CH', name: 'Synthetic history', status: 'ACTIVE' },
      })
    ).id;
    for (const code of ['DS', 'FE'])
      majors.push(
        (
          await db.majors.create({
            data: {
              code,
              name: `Synthetic ${code}`,
              department_id: department,
            },
          })
        ).id,
      );
    for (let index = 0; index < 5; index++)
      years.push(
        (
          await db.academic_years.create({
            data: {
              name: `CH ${index}`,
              start_year: 2090 + index,
              is_active: index === 0,
            },
          })
        ).id,
      );
    years.push(
      (await db.academic_years.create({ data: { name: 'CH unknown' } })).id,
    );
    for (const [major, number, entry] of [
      [0, 1, 0],
      [1, 1, 2],
      [0, 2, 0],
    ])
      cohorts.push(
        (
          await db.student_generations.create({
            data: {
              name: `Gen ${number}`,
              major_id: majors[major],
              generation_number: number,
              ownership_state: 'MAJOR_SCOPED',
              entry_academic_year_id: years[entry],
            },
          })
        ).id,
      );
    cohorts.push(
      (
        await db.student_generations.create({
          data: { name: 'Legacy history', entry_academic_year_id: years[0] },
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
          identifier: `${role.toLowerCase()}@history.test`,
          password: 'SyntheticHistory123!',
        });
      expect(response.status).toBe(200);
      tokens[role] = response.body.access_token;
    }
    transferred = await student();
    await move(transferred);
    await move(transferred, 4, 2, 0, 'C');
    ordinary = await student();
    mixed = await student(1, 2, 1, 'B');
    await db.student_academic_records.create({
      data: {
        student_id: BigInt(mixed.id),
        academic_year_id: years[0],
        major_id: majors[0],
        year_level: 1,
        class_group: 'UNKNOWN',
      },
    });
    course = (
      await db.courses.create({
        data: {
          course_code: 'CH-101',
          course_name: 'Synthetic cohort history',
          department_id: department,
          created_at: now(),
          updated_at: now(),
        },
      })
    ).id;
    for (let index = 0; index < 4; index++)
      offerings.push((await offering()).id);
    offerings.push((await offering(2, true, 1, 1, 'B')).id);
    offerings.push((await offering(0, true, 2)).id);
    offerings.push((await offering(0, false)).id);
    for (const s of [transferred, mixed]) await enroll(s, offerings[6]);
    survey = (
      await db.surveys.create({
        data: {
          title: 'Synthetic cohort history questions',
          created_by: admin,
          created_at: now(),
          updated_at: now(),
        },
      })
    ).id;
    version = (
      await db.survey_versions.create({
        data: {
          survey_id: survey,
          version_no: 1,
          status: 'DRAFT',
          created_by: admin,
          created_at: now(),
        },
      })
    ).id;
    await db.questions.create({
      data: {
        survey_version_id: version,
        question_text: 'Synthetic question',
        question_type: 'TEXT',
        display_order: 1,
        created_at: now(),
        updated_at: now(),
      },
    });
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

  it.each([
    [0, 0, 0, 'A'],
    [2, 1, 1, 'B'],
    [4, 2, 0, 'C'],
  ])(
    'resolves the exact year %s independently of the latest profile pointer',
    async (year, cohort, major, group) => {
      const response = await noBusinessWrites(
        () =>
          get(`students/${transferred.id}`, {
            academic_year_id: String(years[year]),
          }),
        200,
      );
      safe(response.body);
      expect(response.body.generation_id).toBe(String(cohorts[2]));
      expect(response.body.academic_context).toMatchObject({
        cohort_context: {
          generation_id: String(cohorts[cohort]),
          source: 'ACADEMIC_RECORD',
          availability: 'RESOLVED',
          generation: { major_id: String(majors[major]) },
        },
        placement: {
          generation_id: String(cohorts[cohort]),
          class_group: group,
        },
        placement_eligible: true,
      });
    },
  );
  it.each([
    [1, 0, 2],
    [3, 1, 3],
  ])(
    'resolves only an earlier anchor for missing year %s without copying its group',
    async (year, cohort, level) => {
      const response = await get(`students/${transferred.id}`, {
        academic_year_id: String(years[year]),
      });
      expect(response.status).toBe(200);
      expect(response.body.academic_context).toMatchObject({
        academic_record: null,
        effective_year_level: level,
        cohort_context: {
          generation_id: String(cohorts[cohort]),
          source: 'PROGRESSION_ANCHOR',
        },
        placement: { class_group: null },
        placement_eligible: false,
        ineligibility_reason: 'MISSING_YEARLY_GROUP',
      });
    },
  );
  it('filters an old-year student list by stored cohort before pagination rather than the latest pointer', async () => {
    const response = await get('students', {
      academic_year_id: String(years[0]),
      generation_id: String(cohorts[0]),
      limit: 100,
    });
    expect(response.status).toBe(200);
    expect(response.body.data.map((s: Student) => s.id)).toContain(
      transferred.id,
    );
    expect(response.body.data.map((s: Student) => s.id)).not.toContain(
      mixed.id,
    );
    expect(response.body.pagination.total).toBe(response.body.data.length);
  });
  it('does not match a later equal-number FE cohort in an old-year filter', async () => {
    const response = await get('students', {
      academic_year_id: String(years[0]),
      generation_id: String(cohorts[1]),
    });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });
  it('preserves compatibility-pointer filtering when no academic year is requested', async () => {
    const response = await get('students', {
      generation_id: String(cohorts[2]),
    });
    expect(response.status).toBe(200);
    expect(response.body.data.map((s: Student) => s.id)).toContain(
      transferred.id,
    );
    expect(response.body.data[0]).not.toHaveProperty('academic_context');
  });
  it('returns unavailable for an unresolved exact old row instead of borrowing its later canonical cohort', async () => {
    const response = await get(`students/${mixed.id}`, {
      academic_year_id: String(years[0]),
    });
    expect(response.status).toBe(200);
    expect(response.body.academic_context).toMatchObject({
      effective_year_level: 1,
      placement_eligible: false,
      ineligibility_reason: 'COHORT_HISTORY_UNAVAILABLE',
      cohort_context: {
        generation_id: null,
        generation: null,
        availability: 'UNAVAILABLE',
      },
    });
  });
  it('retains explicit legacy compatibility without inventing a major-owned cohort', async () => {
    const s = await student(3, 0, 0, 'L');
    const response = await get(`students/${s.id}`, {
      academic_year_id: String(years[0]),
    });
    expect(response.status).toBe(200);
    expect(response.body.academic_context).toMatchObject({
      placement_eligible: true,
      cohort_context: {
        generation_id: String(cohorts[3]),
        source: 'LEGACY_PROFILE',
        availability: 'LEGACY_UNVERIFIED',
        generation: { major_id: null, generation_number: null },
      },
    });
    const options = await get('students/group-options', {
      ...selection(),
      generation_id: String(cohorts[3]),
    });
    expect(options.status).toBe(200);
    expect(options.body.groups).toEqual(['L']);
    expect(options.body).not.toHaveProperty('generation');
  });
  it('preserves an exact cohort ID above JavaScript safe integer through real database reads and filters', async () => {
    const id = 9007199254740993n;
    cohorts.push(
      (
        await db.student_generations.create({
          data: {
            id,
            name: 'Gen 7',
            ownership_state: 'MAJOR_SCOPED',
            major_id: majors[1],
            generation_number: 7,
            entry_academic_year_id: years[0],
          },
        })
      ).id,
    );
    const s = await student(4, 0, 1, 'HI');
    const response = await get('students', {
      academic_year_id: String(years[0]),
      generation_id: String(id),
    });
    expect(response.status).toBe(200);
    expect(response.body.data.map((row: Student) => row.id)).toEqual([s.id]);
    expect(
      response.body.data[0].academic_context.cohort_context.generation_id,
    ).toBe('9007199254740993');
    const options = await get('students/group-options', {
      academic_year_id: String(years[0]),
      generation_id: String(id),
      major_id: String(majors[1]),
    });
    expect(options.status).toBe(200);
    expect(options.body.generation.id).toBe('9007199254740993');
    expect(options.body.groups).toEqual(['HI']);
  });
  it('does not invent a cohort before the first known annual placement', async () => {
    const year = await db.academic_years.create({
      data: { name: 'CH before', start_year: 2089 },
    });
    const response = await get(`students/${transferred.id}`, {
      academic_year_id: String(year.id),
    });
    expect(response.status).toBe(200);
    expect(response.body.academic_context).toMatchObject({
      effective_year_level: null,
      placement_eligible: false,
      cohort_context: {
        generation_id: null,
        generation: null,
        availability: 'UNAVAILABLE',
        reason: 'COHORT_HISTORY_UNAVAILABLE',
      },
    });
  });
  it('keeps past group options after a transfer and includes major-qualified canonical metadata', async () => {
    const response = await get('students/group-options', selection());
    expect(response.status).toBe(200);
    expect(response.body.groups).toEqual(['A']);
    expect(response.body.generation).toMatchObject({
      id: String(cohorts[0]),
      major_id: String(majors[0]),
      generation_number: 1,
    });
    safe(response.body);
  });
  it('does not assign old groups to a future same-major destination cohort', async () => {
    const response = await get('students/group-options', {
      ...selection(),
      generation_id: String(cohorts[2]),
    });
    expect(response.status).toBe(200);
    expect(response.body.groups).toEqual([]);
  });
  it('accepts single enrollment in an old-year saved scope after future transfers', async () => {
    const response = await post(
      `course-offerings/${offerings[0]}/enrollments`,
      { student_id: transferred.user_id },
    );
    expect(response.status).toBe(201);
  });
  it('rejects direct enrollment when only the latest pointer matches the wrong old-year scope', async () => {
    await noBusinessWrites(
      () =>
        post(`course-offerings/${offerings[5]}/enrollments`, {
          student_id: transferred.user_id,
        }),
      400,
    );
  });
  it('selects past-year students for a reviewed enrollment using their own cohort', async () => {
    const response = await noBusinessWrites(
      () =>
        post(
          `course-offerings/${offerings[1]}/enrollments/preview`,
          selection(),
        ),
      200,
    );
    expect(response.body.confirmed_student_ids).toContain(transferred.user_id);
    expect(
      response.body.students.find((s: Student) => s.id === transferred.id)
        .academic_context.cohort_context.generation_id,
    ).toBe(String(cohorts[0]));
  });
  it('keeps an old-year enrollment review valid across an unrelated future transfer and retries its original receipt', async () => {
    const s = await student();
    const preview = await post(
      `course-offerings/${offerings[1]}/enrollments/preview`,
      selection(),
    );
    expect(preview.status).toBe(200);
    await move(s);
    const body = {
      ...selection(),
      confirmed_student_ids: preview.body.confirmed_student_ids,
      review_id: preview.body.review_id,
    };
    const result = await post(
      `course-offerings/${offerings[1]}/enrollments/bulk`,
      body,
    );
    expect(result.status).toBe(201);
    expect(result.body.already_applied).toBe(false);
    const before = await fixture.snapshot(db);
    const retry = await post(
      `course-offerings/${offerings[1]}/enrollments/bulk`,
      body,
    );
    expect(retry.status).toBe(201);
    expect(retry.body).toEqual({ ...result.body, already_applied: true });
    expect(await fixture.snapshot(db)).toEqual(before);
  });
  it('invalidates a reviewed enrollment on relevant old-year group drift without partial enrollment', async () => {
    const preview = await post(
      `course-offerings/${offerings[2]}/enrollments/preview`,
      selection(),
    );
    expect(preview.status).toBe(200);
    const record = await db.student_academic_records.findUniqueOrThrow({
      where: {
        student_id_academic_year_id: {
          student_id: BigInt(ordinary.id),
          academic_year_id: years[0],
        },
      },
    });
    await db.student_academic_records.update({
      where: { id: record.id },
      data: { class_group: 'Z' },
    });
    try {
      const response = await noBusinessWrites(
        () =>
          post(`course-offerings/${offerings[2]}/enrollments/bulk`, {
            ...selection(),
            confirmed_student_ids: preview.body.confirmed_student_ids,
            review_id: preview.body.review_id,
          }),
        409,
      );
      expect(response.body.code).toBe('REVIEW_STALE');
    } finally {
      await db.student_academic_records.update({
        where: { id: record.id },
        data: { class_group: 'A' },
      });
    }
  });
  it('reassigns an old-year enrollment using the stored cohort without rewriting academic history', async () => {
    const body = {
      student_id: transferred.user_id,
      target_offering_id: String(offerings[3]),
    };
    const preview = await post(
      `course-offerings/${offerings[0]}/enrollments/reassignment/preview`,
      body,
    );
    expect(preview.status).toBe(200);
    expect(preview.body.placement.generation_id).toBe(String(cohorts[0]));
    const before = await db.student_academic_records.findMany();
    const response = await post(
      `course-offerings/${offerings[0]}/enrollments/reassignment/confirm`,
      {
        ...body,
        confirmed_enrollment_id: preview.body.confirmed_enrollment_id,
        review_id: preview.body.review_id,
      },
    );
    expect(response.status).toBe(201);
    expect(await db.student_academic_records.findMany()).toEqual(before);
  });
  it('targets the old cohort among actual enrollments and reports unresolved historical cohorts explicitly', async () => {
    const response = await post('evaluations/participants/preview', {
      course_offering_id: String(offerings[6]),
      participant_scope: 'SELECTED_GENERATIONS',
      generation_ids: [String(cohorts[0])],
    });
    expect(response.status).toBe(200);
    expect(response.body.confirmed_student_ids).toEqual([transferred.user_id]);
    expect(response.body.ineligible_reasons.cohort_unavailable).toBe(1);
    expect(response.body.eligible_students[0].cohort_context).toMatchObject({
      generation_id: String(cohorts[0]),
      generation: { major_id: String(majors[0]), generation_number: 1 },
    });
  });
  it('never treats a later equal-number FE selection as the earlier DS audience', async () => {
    const response = await post('evaluations/participants/preview', {
      course_offering_id: String(offerings[6]),
      participant_scope: 'SELECTED_GENERATIONS',
      generation_ids: [String(cohorts[1])],
    });
    expect(response.status).toBe(200);
    expect(response.body.confirmed_student_ids).toEqual([]);
  });
  it('binds canonical major/number labels to reviewed creation, preserves them after rename and returns the original retry receipt', async () => {
    const id = (await offering()).id;
    await enroll(transferred, id);
    const body = creation(id);
    const preview = await post('evaluations/create-preview', body);
    expect(preview.status).toBe(200);
    expect(
      preview.body.target_labels.generations[0].historical_labels,
    ).toMatchObject({
      schema_version: 1,
      generation: {
        id: String(cohorts[0]),
        major_id: String(majors[0]),
        generation_number: 1,
      },
    });
    const confirmed = {
      ...body,
      review_id: preview.body.review_id,
      confirmed_student_ids: preview.body.confirmed_student_ids,
    };
    const created = await post('evaluations', confirmed);
    expect(created.status).toBe(201);
    const before = await db.evaluation_generation_targets.findMany({
      where: { evaluation_id: BigInt(created.body.id) },
    });
    await db.student_generations.update({
      where: { id: cohorts[0] },
      data: { name: 'Renamed DS cohort' },
    });
    try {
      const read = await get(`evaluations/${created.body.id}`);
      expect(read.status).toBe(200);
      expect(
        read.body.generation_targets[0].historical_labels.generation.name,
      ).toBe('Gen 1');
      expect(
        read.body.generation_targets[0].current_labels.generation.name,
      ).toBe('Renamed DS cohort');
      const retry = await post('evaluations', confirmed);
      expect(retry.status).toBe(201);
      expect(retry.body).toEqual({ ...created.body, already_applied: true });
      expect(
        await db.evaluation_generation_targets.findMany({
          where: { evaluation_id: BigInt(created.body.id) },
        }),
      ).toEqual(before);
    } finally {
      await db.student_generations.update({
        where: { id: cohorts[0] },
        data: { name: 'Gen 1' },
      });
    }
  });
  it('invalidates creation review when a selected cohort major label changes', async () => {
    const id = (await offering()).id;
    await enroll(transferred, id);
    const body = creation(id);
    const preview = await post('evaluations/create-preview', body);
    expect(preview.status).toBe(200);
    await db.majors.update({
      where: { id: majors[0] },
      data: { name: 'Renamed DS major' },
    });
    try {
      const response = await noBusinessWrites(
        () =>
          post('evaluations', {
            ...body,
            review_id: preview.body.review_id,
            confirmed_student_ids: preview.body.confirmed_student_ids,
          }),
        409,
      );
      expect(response.body.code).toBe('REVIEW_STALE');
    } finally {
      await db.majors.update({
        where: { id: majors[0] },
        data: { name: 'Synthetic DS' },
      });
    }
  });
  it('keeps a reviewed historical evaluation creation valid across an unrelated later transfer', async () => {
    const s = await student();
    const id = (await offering()).id;
    await enroll(s, id);
    const body = creation(id);
    const preview = await post('evaluations/create-preview', body);
    expect(preview.status).toBe(200);
    await move(s);
    const result = await post('evaluations', {
      ...body,
      review_id: preview.body.review_id,
      confirmed_student_ids: preview.body.confirmed_student_ids,
    });
    expect(result.status).toBe(201);
    expect(result.body.generation_targets[0].generation_id).toBe(
      String(cohorts[0]),
    );
    expect(
      await db.evaluation_participants.count({
        where: {
          evaluation_id: BigInt(result.body.id),
          student_id: BigInt(s.user_id),
        },
      }),
    ).toBe(1);
  });
  it('uses the active historical year in self-profile cohort metadata despite the future profile pointer', async () => {
    const response = await api()
      .get('/api/auth/me')
      .set(await login(transferred));
    expect(response.status).toBe(200);
    safe(response.body);
    expect(response.body.student.generation.id).toBe(String(cohorts[0]));
    expect(response.body.student.academic_context).toMatchObject({
      academic_record: { generation_id: String(cohorts[0]), class_group: 'A' },
      cohort_context: { generation_id: String(cohorts[0]) },
    });
    expect(response.body.capabilities.major_scoped_generations).not.toBe(true);
  });
  it('shows a missing active-year group honestly while resolving its earlier transfer cohort', async () => {
    await db.academic_years.update({
      where: { id: years[0] },
      data: { is_active: false },
    });
    await db.academic_years.update({
      where: { id: years[3] },
      data: { is_active: true },
    });
    try {
      const response = await api()
        .get('/api/auth/me')
        .set(await login(transferred));
      expect(response.status).toBe(200);
      expect(response.body.student.generation.id).toBe(String(cohorts[1]));
      expect(response.body.student.academic_context).toMatchObject({
        academic_record: null,
        placement_eligible: false,
        ineligibility_reason: 'MISSING_YEARLY_GROUP',
        placement: { class_group: null },
      });
    } finally {
      await db.academic_years.update({
        where: { id: years[3] },
        data: { is_active: false },
      });
      await db.academic_years.update({
        where: { id: years[0] },
        data: { is_active: true },
      });
    }
  });
  it('returns null self cohort and explicit ineligibility for unresolved old history', async () => {
    const response = await api()
      .get('/api/auth/me')
      .set(await login(mixed));
    expect(response.status).toBe(200);
    expect(response.body.student.generation).toBeNull();
    expect(response.body.student.academic_context.ineligibility_reason).toBe(
      'COHORT_HISTORY_UNAVAILABLE',
    );
  });
  it('uses historical cohort filters and labels in identifiable exports without exposing anonymous answers', async () => {
    const id = (await offering()).id;
    await enroll(transferred, id);
    const body = creation(id);
    const preview = await post('evaluations/create-preview', body);
    expect(preview.status).toBe(200);
    const created = await post('evaluations', {
      ...body,
      review_id: preview.body.review_id,
      confirmed_student_ids: preview.body.confirmed_student_ids,
    });
    expect(created.status).toBe(201);
    const opened = await post(`evaluations/${created.body.id}/open`, {});
    expect(opened.status).toBe(200);
    const response = await get('students/export', {
      academic_year_id: String(years[0]),
      generation_id: String(cohorts[0]),
      major_id: String(majors[0]),
      class_group: 'A',
    });
    expect(response.status).toBe(200);
    safe(response.body);
    const row = response.body.data.find(
      (s: { student_code: string }) =>
        s.student_code === transferred.student_code,
    );
    expect(row).toMatchObject({
      generation: {
        id: String(cohorts[0]),
        major_id: String(majors[0]),
        generation_number: 1,
      },
      academic_context: {
        cohort_context: {
          source: 'ACADEMIC_RECORD',
          generation_id: String(cohorts[0]),
        },
      },
    });
    const wrong = await get('students/export', {
      academic_year_id: String(years[0]),
      generation_id: String(cohorts[2]),
    });
    expect(wrong.status).toBe(200);
    expect(wrong.body.data).toEqual([]);
    const access = await api()
      .get('/api/student/evaluations')
      .set(await login(transferred));
    expect(access.status).toBe(200);
    expect(
      access.body.find((e: { id: string }) => e.id === created.body.id),
    ).toMatchObject({ answerable: true, answerability_reason: null });
  });
  it.each(['list', 'draft', 'submission'])(
    'blocks unresolved historical cohort access through %s without writing assessment data',
    async (operation) => {
      const id = (await offering(0, false)).id;
      await enroll(mixed, id);
      const evaluation = await db.evaluations.create({
        data: {
          course_offering_id: id,
          survey_version_id: version,
          status: 'OPEN',
          created_by: admin,
          created_at: now(),
          updated_at: now(),
          start_at: new Date(Date.now() - 60000),
          end_at: new Date(Date.now() + 3600000),
        },
      });
      await db.evaluation_participants.create({
        data: {
          evaluation_id: evaluation.id,
          student_id: BigInt(mixed.user_id),
          survey_version_id: version,
          has_submitted: false,
          created_at: now(),
        },
      });
      const headers = await login(mixed);
      if (operation === 'list') {
        const response = await api()
          .get('/api/student/evaluations')
          .set(headers);
        expect(response.status).toBe(200);
        expect(
          response.body.some(
            (e: { id: string }) => e.id === String(evaluation.id),
          ),
        ).toBe(false);
        const history = await api()
          .get('/api/student/evaluations/history')
          .set(headers);
        expect(history.status).toBe(200);
        expect(
          history.body.find(
            (e: { id: string }) => e.id === String(evaluation.id),
          ),
        ).toMatchObject({
          answerable: false,
          answerability_reason: 'COHORT_HISTORY_UNAVAILABLE',
        });
      } else if (operation === 'draft') {
        const response = await noBusinessWrites(
          () =>
            api()
              .put(`/api/student/evaluations/${evaluation.id}/draft`)
              .set(headers)
              .send({ answers: [] }),
          403,
        );
        expect(response.body.code).toBe('COHORT_HISTORY_UNAVAILABLE');
      } else {
        const question = await db.questions.findFirstOrThrow({
          where: { survey_version_id: version },
        });
        const response = await noBusinessWrites(
          () =>
            api()
              .post(`/api/student/evaluations/${evaluation.id}/responses`)
              .set(headers)
              .send({
                answers: [
                  {
                    question_id: String(question.id),
                    text_value: 'Synthetic blocked submission',
                  },
                ],
              }),
          403,
        );
        expect(response.body.code).toBe('COHORT_HISTORY_UNAVAILABLE');
      }
    },
  );
  it.each(['LECTURER', 'STUDENT'])(
    'retains admin-only historical list/group/export/preview permissions for %s',
    async (role) => {
      for (const route of [
        'students',
        'students/group-options',
        'students/export',
      ]) {
        const response = await get(route, selection(), role);
        expect(response.status).toBe(403);
      }
    },
  );
  it('documents selected-year semantics through the API contract and keeps the capability disabled', async () => {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(doc.paths['/api/students'].get?.description).toContain('cohort');
    expect(
      (await get('auth/me')).body.capabilities.major_scoped_generations,
    ).not.toBe(true);
  });
});
