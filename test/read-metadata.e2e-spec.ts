import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Prisma, user_role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Persisted enrollment counts and self academic context (e2e)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let confirmed = false;
  let original: Array<{ table: string; hashes: string[] }>;
  const marker = `MR${Date.now()}`;
  const tokens: Record<string, string> = {};
  const names = Prisma.dmmf.datamodel.models
    .map((model) => model.dbName || model.name)
    .sort();
  const now = new Date();
  let f: {
    users: bigint[];
    department: bigint;
    majors: bigint[];
    years: bigint[];
    semesters: bigint[];
    generation: bigint;
    profiles: bigint[];
    records: Array<Prisma.student_academic_recordsGetPayload<object>>;
    course: bigint;
    offerings: bigint[];
    survey: bigint;
    version: bigint;
    question: bigint;
    evaluations: bigint[];
  };
  const api = () => request(app.getHttpServer());
  const auth = (role = 'STUDENT') => ({
    Authorization: `Bearer ${tokens[role]}`,
  });
  const me = () => api().get('/api/auth/me').set(auth());
  async function hashes() {
    const rows = [];
    for (const name of [...names, '_prisma_migrations']) {
      const values = await db.$queryRaw<Array<{ hash: string }>>(
        Prisma.sql`SELECT md5(to_jsonb(t)::text) AS hash FROM ${Prisma.raw(`public."${name}"`)} AS t ORDER BY 1`,
      );
      rows.push({ table: name, hashes: values.map((value) => value.hash) });
    }
    return rows;
  }
  async function retained() {
    const current = await hashes();
    for (const baseline of original) {
      const actual = new Set(
        current.find((row) => row.table === baseline.table)!.hashes,
      );
      expect(baseline.hashes.filter((hash) => !actual.has(hash))).toEqual([]);
    }
  }
  async function unchanged<T>(operation: () => PromiseLike<T>) {
    const before = await hashes();
    const result = await operation();
    expect(await hashes()).toEqual(before);
    return result;
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
    db = app.get(PrismaService);
    const [context] = await db.$queryRaw<
      Array<{ name: string; schema: string }>
    >`SELECT current_database() AS name, current_schema() AS schema`;
    expect(context).toEqual({
      name: 'teacher_evaluation_test',
      schema: 'public',
    });
    expect(await db.academic_years.count({ where: { is_active: true } })).toBe(
      0,
    );
    original = await hashes();
    confirmed = true;
    const hash = await bcrypt.hash('SyntheticMetadata123!', 10);
    f = await db.$transaction(
      async (tx) => {
        const users = [];
        for (const [index, role] of [
          'ADMIN',
          'LECTURER',
          'STUDENT',
          'STUDENT',
          'STUDENT',
        ].entries()) {
          users.push(
            (
              await tx.users.create({
                data: {
                  email: `${marker.toLowerCase()}-${index}@example.test`,
                  full_name: `${marker} ${index}`,
                  password_hash: hash,
                  role: role as user_role,
                  created_at: now,
                  updated_at: now,
                },
              })
            ).id,
          );
        }
        const department = await tx.departments.create({
          data: { code: marker, name: marker },
        });
        const majors = [];
        for (const code of ['DS', 'FE'])
          majors.push(
            (
              await tx.majors.create({
                data: {
                  department_id: department.id,
                  code: `${marker}-${code}`,
                  name: `${marker} ${code}`,
                },
              })
            ).id,
          );
        const years = [];
        for (const [index, start] of [2093, 2094, 2095].entries())
          years.push(
            (
              await tx.academic_years.create({
                data: {
                  name: `${marker}-${index}`,
                  start_year: start,
                  is_active: index === 1,
                },
              })
            ).id,
          );
        const semesters = [];
        for (const [index, year] of [years[1], years[0]].entries())
          semesters.push(
            (
              await tx.semesters.create({
                data: {
                  academic_year_id: year,
                  semester_name: `${marker}-${index}`,
                  semester_number: index + 1,
                  created_at: now,
                  updated_at: now,
                },
              })
            ).id,
          );
        const generation = await tx.student_generations.create({
          data: {
            name: marker,
            entry_academic_year_id: years[0],
            starting_year_level: 1,
          },
        });
        const profiles = [];
        const records = [];
        for (const index of [2, 3]) {
          const profile = await tx.students.create({
            data: {
              user_id: users[index],
              student_code: `${marker}-${index}`,
              generation_id: generation.id,
              notes: 'PRIVATE SELF NOTE NOT IN PROFILE',
              created_at: now,
              updated_at: now,
            },
          });
          profiles.push(profile.id);
          for (const yearIndex of [0, 1])
            records.push(
              await tx.student_academic_records.create({
                data: {
                  student_id: profile.id,
                  academic_year_id: years[yearIndex],
                  major_id: majors[0],
                  year_level: yearIndex + 1,
                  class_group: yearIndex ? 'A' : 'OLD-A',
                },
              }),
            );
        }
        const course = await tx.courses.create({
          data: {
            course_code: marker,
            course_name: marker,
            department_id: department.id,
            created_at: now,
            updated_at: now,
          },
        });
        const offerings = [];
        for (const [index, type] of ['COURSE', 'TD', 'TP'].entries())
          offerings.push(
            (
              await tx.course_offerings.create({
                data: {
                  course_id: course.id,
                  lecturer_id: users[1],
                  semester_id: semesters[index === 2 ? 1 : 0],
                  year_level: index === 2 ? 1 : 2,
                  class_type: type as 'COURSE' | 'TD' | 'TP',
                  section_code: `${marker}-CLASS-${index}`,
                  created_at: now,
                  updated_at: now,
                },
              })
            ).id,
          );
        for (const [major, group] of [
          [majors[0], 'A'],
          [majors[0], 'B'],
          [majors[1], 'A'],
        ] as const)
          await tx.course_offering_group_scopes.create({
            data: {
              course_offering_id: offerings[0],
              academic_year_id: years[1],
              generation_id: generation.id,
              major_id: major,
              year_level: 2,
              class_group: group,
            },
          });
        for (const index of [0, 2])
          await tx.enrollments.create({
            data: {
              student_id: users[2],
              course_offering_id: offerings[index],
              enrolled_at: now,
            },
          });
        const survey = await tx.surveys.create({
          data: {
            title: marker,
            created_by: users[0],
            created_at: now,
            updated_at: now,
          },
        });
        const version = await tx.survey_versions.create({
          data: {
            survey_id: survey.id,
            version_no: 1,
            created_by: users[0],
            created_at: now,
          },
        });
        const question = await tx.questions.create({
          data: {
            survey_version_id: version.id,
            question_text: marker,
            question_type: 'RATING',
            display_order: 1,
            is_required: true,
            min_rating: 1,
            max_rating: 5,
            created_at: now,
            updated_at: now,
          },
        });
        const evaluations = [];
        for (const index of [0, 1, 2])
          evaluations.push(
            (
              await tx.evaluations.create({
                data: {
                  course_offering_id: offerings[index],
                  survey_version_id: version.id,
                  status: index === 2 ? 'CLOSED' : 'DRAFT',
                  start_at: new Date(now.getTime() - 3600000),
                  end_at: new Date(now.getTime() + 86400000),
                  created_by: users[0],
                  created_at: now,
                  updated_at: now,
                },
              })
            ).id,
          );
        for (const [evaluation, student] of [
          [evaluations[0], users[2]],
          [evaluations[0], users[3]],
          [evaluations[1], users[3]],
          [evaluations[2], users[2]],
        ])
          await tx.evaluation_participants.create({
            data: {
              evaluation_id: evaluation,
              student_id: student,
              survey_version_id: version.id,
              created_at: now,
            },
          });
        return {
          users,
          department: department.id,
          majors,
          years,
          semesters,
          generation: generation.id,
          profiles,
          records,
          course: course.id,
          offerings,
          survey: survey.id,
          version: version.id,
          question: question.id,
          evaluations,
        };
      },
      { timeout: 20000 },
    );
    for (const [index, name] of [
      'ADMIN',
      'LECTURER',
      'STUDENT',
      'OTHER',
      'LEGACY',
    ].entries()) {
      const result = await api()
        .post('/api/auth/login')
        .send({
          identifier: `${marker.toLowerCase()}-${index}@example.test`,
          password: 'SyntheticMetadata123!',
        });
      expect(result.status).toBe(200);
      tokens[name] = result.body.access_token;
    }
  }, 30000);
  afterEach(async () => {
    if (!f) return;
    await db.users.update({
      where: { id: f.users[2] },
      data: { status: 'ACTIVE', updated_at: now },
    });
    for (const record of f.records)
      await db.student_academic_records.upsert({
        where: { id: record.id },
        create: record,
        update: record,
      });
    await db.enrollments.deleteMany({
      where: {
        course_offering_id: { in: f.offerings },
        student_id: f.users[3],
      },
    });
    for (const student of [f.users[2], f.users[3]])
      await db.evaluation_participants.upsert({
        where: {
          evaluation_id_student_id: {
            evaluation_id: f.evaluations[0],
            student_id: student,
          },
        },
        create: {
          evaluation_id: f.evaluations[0],
          student_id: student,
          survey_version_id: f.version,
          created_at: now,
        },
        update: {},
      });
    await db.evaluation_participants.upsert({
      where: {
        evaluation_id_student_id: {
          evaluation_id: f.evaluations[1],
          student_id: f.users[3],
        },
      },
      create: {
        evaluation_id: f.evaluations[1],
        student_id: f.users[3],
        survey_version_id: f.version,
        created_at: now,
      },
      update: {},
    });
    await retained();
  });
  afterAll(async () => {
    try {
      if (confirmed && f) {
        await db.$transaction(
          async (tx) => {
            await tx.evaluation_participants.deleteMany({
              where: { evaluation_id: { in: f.evaluations } },
            });
            await tx.evaluations.deleteMany({
              where: { id: { in: f.evaluations } },
            });
            await tx.questions.delete({ where: { id: f.question } });
            await tx.survey_versions.delete({ where: { id: f.version } });
            await tx.surveys.delete({ where: { id: f.survey } });
            await tx.enrollments.deleteMany({
              where: { course_offering_id: { in: f.offerings } },
            });
            await tx.course_offering_group_scopes.deleteMany({
              where: { course_offering_id: { in: f.offerings } },
            });
            await tx.course_offerings.deleteMany({
              where: { id: { in: f.offerings } },
            });
            await tx.courses.delete({ where: { id: f.course } });
            await tx.student_academic_records.deleteMany({
              where: { student_id: { in: f.profiles } },
            });
            await tx.students.deleteMany({ where: { id: { in: f.profiles } } });
            await tx.student_generations.delete({
              where: { id: f.generation },
            });
            await tx.majors.deleteMany({ where: { id: { in: f.majors } } });
            await tx.departments.delete({ where: { id: f.department } });
            await tx.semesters.deleteMany({
              where: { id: { in: f.semesters } },
            });
            await tx.academic_years.deleteMany({
              where: { id: { in: f.years } },
            });
            await tx.users.deleteMany({ where: { id: { in: f.users } } });
          },
          { timeout: 20000 },
        );
        expect(await hashes()).toEqual(original);
      }
    } finally {
      await app?.close();
    }
  });

  it.each(['ADMIN', 'LECTURER', 'STUDENT'])(
    '%s sees exact persisted counts on list/detail with complete semester metadata',
    async (role) => {
      const list = await unchanged(() =>
        api().get('/api/course-offerings').set(auth(role)),
      );
      expect(list.status).toBe(200);
      for (const [index, count] of [1, 0, 1].entries()) {
        const row = list.body.find(
          (value: { id: string }) => value.id === String(f.offerings[index]),
        );
        expect(row._count).toEqual({ enrollments: count });
        expect(row).not.toHaveProperty('enrollments');
        expect(row.semesters).toMatchObject({
          id: String(f.semesters[index === 2 ? 1 : 0]),
          academic_year_id: String(f.years[index === 2 ? 0 : 1]),
          semester_number: index === 2 ? 2 : 1,
          academic_years: { is_active: index !== 2 },
        });
        const detail = await unchanged(() =>
          api().get(`/api/course-offerings/${row.id}`).set(auth(role)),
        );
        expect(detail.status).toBe(200);
        expect(detail.body).toEqual(row);
      }
    },
  );
  it('counts enrollment rows independently of group scopes and frozen participants', async () => {
    expect(
      await db.course_offering_group_scopes.count({
        where: { course_offering_id: f.offerings[0] },
      }),
    ).toBe(3);
    expect(
      await db.evaluation_participants.count({
        where: { evaluation_id: f.evaluations[0] },
      }),
    ).toBe(2);
    const result = await unchanged(() =>
      api().get(`/api/course-offerings/${f.offerings[0]}`).set(auth('ADMIN')),
    );
    expect(result.body._count).toEqual({ enrollments: 1 });
    const empty = await unchanged(() =>
      api().get(`/api/course-offerings/${f.offerings[1]}`).set(auth('ADMIN')),
    );
    expect(empty.body._count).toEqual({ enrollments: 0 });
  });
  it('reflects enrollment changes without rewriting frozen participants', async () => {
    const before = await db.evaluation_participants.findMany({
      where: { evaluation_id: f.evaluations[0] },
      orderBy: { id: 'asc' },
    });
    await db.enrollments.create({
      data: {
        course_offering_id: f.offerings[0],
        student_id: f.users[3],
        enrolled_at: now,
      },
    });
    expect(
      (
        await unchanged(() =>
          api()
            .get(`/api/course-offerings/${f.offerings[0]}`)
            .set(auth('ADMIN')),
        )
      ).body._count.enrollments,
    ).toBe(2);
    expect(
      await db.evaluation_participants.findMany({
        where: { evaluation_id: f.evaluations[0] },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(before);
  });
  it('returns the full active-year self context and keeps the legacy placement', async () => {
    const response = await unchanged(me);
    expect(response.status).toBe(200);
    expect(response.body.profile_academic_year.id).toBe(String(f.years[1]));
    expect(response.body.student.academic_context).toMatchObject({
      academic_year: {
        id: String(f.years[1]),
        start_year: 2094,
        is_active: true,
      },
      academic_record: {
        id: String(f.records[1].id),
        academic_year_id: String(f.years[1]),
        major_id: String(f.majors[0]),
        class_group: 'A',
        progression_action: 'NORMAL',
        majors: {
          id: String(f.majors[0]),
          department_id: String(f.department),
        },
      },
      generation_entry_academic_year: {
        id: String(f.years[0]),
        start_year: 2093,
      },
      starting_year_level: 1,
      effective_year_level: 2,
      calculated_year_level: 2,
      calculation_status: 'CALCULATED',
      year_level_source: 'ACADEMIC_RECORD',
      progression_status: 'ACTIVE',
      placement_eligible: true,
      ineligibility_reason: null,
      placement: {
        academic_year_id: String(f.years[1]),
        major_id: String(f.majors[0]),
        class_group: 'A',
      },
    });
    expect(response.body.student.effective_placement).toMatchObject({
      major: { id: String(f.majors[0]) },
      year_level: 2,
      academic_year: { id: String(f.years[1]) },
    });
    expect(
      response.body.student.academic_context.academic_record.academic_years
        .is_active,
    ).toBe(true);
  });
  it('does not substitute an old group when the current-year placement is absent', async () => {
    await db.student_academic_records.delete({
      where: { id: f.records[1].id },
    });
    const response = await unchanged(me);
    expect(response.body.student.academic_context).toMatchObject({
      academic_year: { id: String(f.years[1]) },
      academic_record: null,
      effective_year_level: 2,
      placement_eligible: false,
      ineligibility_reason: 'MISSING_YEARLY_GROUP',
      placement: { class_group: null },
    });
    expect(response.body.student.effective_placement.major).toBeNull();
    expect(JSON.stringify(response.body.student)).not.toContain('OLD-A');
  });
  it('reports explicitly false eligibility for a current placement without a group', async () => {
    await db.student_academic_records.update({
      where: { id: f.records[1].id },
      data: { class_group: null },
    });
    const response = await unchanged(me);
    expect(response.body.student.academic_context).toMatchObject({
      academic_record: { class_group: null },
      placement_eligible: false,
      ineligibility_reason: 'MISSING_YEARLY_GROUP',
    });
  });
  it('keeps PAUSE active across a later NORMAL placement', async () => {
    await db.student_academic_records.update({
      where: { id: f.records[0].id },
      data: { progression_action: 'PAUSE' },
    });
    const response = await unchanged(me);
    expect(response.body.student.academic_context).toMatchObject({
      progression_status: 'PAUSED',
      placement_eligible: false,
      ineligibility_reason: 'PAUSED',
      academic_record: { class_group: 'A' },
    });
  });
  it('reports eligible progression only after an explicit RESUME', async () => {
    await db.student_academic_records.update({
      where: { id: f.records[0].id },
      data: { progression_action: 'PAUSE' },
    });
    await db.student_academic_records.update({
      where: { id: f.records[1].id },
      data: { progression_action: 'RESUME' },
    });
    expect((await unchanged(me)).body.student.academic_context).toMatchObject({
      progression_status: 'ACTIVE',
      placement_eligible: true,
      ineligibility_reason: null,
      academic_record: { progression_action: 'RESUME' },
    });
  });
  it('retains the approved repeat year instead of recalculating it in auth', async () => {
    await db.student_academic_records.update({
      where: { id: f.records[1].id },
      data: { progression_action: 'REPEAT', year_level: 1 },
    });
    expect((await unchanged(me)).body.student.academic_context).toMatchObject({
      calculated_year_level: 2,
      effective_year_level: 1,
      year_level_source: 'ACADEMIC_RECORD',
      placement_eligible: true,
    });
  });
  it('resolves placement eligibility independently of assigned evaluations', async () => {
    await db.evaluation_participants.deleteMany({
      where: { evaluation_id: { in: f.evaluations }, student_id: f.users[3] },
    });
    expect(
      await db.evaluation_participants.count({
        where: { student_id: f.users[3] },
      }),
    ).toBe(0);
    const response = await unchanged(() =>
      api().get('/api/auth/me').set(auth('OTHER')),
    );
    expect(response.body.student.academic_context).toMatchObject({
      academic_record: { id: String(f.records[3].id) },
      placement_eligible: true,
    });
  });
  it('preserves a null student profile rather than inventing eligibility', async () => {
    const response = await unchanged(() =>
      api().get('/api/auth/me').set(auth('LEGACY')),
    );
    expect(response.status).toBe(200);
    expect(response.body.student).toBeNull();
    expect(response.body.profile_academic_year).toBeNull();
  });
  it('ignores attempts to select another user or older academic year through self-profile query fields', async () => {
    const response = await unchanged(() =>
      api()
        .get(
          `/api/auth/me?user_id=${f.users[3]}&academic_year_id=${f.years[0]}`,
        )
        .set(auth()),
    );
    expect(response.body.id).toBe(String(f.users[2]));
    expect(response.body.student.academic_context.academic_record.id).toBe(
      String(f.records[1].id),
    );
  });
  it('does not leak administrative notes, account secrets, other students or evaluation-progress records', async () => {
    const response = await unchanged(me);
    const text = JSON.stringify(response.body);
    for (const secret of [
      'password_hash',
      'auth_version',
      'PRIVATE SELF NOTE',
      `${marker}-3`,
      'evaluation_progress',
      'student_academic_records',
    ])
      expect(text).not.toContain(secret);
    expect(response.body.student.academic_context).toBeDefined();
    expect(Object.keys(response.body.capabilities)).toEqual([
      'change_password',
      'reviewed_assignment_enrollment_v1',
      'automatic_course_codes_v1',
    ]);
  });
  it.each(['ADMIN', 'LECTURER'])(
    'preserves the %s profile without inventing student context',
    async (role) => {
      const response = await unchanged(() =>
        api().get('/api/auth/me').set(auth(role)),
      );
      expect(response.status).toBe(200);
      expect(response.body.role).toBe(role);
      expect(response.body).not.toHaveProperty('student');
    },
  );
  it.each(['/api/auth/me', '/api/course-offerings'])(
    'requires authentication for %s',
    async (url) => {
      expect((await unchanged(() => api().get(url))).status).toBe(401);
      expect(
        (
          await unchanged(() =>
            api().get(url).set({ Authorization: 'Bearer invalid' }),
          )
        ).status,
      ).toBe(401);
    },
  );
  it('requires an active account and retains ADMIN-only student editing', async () => {
    expect(
      (
        await unchanged(() =>
          api()
            .put(`/api/students/${f.profiles[0]}`)
            .set(auth())
            .send({ full_name: 'Attempted edit' }),
        )
      ).status,
    ).toBe(403);
    await db.users.update({
      where: { id: f.users[2] },
      data: { status: 'INACTIVE' },
    });
    expect((await unchanged(me)).status).toBe(401);
  });
  it('retains student academic-year access and distinguishes active and future years', async () => {
    const response = await unchanged(() =>
      api().get('/api/academic-years').set(auth()),
    );
    expect(response.status).toBe(200);
    expect(
      response.body.find((row: { id: string }) => row.id === String(f.years[1]))
        .is_active,
    ).toBe(true);
    expect(
      response.body.find((row: { id: string }) => row.id === String(f.years[2]))
        .is_active,
    ).toBe(false);
  });
  it('retains assigned historical classes and class labels separately from the profile group', async () => {
    const history = await unchanged(() =>
      api().get('/api/student/evaluations/history').set(auth()),
    );
    expect(history.status).toBe(200);
    expect(
      history.body.some(
        (row: { id: string }) => row.id === String(f.evaluations[1]),
      ),
    ).toBe(false);
    expect(
      history.body.find(
        (row: { id: string }) => row.id === String(f.evaluations[2]),
      ),
    ).toMatchObject({
      section_code: `${marker}-CLASS-2`,
      class_type: 'TP',
      course: { code: marker },
      semester: {
        semester_number: 2,
        academic_year_id: String(f.years[0]),
        is_active: false,
      },
    });
    expect(
      (await unchanged(me)).body.student.academic_context.academic_record
        .class_group,
    ).toBe('A');
  });
  it('keeps lecturer CLOSED-only reports free of student identities', async () => {
    const result = await unchanged(() =>
      api().get('/api/lecturer/results').set(auth('LECTURER')),
    );
    expect(result.status).toBe(200);
    const text = JSON.stringify(result.body);
    for (const value of [
      `${marker} 2`,
      `${marker} 3`,
      `${marker}-2`,
      `${marker}-3`,
      'student_code',
      'student_id',
      'participant_id',
      'response_id',
      'password_hash',
    ])
      expect(text).not.toContain(value);
    expect(
      result.body.evaluations.map(
        (row: { evaluation: { id: string } }) => row.evaluation.id,
      ),
    ).toEqual([String(f.evaluations[2])]);
  });
  it('documents persisted counts and self-only context with explicit unknown eligibility', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
    );
    expect(
      document.paths['/api/course-offerings'].get!.responses['200'],
    ).toMatchObject({
      content: {
        'application/json': {
          schema: {
            example: [expect.objectContaining({ _count: { enrollments: 0 } })],
          },
        },
      },
    });
    const profile = document.paths['/api/auth/me'].get!.responses['200'];
    if (!profile || !('description' in profile))
      throw new Error('Expected profile response description');
    expect(profile.description).toContain('placement_eligible');
    expect(profile.description).toContain('null');
  });
});
