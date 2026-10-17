import { selectedTestDatabase } from './utils/test-database';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { evaluation_status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Student import/export business flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let databaseConfirmed = false;
  let token: string;
  let serial = 0;
  const stamp = Date.now();
  const marker = `E2E-IE-${stamp}`;
  const prefix = `${marker.toLowerCase()}-`;
  const missingId = '9000000000000000000';
  const secretAnswer = `${marker} anonymous answer must stay private`;
  let fixtures:
    | {
        departments: bigint[];
        majors: bigint[];
        years: bigint[];
        semesters: bigint[];
        generations: bigint[];
        accounts: bigint[];
        profiles: bigint[];
        codes: string[];
        evaluations: bigint[];
        offerings: bigint[];
        assignmentLecturers: bigint[];
        course: bigint;
        survey: bigint;
        version: bigint;
        question: bigint;
      }
    | undefined;
  const f = () => {
    if (!fixtures) throw new Error('Owned import/export fixtures unavailable');
    return fixtures;
  };
  const api = () => request(app.getHttpServer());
  const admin = () => ({ Authorization: `Bearer ${token}` });
  const code = () => `${prefix}new-${++serial}`;
  const row = (overrides: Record<string, unknown> = {}) => ({
    student_code: code(),
    full_name: `${marker} Imported ${serial}`,
    major: `${marker} Major A`,
    ...overrides,
  });
  const payload = (overrides: Record<string, unknown> = {}) => ({
    generation: `${marker} Gen A`,
    academic_year_id: f().years[0].toString(),
    year_level: 1,
    class_group: ' a ',
    students: [row()],
    ...overrides,
  });
  const importRows = (body: Record<string, unknown>) =>
    api().post('/api/students/import').set(admin()).send(body);
  const exportRows = (query: Record<string, unknown> = {}) =>
    api()
      .get('/api/students/export')
      .set(admin())
      .query({
        generation_id: f().generations[0].toString(),
        ...query,
      });

  function assertNoPrivateFields(value: unknown) {
    if (Array.isArray(value)) value.forEach(assertNoPrivateFields);
    else if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        expect([
          'password',
          'password_hash',
          'auth_version',
          'access_token',
          'answers',
          'responses',
          'text_value',
          'rating_value',
          'student_user_id',
        ]).not.toContain(key);
        assertNoPrivateFields(child);
      }
    }
  }

  async function ownedState() {
    const students = await prisma.students.findMany({
      where: { student_code: { startsWith: prefix } },
      orderBy: { id: 'asc' },
    });
    return {
      students,
      users: await prisma.users.findMany({
        where: {
          OR: [
            { full_name: { startsWith: marker } },
            { full_name: { startsWith: prefix } },
          ],
        },
        orderBy: { id: 'asc' },
      }),
      placements: await prisma.student_academic_records.findMany({
        where: { student_id: { in: students.map((s) => s.id) } },
        orderBy: { id: 'asc' },
      }),
      generations: await prisma.student_generations.findMany({
        where: { name: { startsWith: marker } },
        orderBy: { id: 'asc' },
      }),
      participants: await prisma.evaluation_participants.findMany({
        where: { evaluation_id: { in: f().evaluations } },
        orderBy: { id: 'asc' },
      }),
      responses: await prisma.responses.findMany({
        where: { evaluation_id: { in: f().evaluations } },
        orderBy: { id: 'asc' },
      }),
      answers: await prisma.answers.findMany({
        where: { question_id: f().question },
      }),
    };
  }

  async function cleanupImported() {
    if (!fixtures || !databaseConfirmed) return;
    await prisma.$transaction(async (tx) => {
      const users = await tx.users.findMany({
        where: {
          id: { notIn: f().accounts },
          OR: [
            { full_name: { startsWith: marker } },
            { full_name: { startsWith: prefix } },
          ],
        },
        select: { id: true },
      });
      const ids = users.map((u) => u.id);
      const profiles = await tx.students.findMany({
        where: { user_id: { in: ids } },
        select: { id: true },
      });
      await tx.student_academic_records.deleteMany({
        where: { student_id: { in: profiles.map((s) => s.id) } },
      });
      await tx.students.deleteMany({ where: { user_id: { in: ids } } });
      await tx.users.deleteMany({ where: { id: { in: ids } } });
      await tx.student_generations.deleteMany({
        where: { name: { startsWith: marker }, id: { notIn: f().generations } },
      });
    });
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
    databaseConfirmed = true;
    const login = await api().post('/api/auth/login').send({
      identifier: 'admin@itc.edu.kh',
      password: 'Password123',
    });
    expect(login.status).toBe(200);
    token = login.body.access_token;
    const adminUser = await prisma.users.findUniqueOrThrow({
      where: { email: 'admin@itc.edu.kh' },
    });
    const lecturer = await prisma.users.findUniqueOrThrow({
      where: { email: 'sokdara@itc.edu.kh' },
    });
    const passwordHash = await bcrypt.hash('Password123', 10);
    fixtures = await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const departments: bigint[] = [];
        const majors: bigint[] = [];
        const years: bigint[] = [];
        const semesters: bigint[] = [];
        const generations: bigint[] = [];
        const accounts: bigint[] = [];
        const profiles: bigint[] = [];
        const codes: string[] = [];
        const evaluations: bigint[] = [];
        const offerings: bigint[] = [];
        const assignmentLecturers: bigint[] = [];
        for (const suffix of ['A', 'B']) {
          departments.push(
            (
              await tx.departments.create({
                data: {
                  code: `IE-${stamp}-${suffix}`,
                  name: `${marker} Department ${suffix}`,
                },
              })
            ).id,
          );
        }
        for (const [index, name] of [
          'Major A',
          'Major B',
          'Ambiguous',
          'Ambiguous',
        ].entries()) {
          majors.push(
            (
              await tx.majors.create({
                data: {
                  code: `IE-${stamp}-${index}`,
                  name: `${marker} ${name}`,
                  department_id: departments[index === 3 ? 1 : 0],
                },
              })
            ).id,
          );
        }
        // IDs increase while start_year decreases, so latest placement cannot rely on IDs.
        for (const startYear of [2027, 2026]) {
          years.push(
            (
              await tx.academic_years.create({
                data: {
                  name: `IE${startYear}-${stamp}`,
                  start_year: startYear,
                  is_active: false,
                },
              })
            ).id,
          );
        }
        years.reverse();
        for (const [year, number, name] of [
          [years[0], 1, 'Label says Semester 2'],
          [years[0], 2, 'Label says Semester 1'],
          [years[1], 1, 'Later period'],
        ] as const) {
          semesters.push(
            (
              await tx.semesters.create({
                data: {
                  academic_year_id: year,
                  semester_number: number,
                  semester_name: name,
                  created_at: now,
                  updated_at: now,
                },
              })
            ).id,
          );
        }
        for (const suffix of ['Gen A', 'Gen B', 'Case', 'case']) {
          generations.push(
            (
              await tx.student_generations.create({
                data: {
                  name: `${marker} ${suffix}`,
                  entry_academic_year_id: years[0],
                  starting_year_level: 1,
                },
              })
            ).id,
          );
        }
        for (const [index, suffix] of [
          'a',
          'b',
          'c',
          'd',
          'draft-only',
        ].entries()) {
          const user = await tx.users.create({
            data: {
              full_name: `${marker} Baseline ${suffix}`,
              email: null,
              password_hash: passwordHash,
              role: 'STUDENT',
              status: index === 1 ? 'INACTIVE' : 'ACTIVE',
              created_at: now,
              updated_at: now,
            },
          });
          const student = await tx.students.create({
            data: {
              user_id: user.id,
              student_code: `${prefix}${suffix}`,
              generation_id: generations[index === 3 ? 1 : 0],
              notes: 'Preserved synthetic baseline',
            },
          });
          accounts.push(user.id);
          profiles.push(student.id);
          codes.push(student.student_code);
          for (const [yearIndex, year] of years.entries()) {
            await tx.student_academic_records.create({
              data: {
                student_id: student.id,
                academic_year_id: year,
                year_level: yearIndex + 1,
                major_id: majors[(index + yearIndex) % 2],
                class_group: yearIndex ? 'B' : ' a ',
              },
            });
          }
        }
        const course = await tx.courses.create({
          data: {
            course_code: `IE-${stamp}`,
            course_name: `${marker} Course`,
            department_id: departments[0],
            created_at: now,
            updated_at: now,
          },
        });
        const survey = await tx.surveys.create({
          data: {
            title: `${marker} Survey`,
            created_by: adminUser.id,
            created_at: now,
            updated_at: now,
          },
        });
        const version = await tx.survey_versions.create({
          data: {
            survey_id: survey.id,
            version_no: 1,
            status: 'LOCKED',
            locked_at: now,
            created_by: adminUser.id,
            created_at: now,
          },
        });
        const question = await tx.questions.create({
          data: {
            survey_version_id: version.id,
            question_text: `${marker} Private question`,
            question_type: 'TEXT',
            display_order: 1,
            created_at: now,
            updated_at: now,
          },
        });
        async function evaluation(
          semester: bigint,
          status: evaluation_status,
          timing: 'active' | 'future' | 'expired' | 'unscheduled',
          participants: Array<[number, boolean]>,
        ) {
          const teachingLecturer =
            offerings.length === 0
              ? lecturer.id
              : (
                  await tx.users.create({
                    data: {
                      role: 'LECTURER',
                      full_name: 'Synthetic import-export lecturer',
                      email: `${prefix}lecturer-${offerings.length}@test.invalid`,
                      password_hash: passwordHash,
                      created_at: now,
                      updated_at: now,
                    },
                  })
                ).id;
          if (teachingLecturer !== lecturer.id)
            assignmentLecturers.push(teachingLecturer);
          const offering = await tx.course_offerings.create({
            data: {
              course_id: course.id,
              lecturer_id: teachingLecturer,
              semester_id: semester,
              year_level: 1,
              class_type: 'COURSE',
              section_code: `IE-${offerings.length}`,
              created_at: now,
              updated_at: now,
            },
          });
          offerings.push(offering.id);
          const startOffset =
            timing === 'future'
              ? 3600000
              : timing === 'expired'
                ? -7200000
                : -3600000;
          const endOffset = timing === 'expired' ? -3600000 : 7200000;
          const ev = await tx.evaluations.create({
            data: {
              course_offering_id: offering.id,
              survey_version_id: version.id,
              status,
              start_at:
                timing === 'unscheduled'
                  ? null
                  : new Date(now.getTime() + startOffset),
              end_at:
                timing === 'unscheduled'
                  ? null
                  : new Date(now.getTime() + endOffset),
              created_by: adminUser.id,
              created_at: now,
              updated_at: now,
            },
          });
          evaluations.push(ev.id);
          for (const [index, submitted] of participants) {
            await tx.enrollments.create({
              data: {
                student_id: accounts[index],
                course_offering_id: offering.id,
                enrolled_at: now,
              },
            });
            await tx.evaluation_participants.create({
              data: {
                evaluation_id: ev.id,
                student_id: accounts[index],
                survey_version_id: version.id,
                has_submitted: submitted,
                submitted_at: submitted ? now : null,
                created_at: now,
              },
            });
          }
          return ev;
        }
        const answered = await evaluation(semesters[0], 'OPEN', 'active', [
          [0, true],
        ]);
        await evaluation(semesters[0], 'OPEN', 'active', [
          [0, false],
          [1, true],
          [3, false],
        ]);
        await evaluation(semesters[0], 'CLOSED', 'active', [[0, true]]);
        await evaluation(semesters[0], 'OPEN', 'future', [
          [0, false],
          [1, false],
        ]);
        await evaluation(semesters[0], 'OPEN', 'expired', [[0, false]]);
        await evaluation(semesters[0], 'OPEN', 'unscheduled', [[0, false]]);
        await evaluation(semesters[0], 'DRAFT', 'active', [
          [0, true],
          [4, false],
        ]);
        await evaluation(semesters[1], 'OPEN', 'active', [[0, false]]);
        await evaluation(semesters[2], 'CLOSED', 'expired', [
          [0, true],
          [1, false],
        ]);
        const response = await tx.responses.create({
          data: {
            evaluation_id: answered.id,
            survey_version_id: version.id,
            submitted_at: now,
            created_at: now,
          },
        });
        await tx.answers.create({
          data: {
            response_id: response.id,
            question_id: question.id,
            text_value: secretAnswer,
            created_at: now,
          },
        });
        return {
          departments,
          majors,
          years,
          semesters,
          generations,
          accounts,
          profiles,
          codes,
          evaluations,
          offerings,
          assignmentLecturers,
          course: course.id,
          survey: survey.id,
          version: version.id,
          question: question.id,
        };
      },
      { timeout: 20000 },
    );
  }, 30000);

  afterEach(cleanupImported);
  afterAll(async () => {
    try {
      if (fixtures && databaseConfirmed) {
        await cleanupImported();
        await prisma.$transaction(async (tx) => {
          await tx.answers.deleteMany({ where: { question_id: f().question } });
          await tx.responses.deleteMany({
            where: { evaluation_id: { in: f().evaluations } },
          });
          await tx.evaluation_participants.deleteMany({
            where: { evaluation_id: { in: f().evaluations } },
          });
          await tx.evaluations.deleteMany({
            where: { id: { in: f().evaluations } },
          });
          await tx.enrollments.deleteMany({
            where: { course_offering_id: { in: f().offerings } },
          });
          await tx.course_offerings.deleteMany({
            where: { id: { in: f().offerings } },
          });
          await tx.users.deleteMany({
            where: { id: { in: f().assignmentLecturers } },
          });
          await tx.questions.delete({ where: { id: f().question } });
          await tx.survey_versions.delete({ where: { id: f().version } });
          await tx.surveys.delete({ where: { id: f().survey } });
          await tx.courses.delete({ where: { id: f().course } });
          await tx.student_academic_records.deleteMany({
            where: { student_id: { in: f().profiles } },
          });
          await tx.students.deleteMany({ where: { id: { in: f().profiles } } });
          await tx.users.deleteMany({ where: { id: { in: f().accounts } } });
          await tx.student_generations.deleteMany({
            where: { id: { in: f().generations } },
          });
          await tx.semesters.deleteMany({
            where: { id: { in: f().semesters } },
          });
          await tx.academic_years.deleteMany({
            where: { id: { in: f().years } },
          });
          await tx.majors.deleteMany({ where: { id: { in: f().majors } } });
          await tx.departments.deleteMany({
            where: { id: { in: f().departments } },
          });
        });
      }
    } finally {
      if (app) await app.close();
    }
  });

  it('imports mixed rows with ordered CREATED/SKIPPED/FAILED outcomes and exact committed placement', async () => {
    const valid = row({ gender: 'FEMALE', notes: '  Synthetic notes  ' });
    const unknown = row({ major: `${marker} Missing` });
    const ambiguous = row({ major: `${marker} Ambiguous` });
    const existing = row({
      student_code: ` ${f().codes[1].toUpperCase()} `,
      major: `${marker} Missing`,
    });
    const before = await ownedState();
    const res = await importRows(
      payload({ students: [valid, existing, unknown, ambiguous] }),
    );
    expect(res.status).toBe(201);
    expect(res.body.summary).toEqual({
      total: 4,
      created: 1,
      skipped: 1,
      failed: 2,
    });
    expect(res.body.results.map((r: any) => [r.row, r.status])).toEqual([
      [1, 'CREATED'],
      [2, 'SKIPPED'],
      [3, 'FAILED'],
      [4, 'FAILED'],
    ]);
    expect(res.body.results[2].message).toMatch(/not found/i);
    expect(res.body.results[3].message).toMatch(/ambiguous/i);
    const created = await prisma.students.findUniqueOrThrow({
      where: { student_code: valid.student_code },
      include: { users: true, student_academic_records: true },
    });
    expect(res.body.results[0].student_id).toBe(created.id.toString());
    expect(created.users).toMatchObject({
      role: 'STUDENT',
      status: 'ACTIVE',
      gender: 'FEMALE',
      email: null,
    });
    expect(created.notes).toBe('Synthetic notes');
    expect(created.student_academic_records).toHaveLength(1);
    expect(created.student_academic_records[0]).toMatchObject({
      academic_year_id: f().years[0],
      major_id: f().majors[0],
      year_level: 1,
      class_group: 'A',
    });
    const after = await ownedState();
    expect(after.students.filter((s) => s.id !== created.id)).toEqual(
      before.students,
    );
    expect(after.users.filter((u) => u.id !== created.user_id)).toEqual(
      before.users,
    );
    expect(after.placements.filter((p) => p.student_id !== created.id)).toEqual(
      before.placements,
    );
    assertNoPrivateFields(res.body);
  });

  it('retries skip existing codes without overwriting accounts, passwords or yearly history', async () => {
    const input = payload({ students: [row(), row()] });
    const first = await importRows(input);
    expect(first.status).toBe(201);
    expect(first.body.summary).toEqual({
      total: 2,
      created: 2,
      skipped: 0,
      failed: 0,
    });
    const before = await ownedState();
    const retry = await importRows({
      ...input,
      generation: `${marker} Gen B`,
      academic_year_id: f().years[1].toString(),
      year_level: 5,
      initial_password: 'Different123',
      students: (input.students as any[]).map((r) => ({
        ...r,
        full_name: `${marker} Changed`,
        major: `${marker} Missing`,
      })),
    });
    expect(retry.status).toBe(201);
    expect(retry.body.summary).toEqual({
      total: 2,
      created: 0,
      skipped: 2,
      failed: 0,
    });
    expect(await ownedState()).toEqual(before);
  });

  it.each(['code', 'name'])(
    'resolves a major by case-insensitive exact %s',
    async (lookup) => {
      const major = await prisma.majors.findUniqueOrThrow({
        where: { id: f().majors[0] },
      });
      const majorLabel = lookup === 'code' ? major.code : major.name;
      const valid = row({ major: `  ${majorLabel.toLowerCase()}  ` });
      const res = await importRows(payload({ students: [valid] }));
      expect(res.status).toBe(201);
      expect(res.body.summary.created).toBe(1);
      const placement = await prisma.student_academic_records.findFirstOrThrow({
        where: { students: { student_code: valid.student_code } },
      });
      expect(placement.major_id).toBe(major.id);
    },
  );

  it('normalizes a reused generation without changing its entry year or starting level', async () => {
    const before = await prisma.student_generations.findUniqueOrThrow({
      where: { id: f().generations[0] },
    });
    const res = await importRows(
      payload({
        generation: `  ${marker.toLowerCase()}   gen   a  `,
        entry_academic_year_id: f().years[1].toString(),
        starting_year_level: 5,
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.generation.id).toBe(before.id.toString());
    expect(
      await prisma.student_generations.findUniqueOrThrow({
        where: { id: before.id },
      }),
    ).toEqual(before);
  });

  it.each(['ASCII', 'Unicode'])(
    'stores and safely retries a normalized 100-character %s generation name',
    async (kind) => {
      const head = `${marker} `;
      const name =
        head +
        (kind === 'ASCII' ? 'x' : '🎓').repeat(100 - Array.from(head).length);
      const input = payload({
        generation: `  ${name.replace(/ /g, '   ')}  `,
        entry_academic_year_id: f().years[0].toString(),
      });
      const res = await importRows(input);
      expect(res.status).toBe(201);
      expect(res.body.summary).toEqual({
        total: 1,
        created: 1,
        skipped: 0,
        failed: 0,
      });
      expect(res.body.generation.name).toBe(name);
      expect(Array.from(res.body.generation.name)).toHaveLength(100);
      const generations = await prisma.student_generations.findMany({
        where: { name, ownership_state: 'LEGACY_READ_ONLY' },
      });
      expect(generations).toHaveLength(1);
      const generation = generations[0];
      expect(generation.id.toString()).toBe(res.body.generation.id);
      const student = await prisma.students.findUniqueOrThrow({
        where: { id: BigInt(res.body.results[0].student_id) },
        include: { users: true, student_academic_records: true },
      });
      expect(student.generation_id).toBe(generation.id);
      expect(student.users.role).toBe('STUDENT');
      expect(student.student_academic_records).toHaveLength(1);
      expect(student.student_academic_records[0]).toMatchObject({
        academic_year_id: f().years[0],
        major_id: f().majors[0],
        year_level: 1,
        class_group: 'A',
      });
      const beforeRetry = await ownedState();
      const retry = await importRows(input);
      expect(retry.status).toBe(201);
      expect(retry.body.summary).toEqual({
        total: 1,
        created: 0,
        skipped: 1,
        failed: 0,
      });
      expect(await ownedState()).toEqual(beforeRetry);
    },
  );

  it.each(['ASCII', 'Unicode'])(
    'rejects a normalized 101-character %s generation before any import writes',
    async (kind) => {
      const head = `${marker} `;
      const generation =
        head +
        (kind === 'ASCII' ? 'x' : '🎓').repeat(101 - Array.from(head).length);
      const before = await ownedState();
      const res = await importRows(
        payload({
          generation: ` ${generation} `,
          entry_academic_year_id: f().years[0].toString(),
        }),
      );
      expect(res.status).toBe(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('generation')]),
      );
      expect(await ownedState()).toEqual(before);
    },
  );

  it.each([42, { name: 'Generation' }])(
    'rejects a non-string generation without a transformation error: %p',
    async (generation) => {
      const before = await ownedState();
      const res = await importRows(payload({ generation }));
      expect(res.status).toBe(400);
      expect(await ownedState()).toEqual(before);
    },
  );

  it('publishes the matching 100-character generation limit in OpenAPI', () => {
    const document = SwaggerModule.createDocument(app, {
      openapi: '3.0.0',
      info: { title: 'Import contract test', version: '1' },
    });
    const schema = document.components?.schemas?.ImportStudentsDto;
    expect(schema).toMatchObject({
      properties: { generation: { type: 'string', maxLength: 100 } },
    });
  });

  it('creates a normalized generation with explicit entry chronology and year level', async () => {
    const res = await importRows(
      payload({
        generation: ` ${marker}  New  `,
        entry_academic_year_id: f().years[0].toString(),
        starting_year_level: 2,
        year_level: 2,
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.generation).toMatchObject({
      name: `${marker} New`,
      entry_academic_year_id: f().years[0].toString(),
      starting_year_level: 2,
    });
    const placement = await prisma.student_academic_records.findFirstOrThrow({
      where: { students: { id: BigInt(res.body.results[0].student_id) } },
    });
    expect(placement.year_level).toBe(2);
  });

  it('reports all unknown-major rows failed while retaining the newly created shared generation', async () => {
    const invalid = row({ major: `${marker} Missing` });
    const before = await ownedState();
    const res = await importRows(
      payload({
        generation: `${marker} EmptyImport`,
        entry_academic_year_id: f().years[0].toString(),
        students: [invalid],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.summary).toEqual({
      total: 1,
      created: 0,
      skipped: 0,
      failed: 1,
    });
    const after = await ownedState();
    expect(after.students).toEqual(before.students);
    expect(after.users).toEqual(before.users);
    expect(after.placements).toEqual(before.placements);
    expect(after.generations).toHaveLength(before.generations.length + 1);
  });

  it('uses normalized code for a blank name and preserves optional nulls', async () => {
    const normalized = code();
    const res = await importRows(
      payload({
        class_group: ' ',
        students: [
          row({
            student_code: ` ${normalized.toUpperCase()} `,
            full_name: ' ',
            notes: ' ',
          }),
        ],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.summary.created).toBe(1);
    const student = await prisma.students.findUniqueOrThrow({
      where: { student_code: normalized },
      include: { users: true, student_academic_records: true },
    });
    expect(student.users.full_name).toBe(normalized);
    expect(student.users.gender).toBeNull();
    expect(student.notes).toBeNull();
    expect(student.student_academic_records[0].class_group).toBeNull();
  });

  it.each([undefined, ' ', 'Custom123'])(
    'supports default/blank/custom initial password %p with distinct hashes and real login',
    async (password) => {
      const rows = [row(), row()];
      const res = await importRows(
        payload({ initial_password: password, students: rows }),
      );
      expect(res.status).toBe(201);
      expect(res.body.summary.created).toBe(2);
      const users = await prisma.users.findMany({
        where: {
          student: { student_code: { in: rows.map((r) => r.student_code) } },
        },
      });
      expect(users).toHaveLength(2);
      expect(users[0].password_hash).not.toBe(users[1].password_hash);
      const expectedPassword = password?.trim() ? password : 'password@1235';
      for (const user of users)
        expect(await bcrypt.compare(expectedPassword, user.password_hash)).toBe(
          true,
        );
      const login = await api()
        .post('/api/auth/login')
        .send({ identifier: rows[0].student_code, password: expectedPassword });
      expect(login.status).toBe(200);
      expect(typeof login.body.access_token).toBe('string');
      assertNoPrivateFields(res.body);
    },
  );

  it.each([
    ['blank generation', () => ({ generation: ' ' })],
    ['empty rows', () => ({ students: [] })],
    [
      '501 rows',
      () => ({ students: Array.from({ length: 501 }, () => row()) }),
    ],
    [
      'duplicate normalized codes',
      () => {
        const r = row();
        return {
          students: [
            r,
            { ...r, student_code: ` ${r.student_code.toUpperCase()} ` },
          ],
        };
      },
    ],
    ['blank code', () => ({ students: [row({ student_code: ' ' })] })],
    ['invalid gender', () => ({ students: [row({ gender: 'UNKNOWN' })] })],
    ['missing major', () => ({ students: [{ student_code: code() }] })],
    [
      'oversized code',
      () => ({ students: [row({ student_code: 'x'.repeat(51) })] }),
    ],
    ['numeric year ID', () => ({ academic_year_id: 1 })],
    ['nonpositive year ID', () => ({ academic_year_id: '0' })],
    ['year level below range', () => ({ year_level: 0 })],
    ['year level above range', () => ({ year_level: 6 })],
    ['short password', () => ({ initial_password: 'short' })],
    ['73-character password', () => ({ initial_password: 'x'.repeat(73) })],
    ['UTF-8 byte overflow', () => ({ initial_password: 'ក'.repeat(25) })],
  ] as Array<[string, () => Record<string, unknown>]>)(
    'rejects %s before generation/account writes',
    async (_label, override) => {
      const before = await ownedState();
      const res = await importRows(
        payload({
          generation: `${marker} Rejected`,
          entry_academic_year_id: f().years[0].toString(),
          ...override(),
        }),
      );
      expect(res.status).toBe(400);
      expect(await ownedState()).toEqual(before);
    },
  );

  it.each([
    ['missing placement year', () => ({ academic_year_id: missingId }), 404],
    [
      'missing new generation entry year',
      () => ({ generation: `${marker} New` }),
      400,
    ],
    [
      'unknown entry year',
      () => ({
        generation: `${marker} New`,
        entry_academic_year_id: missingId,
      }),
      404,
    ],
    ['ambiguous generation', () => ({ generation: `${marker} CASE` }), 409],
  ] as Array<[string, () => Record<string, unknown>, number]>)(
    'rejects %s without partial writes',
    async (_label, override, status) => {
      const before = await ownedState();
      const res = await importRows(payload(override()));
      expect(res.status).toBe(status);
      expect(await ownedState()).toEqual(before);
    },
  );

  it('exports all matching profiles and exact all-period progress without pagination truncation', async () => {
    const before = await ownedState();
    const started = Date.now();
    const res = await exportRows({ page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.preview).toEqual({ student_count: 4, complete: true });
    expect(res.body.data.map((s: any) => s.student_code)).toEqual(
      [f().codes[0], f().codes[1], f().codes[2], f().codes[4]].sort(),
    );
    const a = res.body.data.find((s: any) => s.student_code === f().codes[0]);
    expect(a.active).toEqual({ assigned: 3, completed: 1, left: 2 });
    expect(a.total).toEqual({ assigned: 8, completed: 3, not_completed: 5 });
    expect(a.placement.academic_year.id).toBe(f().years[1].toString());
    expect(a.major.id).toBe(f().majors[1].toString());
    const generated = Date.parse(res.body.report.generated_at);
    expect(generated).toBeGreaterThanOrEqual(started);
    expect(generated).toBeLessThanOrEqual(Date.now());
    expect(res.body.report.identifiable_participation_data).toBe(true);
    expect(res.body.report.privacy_notice).toMatch(/authorized staff/i);
    assertNoPrivateFields(res.body);
    expect(JSON.stringify(res.body)).not.toContain(secretAnswer);
    expect(JSON.stringify(res.body)).not.toContain(
      `${marker} Private question`,
    );
    expect(await ownedState()).toEqual(before);
  });

  it('keeps real zero progress for unassigned and draft-only profiles without a period filter', async () => {
    const res = await exportRows();
    expect(res.status).toBe(200);
    for (const index of [2, 4]) {
      const student = res.body.data.find(
        (s: any) => s.student_code === f().codes[index],
      );
      expect(student.active).toEqual({ assigned: 0, completed: 0, left: 0 });
      expect(student.total).toEqual({
        assigned: 0,
        completed: 0,
        not_completed: 0,
      });
    }
  });

  it('scopes year totals to published assigned evaluations and retains inactive participation history', async () => {
    const res = await exportRows({ academic_year_id: f().years[0].toString() });
    expect(res.status).toBe(200);
    expect(res.body.preview.student_count).toBe(2);
    const a = res.body.data.find((s: any) => s.student_code === f().codes[0]);
    const b = res.body.data.find((s: any) => s.student_code === f().codes[1]);
    expect(a.active).toEqual({ assigned: 3, completed: 1, left: 2 });
    expect(a.total).toEqual({ assigned: 7, completed: 2, not_completed: 5 });
    expect(a.major.id).toBe(f().majors[0].toString());
    expect(a.placement.class_group).toBe('A');
    expect(b.account_status).toBe('INACTIVE');
    expect(b.total).toEqual({ assigned: 2, completed: 1, not_completed: 1 });
  });

  it.each([
    [
      1,
      0,
      { assigned: 2, completed: 1, left: 1 },
      { assigned: 6, completed: 2, not_completed: 4 },
    ],
    [
      2,
      1,
      { assigned: 1, completed: 0, left: 1 },
      { assigned: 1, completed: 0, not_completed: 1 },
    ],
  ])(
    'uses stored semester number %i rather than its misleading name',
    async (number, index, active, total) => {
      const res = await exportRows({
        academic_year_id: f().years[0].toString(),
        semester_number: number,
      });
      expect(res.status).toBe(200);
      expect(res.body.report.scope.semester_id).toBe(
        f().semesters[index as number].toString(),
      );
      expect(res.body.report.scope.semester_number).toBe(number);
      const a = res.body.data.find((s: any) => s.student_code === f().codes[0]);
      expect(a.active).toEqual(active);
      expect(a.total).toEqual(total);
      expect(res.body.preview.student_count).toBe(number === 1 ? 2 : 1);
    },
  );

  it('matches a normalized yearly group/major using historical placement instead of the latest major', async () => {
    const res = await exportRows({
      academic_year_id: f().years[0].toString(),
      major_id: f().majors[0].toString(),
      class_group: ' a ',
    });
    expect(res.status).toBe(200);
    expect(res.body.report.scope.class_group).toBe('A');
    expect(res.body.preview.student_count).toBe(1);
    expect(res.body.data[0].student_code).toBe(f().codes[0]);
    expect(res.body.data[0].major.id).toBe(f().majors[0].toString());
    expect(res.body.data[0].placement.academic_year.id).toBe(
      f().years[0].toString(),
    );
  });

  it('scopes later-year completion without carrying earlier-period counts forward', async () => {
    const res = await exportRows({ academic_year_id: f().years[1].toString() });
    expect(res.status).toBe(200);
    expect(res.body.preview.student_count).toBe(2);
    const a = res.body.data.find((s: any) => s.student_code === f().codes[0]);
    const b = res.body.data.find((s: any) => s.student_code === f().codes[1]);
    expect(a.active).toEqual({ assigned: 0, completed: 0, left: 0 });
    expect(a.total).toEqual({ assigned: 1, completed: 1, not_completed: 0 });
    expect(b.total).toEqual({ assigned: 1, completed: 0, not_completed: 1 });
  });

  it('returns a complete empty dataset for an unmatched group', async () => {
    const res = await exportRows({
      academic_year_id: f().years[0].toString(),
      major_id: f().majors[0].toString(),
      class_group: 'NONE',
    });
    expect(res.status).toBe(200);
    expect(res.body.preview).toEqual({ student_count: 0, complete: true });
    expect(res.body.data).toEqual([]);
  });

  it('isolates another generation with shared evaluation participation', async () => {
    const res = await exportRows({
      generation_id: f().generations[1].toString(),
      academic_year_id: f().years[0].toString(),
    });
    expect(res.status).toBe(200);
    expect(res.body.preview.student_count).toBe(1);
    expect(res.body.data[0].student_code).toBe(f().codes[3]);
    expect(res.body.data[0].active).toEqual({
      assigned: 1,
      completed: 0,
      left: 1,
    });
  });

  it.each([
    ['semester without year', () => ({ semester_number: 1 }), 400],
    [
      'semester 0',
      () => ({ academic_year_id: f().years[0].toString(), semester_number: 0 }),
      400,
    ],
    [
      'semester 3',
      () => ({ academic_year_id: f().years[0].toString(), semester_number: 3 }),
      400,
    ],
    ['group without context', () => ({ class_group: 'A' }), 400],
    ['blank group', () => ({ class_group: ' ' }), 400],
    ['invalid year ID', () => ({ academic_year_id: 'abc' }), 400],
    ['missing generation', () => ({ generation_id: missingId }), 404],
    ['missing year', () => ({ academic_year_id: missingId }), 404],
    [
      'missing semester in later year',
      () => ({ academic_year_id: f().years[1].toString(), semester_number: 2 }),
      404,
    ],
  ] as Array<[string, () => Record<string, unknown>, number]>)(
    'rejects export %s without mutating participation or history',
    async (_label, query, status) => {
      const before = await ownedState();
      const res = await exportRows(query());
      expect(res.status).toBe(status);
      assertNoPrivateFields(res.body);
      expect(await ownedState()).toEqual(before);
    },
  );
});
