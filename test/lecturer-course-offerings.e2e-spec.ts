import { legacyEvaluationFixture } from './utils/legacy-evaluation-fixture';
import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Lecturer owned course offerings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let confirmed = false;
  let passwordHash: string;
  const marker = `E2E-LO-${Date.now()}`;
  const endpoint = '/api/lecturer/course-offerings';
  let fixtures:
    | {
        department: bigint;
        years: bigint[];
        semesters: bigint[];
        courses: bigint[];
        major: bigint;
        generation: bigint;
        survey: bigint;
        versions: bigint[];
        lecturer: bigint;
        other: bigint;
        empty: bigint;
        student: bigint;
        offerings: bigint[];
        otherOffering: bigint;
        evaluations: bigint[];
        groupTarget: bigint;
      }
    | undefined;
  let lecturerToken: string;
  let otherToken: string;
  let emptyToken: string;
  let adminToken: string;
  let studentToken: string;
  let originalState: unknown;
  const f = () => fixtures!;
  const api = () => request(app.getHttpServer());
  const get = (query: Record<string, unknown> = {}, token = lecturerToken) =>
    api().get(endpoint).set('Authorization', `Bearer ${token}`).query(query);

  async function actor(role: user_role, suffix: string) {
    const user = await prisma.users.create({
      data: {
        email: `${marker.toLowerCase()}-${suffix}@example.test`,
        full_name: `${marker} ${suffix}`,
        role,
        status: 'ACTIVE',
        password_hash: passwordHash,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    const response = await api()
      .post('/api/auth/login')
      .send({ identifier: user.email, password: 'Password123' });
    expect(response.status).toBe(200);
    return { id: user.id, token: response.body.access_token as string };
  }

  function privateFieldsAbsent(value: unknown) {
    if (Array.isArray(value)) return value.forEach(privateFieldsAbsent);
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'auth_version',
          'email',
          'full_name',
          'student_id',
          'participant_id',
          'responses',
          'answers',
          'evaluation_participants',
          'assessment_drafts',
          'text_value',
          'rating_value',
          'users',
        ]).not.toContain(key);
        privateFieldsAbsent(child);
      }
    }
  }

  async function expectItems(
    query: Record<string, unknown>,
    ids: bigint[],
    token = lecturerToken,
  ) {
    const response = await get(query, token);
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual([
      'complete',
      'items',
      'total',
    ]);
    expect(response.body.complete).toBe(true);
    expect(response.body.total).toBe(ids.length);
    expect(response.body.items.map((item: { id: string }) => item.id)).toEqual(
      ids.map(String),
    );
    privateFieldsAbsent(response.body);
    for (const item of response.body.items) {
      expect(item.lecturer_id).toBe(
        (token === otherToken ? f().other : f().lecturer).toString(),
      );
      expect(typeof item.course_id).toBe('string');
      expect(typeof item.semester_id).toBe('string');
      expect(item.courses.id).toBe(item.course_id);
      expect(item.semesters.id).toBe(item.semester_id);
      expect(item.semesters.academic_years.id).toBe(
        item.semesters.academic_year_id,
      );
      expect(Array.isArray(item.evaluations)).toBe(true);
      expect(Array.isArray(item.group_scopes)).toBe(true);
    }
    return response;
  }

  async function snapshot() {
    const users = await prisma.users.findMany({
      where: { full_name: { startsWith: marker } },
      orderBy: { id: 'asc' },
    });
    const offeringIds = [...f().offerings, f().otherOffering];
    return {
      users,
      offerings: await prisma.course_offerings.findMany({
        where: { id: { in: offeringIds } },
        orderBy: { id: 'asc' },
        include: { group_scopes: true, enrollments: true },
      }),
      evaluations: await prisma.evaluations.findMany({
        where: { id: { in: f().evaluations } },
        orderBy: { id: 'asc' },
        include: {
          group_targets: true,
          evaluation_participants: true,
          responses: { include: { answers: true } },
        },
      }),
      versions: await prisma.survey_versions.findMany({
        where: { id: { in: f().versions } },
        orderBy: { id: 'asc' },
        include: { questions: true },
      }),
      courses: await prisma.courses.findMany({
        where: { id: { in: f().courses } },
        orderBy: { id: 'asc' },
      }),
      semesters: await prisma.semesters.findMany({
        where: { id: { in: f().semesters } },
        orderBy: { id: 'asc' },
      }),
      years: await prisma.academic_years.findMany({
        where: { id: { in: f().years } },
        orderBy: { id: 'asc' },
      }),
    };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    const [database] = await prisma.$queryRaw<
      Array<{ name: string }>
    >`SELECT current_database() AS name`;
    expect(database.name).toBe(selectedTestDatabase());
    confirmed = true;
    passwordHash = await bcrypt.hash('Password123', 10);
    const lecturer = await actor('LECTURER', 'owner');
    const other = await actor('LECTURER', 'other');
    const empty = await actor('LECTURER', 'empty');
    const admin = await actor('ADMIN', 'admin');
    const student = await actor('STUDENT', 'student');
    [lecturerToken, otherToken, emptyToken, adminToken, studentToken] = [
      lecturer.token,
      other.token,
      empty.token,
      admin.token,
      student.token,
    ];
    fixtures = await prisma.$transaction(
      async (tx) => {
        const now = new Date('2026-10-01T00:00:00.000Z');
        const department = await tx.departments.create({
          data: { code: marker, name: marker },
        });
        const years: bigint[] = [];
        const semesters: bigint[] = [];
        const courses: bigint[] = [];
        for (let index = 0; index < 2; index++) {
          const year = await tx.academic_years.create({
            data: {
              name: `LO-${Date.now()}-${index}`,
              start_year: 2090 + index,
              is_active: false,
            },
          });
          years.push(year.id);
          const course = await tx.courses.create({
            data: {
              course_code: `${marker}-${index}`,
              course_name:
                index === 0
                  ? 'Synthetic Database Foundations'
                  : 'Synthetic Research Methods',
              department_id: department.id,
              created_at: now,
              updated_at: now,
            },
          });
          courses.push(course.id);
        }
        for (const [yearIndex, semesterNumber] of [
          [0, 1],
          [0, 2],
          [1, 1],
        ]) {
          const semester = await tx.semesters.create({
            data: {
              academic_year_id: years[yearIndex],
              semester_name: `${marker}-${semesters.length}`,
              semester_number: semesterNumber,
              created_at: now,
              updated_at: now,
            },
          });
          semesters.push(semester.id);
        }
        const major = await tx.majors.create({
          data: { code: marker, name: marker, department_id: department.id },
        });
        const generation = await tx.student_generations.create({
          data: { name: marker, entry_academic_year_id: years[0] },
        });
        const survey = await tx.surveys.create({
          data: {
            title: marker,
            created_by: admin.id,
            created_at: now,
            updated_at: now,
          },
        });
        const versions: bigint[] = [];
        for (let number = 1; number <= 2; number++) {
          const version = await tx.survey_versions.create({
            data: {
              survey_id: survey.id,
              version_no: number,
              status: 'LOCKED',
              created_by: admin.id,
              created_at: now,
            },
          });
          versions.push(version.id);
        }
        const offerings: bigint[] = [];
        const specs = [
          {
            course_id: courses[0],
            semester_id: semesters[0],
            year_level: 1,
            class_type: 'COURSE' as const,
            section_code: 'AlphaRoom',
          },
          {
            course_id: courses[0],
            semester_id: semesters[1],
            year_level: 2,
            class_type: 'TD' as const,
            section_code: 'BetaRoom',
          },
          {
            course_id: courses[1],
            semester_id: semesters[2],
            year_level: 5,
            class_type: 'TP' as const,
            section_code: 'PracticeRoom',
          },
          {
            course_id: courses[1],
            semester_id: semesters[0],
            year_level: null,
            class_type: null,
            section_code: null,
          },
        ];
        for (const spec of specs) {
          const offering = await tx.course_offerings.create({
            data: {
              ...spec,
              lecturer_id: lecturer.id,
              created_at: now,
              updated_at: now,
            },
          });
          offerings.push(offering.id);
        }
        const otherOffering = await tx.course_offerings.create({
          data: {
            ...specs[0],
            lecturer_id: other.id,
            section_code: 'OtherLecturer',
            created_at: now,
            updated_at: now,
          },
        });
        for (const classGroup of ['B', 'A']) {
          await tx.course_offering_group_scopes.create({
            data: {
              course_offering_id: offerings[0],
              academic_year_id: years[0],
              generation_id: generation.id,
              major_id: major.id,
              year_level: 1,
              class_group: classGroup,
            },
          });
        }
        const evaluations: bigint[] = [];
        const evaluationSpecs = [
          { offering: 0, status: 'OPEN' as const, version: 0 },
          { offering: 2, status: 'CLOSED' as const, version: 0 },
          { offering: 3, status: 'DRAFT' as const, version: 0 },
          { offering: 0, status: 'DRAFT' as const, version: 1 },
        ];
        await legacyEvaluationFixture(tx, async () => {
          for (const [index, spec] of evaluationSpecs.entries()) {
            const evaluation = await tx.evaluations.create({
              data: {
                course_offering_id: offerings[spec.offering],
                survey_version_id: versions[spec.version],
                status: spec.status,
                start_at: now,
                end_at: new Date('2026-10-31T00:00:00.000Z'),
                created_by: admin.id,
                created_at: new Date(now.getTime() + index * 1000),
                updated_at: now,
              },
            });
            evaluations.push(evaluation.id);
          }
        });
        const target = await tx.evaluation_group_targets.create({
          data: {
            evaluation_id: evaluations[0],
            academic_year_id: years[0],
            generation_id: generation.id,
            major_id: major.id,
            year_level: 1,
            class_group: 'A',
            created_at: now,
            historical_labels: {
              schema_version: 1,
              academic_year: {
                id: String(years[0]),
                name: 'Saved Academic Label',
                start_year: 2090,
              },
              generation: {
                id: String(generation.id),
                name: 'Saved Generation Label',
              },
              major: {
                id: String(major.id),
                code: 'SAVED',
                name: 'Saved Major Label',
              },
              year_level: 1,
              class_group: 'A',
            },
            labels_captured_at: now,
          },
        });
        await tx.enrollments.create({
          data: {
            student_id: student.id,
            course_offering_id: offerings[2],
            enrolled_at: now,
          },
        });
        await tx.evaluation_participants.create({
          data: {
            evaluation_id: evaluations[1],
            student_id: student.id,
            survey_version_id: versions[0],
            has_submitted: true,
            submitted_at: now,
            created_at: now,
          },
        });
        const question = await tx.questions.create({
          data: {
            survey_version_id: versions[0],
            question_text: 'Synthetic private answer fixture',
            question_type: 'RATING',
            min_rating: 1,
            max_rating: 5,
            display_order: 1,
            created_at: now,
            updated_at: now,
          },
        });
        const response = await tx.responses.create({
          data: {
            evaluation_id: evaluations[1],
            survey_version_id: versions[0],
            submitted_at: now,
            created_at: now,
          },
        });
        await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: question.id,
            rating_value: 4,
            created_at: now,
          },
        });
        return {
          department: department.id,
          years,
          semesters,
          courses,
          major: major.id,
          generation: generation.id,
          survey: survey.id,
          versions,
          lecturer: lecturer.id,
          other: other.id,
          empty: empty.id,
          student: student.id,
          offerings,
          otherOffering: otherOffering.id,
          evaluations,
          groupTarget: target.id,
        };
      },
      { timeout: 20000 },
    );
    originalState = await snapshot();
  }, 30000);

  afterEach(async () => {
    if (originalState) expect(await snapshot()).toEqual(originalState);
  });

  afterAll(async () => {
    try {
      if (confirmed) {
        if (fixtures)
          await prisma.$transaction(async (tx) => {
            const own = f();
            const responses = await tx.responses.findMany({
              where: { evaluation_id: { in: own.evaluations } },
              select: { id: true },
            });
            await tx.answers.deleteMany({
              where: {
                response_id: { in: responses.map((response) => response.id) },
              },
            });
            await tx.responses.deleteMany({
              where: { evaluation_id: { in: own.evaluations } },
            });
            await tx.evaluation_participants.deleteMany({
              where: { evaluation_id: { in: own.evaluations } },
            });
            await tx.evaluation_group_targets.deleteMany({
              where: { evaluation_id: { in: own.evaluations } },
            });
            await tx.evaluations.deleteMany({
              where: { id: { in: own.evaluations } },
            });
            await tx.enrollments.deleteMany({
              where: { course_offering_id: { in: own.offerings } },
            });
            await tx.course_offering_group_scopes.deleteMany({
              where: { course_offering_id: { in: own.offerings } },
            });
            await tx.course_offerings.deleteMany({
              where: { id: { in: [...own.offerings, own.otherOffering] } },
            });
            await tx.questions.deleteMany({
              where: { survey_version_id: { in: own.versions } },
            });
            await tx.survey_versions.deleteMany({
              where: { id: { in: own.versions } },
            });
            await tx.surveys.delete({ where: { id: own.survey } });
            await tx.student_generations.delete({
              where: { id: own.generation },
            });
            await tx.majors.delete({ where: { id: own.major } });
            await tx.courses.deleteMany({ where: { id: { in: own.courses } } });
            await tx.semesters.deleteMany({
              where: { id: { in: own.semesters } },
            });
            await tx.academic_years.deleteMany({
              where: { id: { in: own.years } },
            });
            await tx.departments.delete({ where: { id: own.department } });
          });
        await prisma.users.deleteMany({
          where: { full_name: { startsWith: marker } },
        });
      }
    } finally {
      await app?.close();
    }
  });

  it('returns a complete owned list including assignments without evaluations and legacy null metadata', async () => {
    const response = await expectItems({}, f().offerings);
    expect(response.body.items[1].evaluations).toEqual([]);
    expect(response.body.items[3]).toMatchObject({
      year_level: null,
      class_type: null,
      section_code: null,
    });
    expect(
      response.body.items[0].evaluations.map(
        (value: { id: string }) => value.id,
      ),
    ).toEqual([String(f().evaluations[3]), String(f().evaluations[0])]);
    expect(response.body.items[0].evaluations[1]).toMatchObject({
      status: 'OPEN',
      start_at: '2026-10-01T00:00:00.000Z',
      end_at: '2026-10-31T00:00:00.000Z',
      survey_version_id: String(f().versions[0]),
    });
    expect(response.body.items[2].evaluations[0].status).toBe('CLOSED');
    expect(response.body.items[3].evaluations[0].status).toBe('DRAFT');
  });

  it('isolates a second lecturer teaching the same course and semester', async () => {
    await expectItems({}, [f().otherOffering], otherToken);
  });

  it('returns a complete empty list for a lecturer with no assignments', async () => {
    const response = await get({}, emptyToken);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], total: 0, complete: true });
  });

  it('returns sorted explicit group scopes separately from section labels and preserves historical labels', async () => {
    const response = await expectItems({ class_type: 'COURSE' }, [
      f().offerings[0],
    ]);
    const offering = response.body.items[0];
    expect(offering.section_code).toBe('AlphaRoom');
    expect(
      offering.group_scopes.map(
        (scope: { class_group: string }) => scope.class_group,
      ),
    ).toEqual(['A', 'B']);
    expect(offering.group_scopes[0]).toMatchObject({
      academic_year_id: String(f().years[0]),
      generation_id: String(f().generation),
      major_id: String(f().major),
      year_level: 1,
      curriculum_revision_id: null,
      curriculum_revision: null,
    });
    const target = offering.evaluations[1].group_targets[0];
    expect(target.id).toBe(String(f().groupTarget));
    expect(target.historical_labels_status).toBe('CAPTURED');
    expect(target.historical_labels.major.name).toBe('Saved Major Label');
    expect(target.current_labels.major.name).toBe(marker);
    expect(target.historical_labels_unavailable_reason).toBeNull();
  });

  it.each([0, 1])('filters academic year %s', async (index) => {
    await expectItems(
      { academic_year_id: String(f().years[index]) },
      index === 0
        ? [f().offerings[0], f().offerings[1], f().offerings[3]]
        : [f().offerings[2]],
    );
  });
  it.each([0, 1, 2])('filters semester %s', async (index) => {
    await expectItems(
      { semester_id: String(f().semesters[index]) },
      index === 0
        ? [f().offerings[0], f().offerings[3]]
        : [f().offerings[index]],
    );
  });
  it.each([
    ['1', 0],
    ['2', 1],
    ['5', 2],
  ] as Array<[string, number]>)(
    'filters year_level=%s',
    async (value, index) => {
      await expectItems({ year_level: value }, [f().offerings[index]]);
    },
  );
  it.each([
    ['COURSE', 0],
    ['TD', 1],
    ['TP', 2],
  ] as Array<[string, number]>)(
    'filters class_type=%s',
    async (value, index) => {
      await expectItems({ class_type: value }, [f().offerings[index]]);
    },
  );
  it.each([
    '  database  ',
    'FOUNDATIONS',
    'betaroom',
    'research methods',
    'not-a-matching-course',
    '   ',
  ])('searches %s without widening ownership', async (search) => {
    const indices =
      search.trim() === ''
        ? [0, 1, 2, 3]
        : search.toLowerCase().includes('not-a-')
          ? []
          : search.toLowerCase().includes('beta')
            ? [1]
            : search.toLowerCase().includes('research')
              ? [2, 3]
              : [0, 1];
    await expectItems(
      { search },
      indices.map((index) => f().offerings[index]),
    );
  });
  it('searches course code with case-insensitive matching', async () => {
    await expectItems({ search: `${marker.toLowerCase()}-0` }, [
      f().offerings[0],
      f().offerings[1],
    ]);
  });
  it('combines all supported filters by intersection', async () => {
    await expectItems(
      {
        academic_year_id: String(f().years[0]),
        semester_id: String(f().semesters[1]),
        year_level: '2',
        class_type: 'TD',
        search: 'Database',
      },
      [f().offerings[1]],
    );
  });
  it('returns an empty complete list for contradictory valid filters', async () => {
    await expectItems(
      {
        academic_year_id: String(f().years[1]),
        semester_id: String(f().semesters[0]),
      },
      [],
    );
  });
  it('ignores injected ownership and pagination parameters', async () => {
    await expectItems(
      {
        lecturer_id: String(f().other),
        user_id: String(f().other),
        role: 'ADMIN',
        page: '1',
        limit: '1',
      },
      f().offerings,
    );
  });
  it.each(['academic_year_id', 'semester_id'])(
    'returns an empty list for an absent in-range %s',
    async (field) => {
      await expectItems({ [field]: '9223372036854775807' }, []);
    },
  );
  it.each(['missing JWT', 'invalid JWT', 'ADMIN', 'STUDENT'])(
    'rejects %s',
    async (kind) => {
      const response =
        kind === 'missing JWT'
          ? await api().get(endpoint)
          : await get(
              {},
              kind === 'invalid JWT'
                ? 'invalid-token'
                : kind === 'ADMIN'
                  ? adminToken
                  : studentToken,
            );
      expect(response.status).toBe(kind.endsWith('JWT') ? 401 : 403);
      expect(response.body).not.toHaveProperty('items');
    },
  );
  const invalidIds = ['academic_year_id', 'semester_id'].flatMap((field) =>
    ['', '0', '-1', '1.5', '1e2', 'abc', '01', ' 1'].map((value) => ({
      field,
      value,
    })),
  );
  it.each(invalidIds)(
    'rejects malformed $field=$value',
    async ({ field, value }) => {
      const response = await get({ [field]: value });
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining(field)]),
      );
    },
  );
  it.each(['0', '6', '1.5', 'abc', ''])(
    'rejects invalid year level %s',
    async (value) => {
      expect((await get({ year_level: value })).status).toBe(400);
    },
  );
  it.each(['course', 'LAB', ''])(
    'rejects invalid class type %s',
    async (value) => {
      expect((await get({ class_type: value })).status).toBe(400);
    },
  );
  it('rejects search exceeding 150 characters', async () => {
    expect((await get({ search: 'x'.repeat(151) })).status).toBe(400);
  });
  it.each(['academic_year_id', 'semester_id'])(
    'rejects repeated %s',
    async (field) => {
      const response = await api()
        .get(`${endpoint}?${field}=1&${field}=2`)
        .set('Authorization', `Bearer ${lecturerToken}`);
      expect(response.status).toBe(400);
    },
  );
  it.each(['academic_year_id', 'semester_id'])(
    'rejects out-of-storage-range %s with 400',
    async (field) => {
      const response = await get({ [field]: '9223372036854775808' });
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          `${field} must not exceed 9223372036854775807`,
        ]),
      );
    },
  );

  it.each(['academic_year_id', 'semester_id'])(
    'rejects excessively long %s without database encoding',
    async (field) => {
      const response = await get({ [field]: '9'.repeat(1000) });
      expect(response.status).toBe(400);
      expect(response.body.message).toEqual(
        expect.arrayContaining([
          `${field} must not exceed 9223372036854775807`,
        ]),
      );
    },
  );

  it.each(['academic_year_id', 'semester_id'])(
    'accepts an exact %s above JavaScript safe integer range',
    async (field) => {
      await expectItems({ [field]: '9007199254740993' }, []);
    },
  );

  it('documents optional string filters, syntax, lengths and the storage maximum', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    const parameters = document.paths[endpoint].get!.parameters!;
    for (const field of ['academic_year_id', 'semester_id']) {
      const parameter = parameters.find(
        (value) => 'name' in value && value.name === field,
      );
      expect(parameter).toMatchObject({
        name: field,
        in: 'query',
        required: false,
        description: expect.stringContaining('9223372036854775807'),
        schema: {
          type: 'string',
          minLength: 1,
          maxLength: 19,
          pattern: '^[1-9]\\d*$',
        },
      });
      if (
        !parameter ||
        !('schema' in parameter) ||
        !parameter.schema ||
        !('pattern' in parameter.schema)
      ) {
        throw new Error(
          'Expected a string filter schema with a decimal pattern',
        );
      }
      const pattern = new RegExp(parameter.schema.pattern!);
      expect(pattern.test('12345')).toBe(true);
      expect(pattern.test('01')).toBe(false);
    }
  });
});
