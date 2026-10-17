import { selectedTestDatabase } from './utils/test-database';
import { Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import {
  CohortExpansionFixture,
  applicationNames,
  quote,
} from './helpers/cohort-expansion-fixture';

describe('Candidate major-scoped cohort expansion (owned schema only)', () => {
  const owned = new CohortExpansionFixture();
  const sql = fs
    .readFileSync(
      'scripts/migrations/major-scoped-generations-expand.sql',
      'utf8',
    )
    .replaceAll(
      "current_database() <> 'teacher_evaluation_test'",
      `current_database() <> '${selectedTestDatabase()}'`,
    );
  const now = new Date('2060-01-01T00:00:00Z');
  let db: typeof owned.db;
  let originalRows: unknown;
  let baseline: unknown;
  let atomicExpansionRollback = false;
  let f: Awaited<ReturnType<typeof seed>>;
  const hash = (value: unknown) =>
    createHash('sha256')
      .update(
        JSON.stringify(value, (_key, item) =>
          typeof item === 'bigint' ? item.toString() : item,
        ),
      )
      .digest('hex');

  async function rows(stripNew = false) {
    const result = [];
    for (const name of [...applicationNames, '_prisma_migrations']) {
      const remove =
        stripNew && name === 'student_generations'
          ? [
              'major_id',
              'generation_number',
              'ownership_state',
              'mapping_operation_id',
            ]
          : stripNew && name === 'student_academic_records'
            ? ['generation_id']
            : [];
      const values = await db.$queryRaw(
        Prisma.sql`SELECT (to_jsonb(t) - ${remove}::text[]) AS value FROM ${Prisma.raw(`${quote(owned.schema)}.${quote(name)}`)} t ORDER BY 1`,
      );
      result.push({ table: name, values });
    }
    return result;
  }
  async function completeRows() {
    return {
      rows: await rows(),
      operations:
        await db.$queryRaw`SELECT * FROM cohort_mapping_operations ORDER BY id`,
      events:
        await db.$queryRaw`SELECT * FROM student_cohort_assignment_events ORDER BY id`,
    };
  }
  async function rollback(
    work: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ) {
    const sentinel = new Error('Owned fixture rollback');
    try {
      await db.$transaction(async (tx) => {
        await work(tx);
        await tx.$executeRaw`SET CONSTRAINTS ALL IMMEDIATE`;
        throw sentinel;
      });
    } catch (error) {
      if (error !== sentinel) throw error;
    }
  }
  async function canonical(
    tx: Prisma.TransactionClient,
    major = f.majors[0],
    number = 1,
    year = f.years[0],
    name = `Gen ${number}`,
  ) {
    const [row] = await tx.$queryRaw<Array<{ id: bigint }>>`
      INSERT INTO student_generations(name, entry_academic_year_id, starting_year_level, created_at, updated_at, ownership_state, major_id, generation_number)
      VALUES (${name}, ${year}, 1, NOW(), NOW(), 'MAJOR_SCOPED', ${major}, ${number}) RETURNING id`;
    return row.id;
  }
  async function placement(
    tx: Prisma.TransactionClient,
    generation: bigint,
    major = f.majors[0],
    year = f.years[0],
    action = 'NORMAL',
  ) {
    const [row] = await tx.$queryRaw<Array<{ id: bigint }>>`
      INSERT INTO student_academic_records(student_id, academic_year_id, year_level, major_id, class_group, progression_action, generation_id, created_at, updated_at)
      VALUES (${f.profiles[1]}, ${year}, 1, ${major}, 'NEW-A', ${action}::student_progression_action, ${generation}, NOW(), NOW()) RETURNING id`;
    return row.id;
  }
  async function event(
    tx: Prisma.TransactionClient,
    record: bigint,
    generation: bigint,
    major = f.majors[0],
    year = f.years[0],
    action = 'INITIAL',
    previous: bigint | null = null,
    operation: string | null = null,
    student = f.profiles[1],
  ) {
    await tx.$executeRaw`
      INSERT INTO student_cohort_assignment_events(academic_record_id,student_id,academic_year_id,major_id,generation_id,previous_generation_id,action,mapping_operation_id)
      VALUES (${record},${student},${year},${major},${generation},${previous},${action},${operation}::uuid)`;
  }
  async function operation(
    tx: Prisma.TransactionClient,
    manifest: object = { scenario: 'synthetic-review-only' },
  ) {
    const id = randomUUID();
    await tx.$executeRaw`
      INSERT INTO cohort_mapping_operations(id, manifest_sha256, source_fingerprint, reviewer_label, reviewed_at, manifest)
      VALUES (${id}::uuid, ${hash(manifest)}, ${hash(originalRows)}, 'Synthetic fixture reviewer', ${now}, ${JSON.stringify(manifest)}::jsonb)`;
    return id;
  }

  async function seed() {
    const department = await db.departments.create({
      data: { code: 'COH', name: 'Cohort Synthetic Department' },
    });
    const majors = [];
    for (const code of ['DS', 'FE'])
      majors.push(
        (
          await db.majors.create({
            data: {
              code,
              name: `${code} Synthetic`,
              department_id: department.id,
            },
          })
        ).id,
      );
    const years = [];
    for (let index = 0; index < 6; index++)
      years.push(
        (
          await db.academic_years.create({
            data: {
              name: `${2060 + index}-${2061 + index}`,
              start_year: 2060 + index,
            },
          })
        ).id,
      );
    const generations = [];
    for (const [index, name] of ['1', 'Gen 1', 'Legacy shared'].entries())
      generations.push(
        (
          await db.student_generations.create({
            data: {
              name,
              entry_academic_year_id: years[index === 1 ? 2 : 0],
              starting_year_level: 1,
            },
          })
        ).id,
      );
    const users = [];
    for (const [index, role] of [
      'ADMIN',
      'LECTURER',
      'STUDENT',
      'STUDENT',
    ].entries())
      users.push(
        (
          await db.users.create({
            data: {
              full_name: `Synthetic ${role} ${index}`,
              password_hash: 'Not-a-login-account',
              role: role as 'ADMIN' | 'LECTURER' | 'STUDENT',
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    await db.user_departments.create({
      data: {
        user_id: users[0],
        department_id: department.id,
        is_primary: true,
      },
    });
    const profiles = [];
    for (const index of [2, 3])
      profiles.push(
        (
          await db.students.create({
            data: {
              user_id: users[index],
              student_code: `SYN${index}`,
              generation_id: generations[2],
              notes: 'Synthetic migration history',
              created_at: now,
              updated_at: now,
            },
          })
        ).id,
      );
    const records = [];
    for (const [index, action] of [
      'NORMAL',
      'REPEAT',
      'TRANSFER',
      'PAUSE',
      'NORMAL',
      'RESUME',
    ].entries())
      records.push(
        (
          await db.student_academic_records.create({
            data: {
              student_id: profiles[0],
              academic_year_id: years[index],
              year_level: index < 2 ? 1 : 2,
              major_id: majors[index < 2 ? 0 : 1],
              class_group: index === 3 ? null : `GROUP-${index}`,
              progression_action: action as
                'NORMAL' | 'REPEAT' | 'TRANSFER' | 'PAUSE' | 'RESUME',
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
        course_code: 'COH001',
        course_name: 'Synthetic Course',
        department_id: department.id,
        created_at: now,
        updated_at: now,
      },
    });
    const rule = await db.course_year_rules.create({
      data: { course_id: course.id, major_id: majors[0], year_level: 1 },
    });
    const revision = await db.curriculum_revisions.create({
      data: {
        rule_id: rule.id,
        revision_no: 1,
        effective_academic_year_id: years[0],
        effective_start_year: 2060,
        enabled: true,
      },
    });
    const offering = await db.course_offerings.create({
      data: {
        course_id: course.id,
        lecturer_id: users[1],
        semester_id: semester.id,
        year_level: 1,
        class_type: 'COURSE',
        section_code: 'HISTORICAL-CLASS',
        created_at: now,
        updated_at: now,
      },
    });
    const scope = await db.course_offering_group_scopes.create({
      data: {
        course_offering_id: offering.id,
        academic_year_id: years[0],
        generation_id: generations[2],
        major_id: majors[0],
        year_level: 1,
        class_group: 'GROUP-0',
        curriculum_revision_id: revision.id,
      },
    });
    for (const user of users.slice(2))
      await db.enrollments.create({
        data: {
          student_id: user,
          course_offering_id: offering.id,
          enrolled_at: now,
        },
      });
    const survey = await db.surveys.create({
      data: {
        title: 'Synthetic retained questionnaire',
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
    const question = await db.questions.create({
      data: {
        survey_version_id: version.id,
        question_text: 'Synthetic retained question',
        question_type: 'CHECKBOX',
        display_order: 1,
        created_at: now,
        updated_at: now,
      },
    });
    const option = await db.question_options.create({
      data: {
        question_id: question.id,
        option_text: 'Synthetic choice',
        display_order: 1,
      },
    });
    const evaluation = await db.evaluations.create({
      data: {
        course_offering_id: offering.id,
        survey_version_id: version.id,
        participant_scope: 'SELECTED_GENERATIONS',
        status: 'CLOSED',
        created_by: users[0],
        created_at: now,
        updated_at: now,
      },
    });
    const labels = {
      schema_version: 1,
      generation: { id: String(generations[2]), name: 'Legacy shared' },
    };
    await db.evaluation_generation_targets.create({
      data: {
        evaluation_id: evaluation.id,
        generation_id: generations[2],
        historical_labels: labels,
        labels_captured_at: now,
      },
    });
    await db.evaluation_group_targets.create({
      data: {
        evaluation_id: evaluation.id,
        academic_year_id: years[0],
        generation_id: generations[2],
        major_id: majors[0],
        year_level: 1,
        class_group: 'GROUP-0',
        historical_labels: {
          ...labels,
          major: { id: String(majors[0]), code: 'DS', name: 'DS Synthetic' },
        },
        labels_captured_at: now,
      },
    });
    for (const [index, user] of users.slice(2).entries()) {
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
            answers_json: { retained: 'synthetic protected draft' },
            created_at: now,
            updated_at: now,
          },
        });
    }
    const response = await db.responses.create({
      data: {
        evaluation_id: evaluation.id,
        survey_version_id: version.id,
        submitted_at: now,
        created_at: now,
      },
    });
    const answer = await db.answers.create({
      data: {
        response_id: response.id,
        question_id: question.id,
        created_at: now,
      },
    });
    await db.answer_options.create({
      data: { answer_id: answer.id, option_id: option.id },
    });
    await db.reviewed_operations.create({
      data: {
        operation_kind: 'CREATE_EVALUATION',
        actor_id: users[0],
        resource_key: String(offering.id),
        request_json: { retained: true },
        request_fingerprint: 'a'.repeat(64),
        snapshot_fingerprint: 'b'.repeat(64),
        expires_at: now,
        completed_at: now,
        result_json: { evaluation_id: String(evaluation.id) },
      },
    });
    return {
      majors,
      years,
      generations,
      users,
      profiles,
      records,
      offering: offering.id,
      scope: scope.id,
      evaluation: evaluation.id,
    };
  }

  beforeAll(async () => {
    await owned.open();
    db = owned.db;
    f = await seed();
    originalRows = await rows();
    const failing = sql.replace(
      'END $expansion$;',
      "RAISE EXCEPTION 'Synthetic expansion failure';\nEND $expansion$;",
    );
    await expect(db.$executeRawUnsafe(failing)).rejects.toThrow();
    expect(await rows()).toEqual(originalRows);
    const [columns] = await db.$queryRaw<
      Array<{ count: bigint }>
    >`SELECT count(*) FROM information_schema.columns WHERE table_schema=${owned.schema} AND column_name='ownership_state'`;
    expect(columns.count).toBe(0n);
    atomicExpansionRollback = true;
    await db.$executeRawUnsafe(sql);
    expect(await rows(true)).toEqual(originalRows);
    baseline = await completeRows();
  }, 90000);
  afterEach(async () => {
    if (baseline) expect(await completeRows()).toEqual(baseline);
    await owned.assertPublicUnchanged();
  });
  afterAll(async () => {
    await owned.close();
  }, 30000);

  it('rolls back the entire candidate DDL after an injected final failure', () => {
    expect(atomicExpansionRollback).toBe(true);
  });
  it('preserves every original application and ledger value while adding explicit unresolved state', async () => {
    expect(await rows(true)).toEqual(originalRows);
    const legacy = await db.$queryRaw<
      Array<{
        ownership_state: string;
        major_id: bigint | null;
        generation_number: number | null;
      }>
    >`SELECT ownership_state,major_id,generation_number FROM student_generations`;
    expect(legacy).toHaveLength(3);
    expect(
      legacy.every(
        (row) =>
          row.ownership_state === 'LEGACY_READ_ONLY' &&
          row.major_id === null &&
          row.generation_number === null,
      ),
    ).toBe(true);
  });
  it('refuses execution in public before any DDL', async () => {
    await expect(owned.root.$executeRawUnsafe(sql)).rejects.toThrow(
      'owned isolated cohort fixture',
    );
  });
  it('refuses duplicate expansion atomically without changing existing fixture rows', async () => {
    await expect(db.$executeRawUnsafe(sql)).rejects.toThrow();
  });
  it('allows DS Gen 1 and FE Gen 1 with separate IDs and entry years, and duplicate display labels', async () =>
    rollback(async (tx) => {
      const ds = await canonical(tx);
      const fe = await canonical(tx, f.majors[1], 1, f.years[2]);
      expect(ds).not.toBe(fe);
      const result = await tx.$queryRaw<
        Array<{
          generation_number: number;
          major_id: bigint;
          entry_academic_year_id: bigint;
        }>
      >`SELECT generation_number,major_id,entry_academic_year_id FROM student_generations WHERE id IN (${ds},${fe}) ORDER BY major_id`;
      expect(result.map((row) => row.generation_number)).toEqual([1, 1]);
      expect(result.map((row) => row.entry_academic_year_id)).toEqual([
        f.years[0],
        f.years[2],
      ]);
    }));
  it('rejects same-major number duplicates without merging cohorts', async () => {
    await expect(
      rollback(async (tx) => {
        await canonical(tx);
        await canonical(tx);
      }),
    ).rejects.toThrow();
  });
  for (const number of [0, -1, 2147483648])
    it(`rejects invalid stored cohort number ${number}`, async () => {
      await expect(
        rollback((tx) => canonical(tx, f.majors[0], number)),
      ).rejects.toThrow();
    });
  it('accepts the maximum positive INTEGER cohort number', async () =>
    rollback(async (tx) => {
      await canonical(tx, f.majors[0], 2147483647);
    }));
  it('rejects a nonexistent owner major', async () => {
    await expect(
      rollback((tx) => canonical(tx, 9223372036854775807n)),
    ).rejects.toThrow();
  });
  it('blocks new unowned legacy cohorts and direct legacy renames/deletion', async () => {
    await expect(
      rollback((tx) =>
        tx.student_generations.create({
          data: { name: 'New unowned', entry_academic_year_id: f.years[0] },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      rollback((tx) =>
        tx.student_generations.update({
          where: { id: f.generations[2] },
          data: { name: 'Rewritten legacy' },
        }),
      ),
    ).rejects.toThrow();
    await expect(
      rollback((tx) =>
        tx.student_generations.delete({ where: { id: f.generations[0] } }),
      ),
    ).rejects.toThrow();
  });
  it('blocks ownership, number and entry-year relabeling of canonical identity', async () => {
    for (const column of [
      'major_id',
      'generation_number',
      'entry_academic_year_id',
    ])
      await expect(
        rollback(async (tx) => {
          const id = await canonical(tx);
          const replacement =
            column === 'major_id'
              ? f.majors[1]
              : column === 'entry_academic_year_id'
                ? f.years[2]
                : 2n;
          await tx.$executeRaw(
            Prisma.sql`UPDATE student_generations SET ${Prisma.raw(column)}=${replacement} WHERE id=${id}`,
          );
        }),
      ).rejects.toThrow();
  });
  it('preserves an explicitly mapped legacy cohort ID and its original entry metadata', async () =>
    rollback(async (tx) => {
      const op = await operation(tx);
      await tx.$executeRaw`UPDATE student_generations SET ownership_state='MAJOR_SCOPED', major_id=${f.majors[0]}, generation_number=1, mapping_operation_id=${op}::uuid WHERE id=${f.generations[0]}`;
      const [row] = await tx.$queryRaw<
        Array<{ id: bigint; name: string; entry_academic_year_id: bigint }>
      >`SELECT id,name,entry_academic_year_id FROM student_generations WHERE id=${f.generations[0]}`;
      expect(row).toEqual({
        id: f.generations[0],
        name: '1',
        entry_academic_year_id: f.years[0],
      });
    }));
  it('requires mapping provenance for legacy canonicalization', async () => {
    await expect(
      rollback(
        (tx) =>
          tx.$executeRaw`UPDATE student_generations SET ownership_state='MAJOR_SCOPED',major_id=${f.majors[0]},generation_number=1 WHERE id=${f.generations[0]}`,
      ),
    ).rejects.toThrow();
  });
  it('rejects a new placement without explicit cohort', async () => {
    await expect(
      rollback((tx) =>
        tx.student_academic_records.create({
          data: {
            student_id: f.profiles[1],
            academic_year_id: f.years[0],
            major_id: f.majors[0],
            year_level: 1,
          },
        }),
      ),
    ).rejects.toThrow();
  });
  it('rejects a placement whose major differs from its canonical cohort owner', async () => {
    await expect(
      rollback(async (tx) => {
        const id = await canonical(tx);
        await placement(tx, id, f.majors[1]);
      }),
    ).rejects.toThrow();
  });
  it('rejects an unresolved legacy cohort for a new placement', async () => {
    await expect(
      rollback((tx) => placement(tx, f.generations[2])),
    ).rejects.toThrow();
  });
  it('refuses a resolved placement at transaction validation without a matching immutable event', async () => {
    await expect(
      rollback(async (tx) => {
        const id = await canonical(tx);
        await placement(tx, id);
      }),
    ).rejects.toThrow('matching immutable evidence');
  });
  it('allows placement and matching initial event together', async () =>
    rollback(async (tx) => {
      const id = await canonical(tx);
      const record = await placement(tx, id);
      await event(tx, record, id);
    }));
  it('rejects evidence that names another student', async () => {
    await expect(
      rollback(async (tx) => {
        const id = await canonical(tx);
        const record = await placement(tx, id);
        await event(
          tx,
          record,
          id,
          f.majors[0],
          f.years[0],
          'INITIAL',
          null,
          null,
          f.profiles[0],
        );
      }),
    ).rejects.toThrow();
  });
  it('prevents a known yearly cohort from being relabeled by later profile changes', async () => {
    await expect(
      rollback(async (tx) => {
        const ds = await canonical(tx);
        const fe = await canonical(tx, f.majors[1], 1, f.years[2]);
        const record = await placement(tx, ds);
        await event(tx, record, ds);
        await tx.students.update({
          where: { id: f.profiles[1] },
          data: { generation_id: fe },
        });
        await tx.$executeRaw`UPDATE student_academic_records SET generation_id=${fe},major_id=${f.majors[1]} WHERE id=${record}`;
      }),
    ).rejects.toThrow('cannot be relabeled');
  });
  it('records an explicit later transfer while preserving the earlier cohort', async () =>
    rollback(async (tx) => {
      const ds = await canonical(tx);
      const fe = await canonical(tx, f.majors[1], 1, f.years[2]);
      const prior = await placement(tx, ds);
      await event(tx, prior, ds);
      const next = await placement(tx, fe, f.majors[1], f.years[2], 'TRANSFER');
      await event(tx, next, fe, f.majors[1], f.years[2], 'TRANSFER', ds);
      const stored = await tx.$queryRaw<
        Array<{ generation_id: bigint }>
      >`SELECT generation_id FROM student_academic_records WHERE id IN (${prior},${next}) ORDER BY academic_year_id`;
      expect(stored.map((row) => row.generation_id)).toEqual([ds, fe]);
    }));
  it('rejects a transfer without a previous cohort of that student in an earlier year', async () => {
    await expect(
      rollback(async (tx) => {
        const ds = await canonical(tx);
        const fe = await canonical(tx, f.majors[1], 1, f.years[2]);
        const next = await placement(
          tx,
          fe,
          f.majors[1],
          f.years[2],
          'TRANSFER',
        );
        await event(tx, next, fe, f.majors[1], f.years[2], 'TRANSFER', ds);
      }),
    ).rejects.toThrow();
  });
  it('does not permit an INITIAL event to stand in for a transfer', async () => {
    await expect(
      rollback(async (tx) => {
        const fe = await canonical(tx, f.majors[1], 1, f.years[2]);
        const next = await placement(
          tx,
          fe,
          f.majors[1],
          f.years[2],
          'TRANSFER',
        );
        await event(tx, next, fe, f.majors[1], f.years[2]);
      }),
    ).rejects.toThrow();
  });
  it('rejects new offering scopes using a different major or an unresolved cohort', async () => {
    for (const legacy of [false, true])
      await expect(
        rollback(async (tx) => {
          const id = legacy ? f.generations[2] : await canonical(tx);
          await tx.course_offering_group_scopes.create({
            data: {
              course_offering_id: f.offering,
              academic_year_id: f.years[0],
              generation_id: id,
              major_id: f.majors[1],
              year_level: 1,
              class_group: 'INVALID',
            },
          });
        }),
      ).rejects.toThrow();
  });
  it('accepts a new scope with an explicit matching cohort owner', async () =>
    rollback(async (tx) => {
      const id = await canonical(tx);
      await tx.course_offering_group_scopes.create({
        data: {
          course_offering_id: f.offering,
          academic_year_id: f.years[0],
          generation_id: id,
          major_id: f.majors[0],
          year_level: 1,
          class_group: 'VALID',
        },
      });
    }));
  it('keeps frozen target references and label JSON immutable during a split', async () => {
    await expect(
      rollback(
        (tx) =>
          tx.$executeRaw`UPDATE evaluation_generation_targets SET generation_id=${f.generations[0]} WHERE evaluation_id=${f.evaluation}`,
      ),
    ).rejects.toThrow('Historical target labels');
    await expect(
      rollback(
        (tx) =>
          tx.$executeRaw`UPDATE evaluation_group_targets SET historical_labels='{"schema_version":1}'::jsonb WHERE evaluation_id=${f.evaluation}`,
      ),
    ).rejects.toThrow('Historical target labels');
  });
  it('makes mapping-operation and assignment evidence immutable', async () => {
    await expect(
      rollback(async (tx) => {
        const id = await operation(tx);
        await tx.$executeRaw`DELETE FROM cohort_mapping_operations WHERE id=${id}::uuid`;
      }),
    ).rejects.toThrow('immutable');
    await expect(
      rollback(async (tx) => {
        const id = await canonical(tx);
        const record = await placement(tx, id);
        await event(tx, record, id);
        await tx.$executeRaw`UPDATE student_cohort_assignment_events SET action='MIGRATION' WHERE academic_record_id=${record}`;
      }),
    ).rejects.toThrow('immutable');
  });
  it('rolls back a partial mapping, operation and allocated cohorts on an ownership conflict', async () => {
    await expect(
      rollback(async (tx) => {
        const op = await operation(tx);
        const ds = await canonical(tx);
        await tx.$executeRaw`UPDATE student_academic_records SET generation_id=${ds} WHERE id=${f.records[0]}`;
        await event(
          tx,
          f.records[0],
          ds,
          f.majors[0],
          f.years[0],
          'MIGRATION',
          null,
          op,
          f.profiles[0],
        );
        // This later FE placement cannot point to a DS-owned cohort.
        await tx.$executeRaw`UPDATE student_academic_records SET generation_id=${ds} WHERE id=${f.records[2]}`;
      }),
    ).rejects.toThrow();
  });
  it('rejects a same-major alias mapping with conflicting entry metadata without merging', async () => {
    await expect(
      rollback(async (tx) => {
        await canonical(tx);
        await canonical(tx, f.majors[0], 1, f.years[2], '01');
      }),
    ).rejects.toThrow();
  });
  it('preserves BigInt cohort IDs beyond JS safe integer precision', async () =>
    rollback(async (tx) => {
      const id = 9007199254740993n;
      await tx.$executeRaw`INSERT INTO student_generations(id,name,entry_academic_year_id,starting_year_level,created_at,updated_at,ownership_state,major_id,generation_number)
      VALUES (${id},'Large identity',${f.years[0]},1,NOW(),NOW(),'MAJOR_SCOPED',${f.majors[0]},3)`;
      const [row] = await tx.$queryRaw<
        Array<{ id: bigint; generation_number: number }>
      >`SELECT id,generation_number FROM student_generations WHERE id=${id}`;
      expect(row).toEqual({ id, generation_number: 3 });
    }));
  it('adds only the two audit/history tables and five existing-table columns', async () => {
    const [counts] = await db.$queryRaw<
      Array<{ tables: bigint; columns: bigint }>
    >`
      SELECT count(DISTINCT table_name) AS tables,count(*) AS columns FROM information_schema.columns
      WHERE table_schema=${owned.schema} AND table_name <> '_prisma_migrations'`;
    expect(counts).toEqual({ tables: 30n, columns: 221n });
  });
  it('commits an explicit synthetic split mapping while preserving history, frozen references and anonymous responses', async () => {
    const manifest = {
      schema_version: 1,
      fixture_only: true,
      legacy_generation_id: String(f.generations[2]),
      disposition: 'SPLIT_KEEP_LEGACY_REFERENCE',
      yearly_records: f.records.map((id, index) => ({
        record_id: String(id),
        major_id: String(f.majors[index < 2 ? 0 : 1]),
        destination_number: 1,
      })),
      frozen_targets: 'KEEP_ORIGINAL_REFERENCE',
    };
    const mapped = await db.$transaction(async (tx) => {
      const op = await operation(tx, manifest);
      const ds = await canonical(tx);
      const fe = await canonical(tx, f.majors[1], 1, f.years[2]);
      for (const [index, record] of f.records.entries()) {
        const major = f.majors[index < 2 ? 0 : 1];
        const cohort = index < 2 ? ds : fe;
        await tx.$executeRaw`UPDATE student_academic_records SET generation_id=${cohort} WHERE id=${record}`;
        await event(
          tx,
          record,
          cohort,
          major,
          f.years[index],
          'MIGRATION',
          null,
          op,
          f.profiles[0],
        );
      }
      await tx.$executeRaw`UPDATE students SET generation_id=${fe} WHERE id=${f.profiles[0]}`;
      await tx.course_offering_group_scopes.update({
        where: { id: f.scope },
        data: { generation_id: ds },
      });
      return { ds, fe };
    });
    // Only the explicitly mapped pointer/scope may differ in their original columns.
    const after = (await rows(true)) as Array<{
      table: string;
      values: Array<{ value: Record<string, unknown> }>;
    }>;
    const original = originalRows as typeof after;
    for (const table of after) {
      const expected = structuredClone(
        original.find((row) => row.table === table.table)!.values,
      );
      for (const row of expected) {
        if (
          table.table === 'students' &&
          row.value.id === Number(f.profiles[0])
        )
          row.value.generation_id = Number(mapped.fe);
        if (
          table.table === 'course_offering_group_scopes' &&
          row.value.id === Number(f.scope)
        )
          row.value.generation_id = Number(mapped.ds);
      }
      const originalIds = new Set(expected.map((row) => row.value.id));
      const retained =
        table.table === 'student_generations'
          ? table.values.filter((row) => originalIds.has(row.value.id))
          : table.values;
      expect(retained).toEqual(expected);
    }
    const history = await db.$queryRaw<
      Array<{ generation_id: bigint; progression_action: string }>
    >`SELECT generation_id,progression_action FROM student_academic_records WHERE student_id=${f.profiles[0]} ORDER BY academic_year_id`;
    expect(history.map((row) => row.generation_id)).toEqual([
      mapped.ds,
      mapped.ds,
      mapped.fe,
      mapped.fe,
      mapped.fe,
      mapped.fe,
    ]);
    expect(history.map((row) => row.progression_action)).toEqual([
      'NORMAL',
      'REPEAT',
      'TRANSFER',
      'PAUSE',
      'NORMAL',
      'RESUME',
    ]);
    const [legacy] = await db.$queryRaw<
      Array<{ ownership_state: string }>
    >`SELECT ownership_state FROM student_generations WHERE id=${f.generations[2]}`;
    expect(legacy.ownership_state).toBe('LEGACY_READ_ONLY');
    expect(
      await db.$queryRaw`SELECT id FROM student_cohort_assignment_events`,
    ).toHaveLength(6);
    baseline = await completeRows();
  });
  it('serializes concurrent same-major creation with exactly one persisted cohort', async () => {
    const attempts = await Promise.allSettled([
      db.$transaction((tx) => canonical(tx, f.majors[0], 99)),
      db.$transaction((tx) => canonical(tx, f.majors[0], 99)),
    ]);
    expect(
      attempts.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      attempts.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    const rows = await db.$queryRaw<
      Array<{ id: bigint }>
    >`SELECT id FROM student_generations WHERE major_id=${f.majors[0]} AND generation_number=99`;
    expect(rows).toHaveLength(1);
    baseline = await completeRows();
  });
});
