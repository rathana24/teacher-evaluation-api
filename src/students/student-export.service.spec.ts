import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { jest } from '@jest/globals';

import { StudentExportService } from './student-export.service';

type AsyncMock = jest.Mock<
  (...args: any[]) => Promise<any>
>;

describe('StudentExportService', () => {
  let service: StudentExportService;

  let prisma: {
    student_generations: {
      findUnique: AsyncMock;
    };
    academic_years: {
      findUnique: AsyncMock;
    };
    semesters: {
      findUnique: AsyncMock;
    };
    students: {
      findMany: AsyncMock;
    };
    evaluation_participants: {
      findMany: AsyncMock;
    };
  };

  beforeEach(() => {
    prisma = {
      student_generations: {
        findUnique: jest.fn<
          (...args: any[]) => Promise<any>
        >(),
      },

      academic_years: {
        findUnique: jest.fn<
          (...args: any[]) => Promise<any>
        >(),
      },

      semesters: {
        findUnique: jest.fn<
          (...args: any[]) => Promise<any>
        >(),
      },

      students: {
        findMany: jest.fn<
          (...args: any[]) => Promise<any>
        >(),
      },

      evaluation_participants: {
        findMany: jest.fn<
          (...args: any[]) => Promise<any>
        >(),
      },
    };

    service = new StudentExportService(
      prisma as any,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeStudent(
    overrides: Record<string, any> = {},
  ) {
    return {
      id: 1n,
      user_id: 73n,
      student_code: 'e20221111',
      generation_id: 1n,

      users: {
        full_name: 'Test Student',
        gender: 'MALE',
        status: 'ACTIVE',
      },

      student_generations: {
        id: 1n,
        name: 'Gen43',
      },

      student_academic_records: [
        {
          academic_year_id: 1n,
          major_id: 1n,
          year_level: 4,
          class_group: 'AMS1-A',

          academic_years: {
            id: 1n,
            name: '2025-2026',
            start_year: 2025,
          },

          majors: {
            id: 1n,
            code: 'AMS',
            name:
              'Applied Mathematics & Statistics',
          },
        },
      ],

      ...overrides,
    };
  }

  function makeParticipant(
    overrides: Record<string, any> = {},
  ) {
    return {
      student_id: 73n,
      evaluation_id: 10n,
      has_submitted: false,

      evaluations: {
        status: 'OPEN',
        start_at: new Date(
          '2026-10-04T00:00:00.000Z',
        ),
        end_at: new Date(
          '2026-10-05T00:00:00.000Z',
        ),
      },

      ...overrides,
    };
  }

  function mockAcademicYear(
    id = 1n,
  ) {
    prisma.academic_years.findUnique.mockResolvedValue(
      {
        id,
        name: '2025-2026',
        start_year: 2025,
      },
    );
  }

  it('exports all students without a period filter', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    expect(result.preview).toEqual({
      student_count: 1,
      complete: true,
    });

    expect(
      result.data[0].student_code,
    ).toBe('e20221111');

    expect(
      result.data[0].active,
    ).toEqual({
      completed: 0,
      assigned: 0,
      left: 0,
    });

    expect(
      result.data[0].total,
    ).toEqual({
      completed: 0,
      assigned: 0,
      not_completed: 0,
    });
  });

  it('includes students with no evaluations in an unscoped export', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    expect(result.data).toHaveLength(1);

    expect(
      result.data[0].total.assigned,
    ).toBe(0);
  });

  it('returns an empty complete export when no students match', async () => {
    prisma.students.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    expect(result.data).toEqual([]);

    expect(result.preview).toEqual({
      student_count: 0,
      complete: true,
    });

    expect(
      prisma.evaluation_participants.findMany,
    ).not.toHaveBeenCalled();
  });

  it('requires academic_year_id when semester_number is provided', async () => {
    await expect(
      service.getExportData({
        semester_number: 1,
      }),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.students.findMany,
    ).not.toHaveBeenCalled();
  });

  it('requires academic year, generation, and major context when class_group is provided', async () => {
    await expect(
      service.getExportData({
        class_group: 'A',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'academic_year_id, generation_id, and major_id are required when class_group is provided',
      ),
    );

    await expect(
      service.getExportData({
        academic_year_id: '1',
        generation_id: '1',
        class_group: 'A',
      }),
    ).rejects.toThrow(
      new BadRequestException(
        'academic_year_id, generation_id, and major_id are required when class_group is provided',
      ),
    );

    expect(
      prisma.students.findMany,
    ).not.toHaveBeenCalled();
  });

  it('rejects an unknown generation', async () => {
    prisma.student_generations.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.getExportData({
        generation_id: '999',
      }),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an unknown academic year', async () => {
    prisma.academic_years.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.getExportData({
        academic_year_id: '999',
      }),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an unknown semester', async () => {
    mockAcademicYear();

    prisma.semesters.findUnique.mockResolvedValue(
      null,
    );

    await expect(
      service.getExportData({
        academic_year_id: '1',
        semester_number: 1,
      }),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(
      prisma.semesters.findUnique,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          academic_year_id_semester_number:
            {
              academic_year_id: 1n,
              semester_number: 1,
            },
        },
      }),
    );
  });

  it('resolves semester using academic year and semester number', async () => {
    mockAcademicYear();

    prisma.semesters.findUnique.mockResolvedValue(
      {
        id: 5n,
        semester_name: 'Semester 1',
        semester_number: 1,
        academic_year_id: 1n,
      },
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({
        academic_year_id: '1',
        semester_number: 1,
      });

    expect(
      result.report.scope.semester_id,
    ).toBe('5');

    expect(
      result.report.scope.semester_number,
    ).toBe(1);

    expect(
      result.report.scope.semester_name,
    ).toBe('Semester 1');
  });

  it('applies generation filter to student population', async () => {
    prisma.student_generations.findUnique.mockResolvedValue(
      {
        id: 2n,
        name: 'Gen44',
      },
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    await service.getExportData({
      generation_id: '2',
    });

    expect(
      prisma.students.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          generation_id: 2n,
        }),
      }),
    );
  });

  it('filters export by normalized class group within the exact placement scope', async () => {
    prisma.student_generations.findUnique.mockResolvedValue(
      {
        id: 1n,
        name: 'Gen43',
      },
    );

    mockAcademicYear();

    prisma.students.findMany.mockResolvedValue([
      makeStudent({
        id: 1n,
        user_id: 73n,
        student_code: 'e20221111',

        student_academic_records: [
          {
            academic_year_id: 1n,
            major_id: 1n,
            year_level: 4,
            class_group: '  a  ',

            academic_years: {
              id: 1n,
              name: '2025-2026',
              start_year: 2025,
            },

            majors: {
              id: 1n,
              code: 'AMS',
              name:
                'Applied Mathematics & Statistics',
            },
          },
        ],
      }),

      makeStudent({
        id: 2n,
        user_id: 74n,
        student_code: 'e20221112',

        student_academic_records: [
          {
            academic_year_id: 1n,
            major_id: 1n,
            year_level: 4,
            class_group: 'B',

            academic_years: {
              id: 1n,
              name: '2025-2026',
              start_year: 2025,
            },

            majors: {
              id: 1n,
              code: 'AMS',
              name:
                'Applied Mathematics & Statistics',
            },
          },
        ],
      }),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({
        academic_year_id: '1',
        generation_id: '1',
        major_id: '1',
        class_group: '  a  ',
      });

    expect(result.data).toHaveLength(1);

    expect(
      result.data[0].student_code,
    ).toBe('e20221111');

    expect(
      result.data[0].placement,
    ).toEqual({
      academic_year: {
        id: '1',
        name: '2025-2026',
        start_year: 2025,
      },

      year_level: 4,
      major_id: '1',
      class_group: 'A',
      source: 'ACADEMIC_RECORD',
    });

    expect(
      result.report.scope,
    ).toEqual(
      expect.objectContaining({
        academic_year_id: '1',
        generation_id: '1',
        major_id: '1',
        class_group: 'A',
      }),
    );

    const studentQuery =
      prisma.students.findMany.mock.calls[0][0];

    expect(
      studentQuery.where.generation_id,
    ).toBe(1n);

    expect(
      studentQuery.where.student_academic_records,
    ).toEqual({
      some: {
        academic_year_id: 1n,
        major_id: 1n,
      },
    });
  });

  it('uses assigned published evaluations for academic-year population', async () => {
    mockAcademicYear();

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    await service.getExportData({
      academic_year_id: '1',
    });

    const call =
      prisma.students.findMany.mock.calls[0][0];

    expect(
      call.where.users.is
        .evaluation_participants.some
        .evaluations.is.status,
    ).toEqual({
      in: ['OPEN', 'CLOSED'],
    });

    expect(
      call.where.users.is
        .evaluation_participants.some
        .evaluations.is.course_offerings.is
        .semesters.is.academic_year_id,
    ).toBe(1n);
  });

  it('uses the resolved semester ID for semester population', async () => {
    mockAcademicYear();

    prisma.semesters.findUnique.mockResolvedValue(
      {
        id: 5n,
        semester_name: 'Semester 1',
        semester_number: 1,
        academic_year_id: 1n,
      },
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    await service.getExportData({
      academic_year_id: '1',
      semester_number: 1,
    });

    const call =
      prisma.students.findMany.mock.calls[0][0];

    expect(
      call.where.users.is
        .evaluation_participants.some
        .evaluations.is.course_offerings.is
        .semesters.is.id,
    ).toBe(5n);
  });

  it('counts active unsubmitted evaluation correctly', async () => {
    jest.useFakeTimers();

    jest.setSystemTime(
      new Date(
        '2026-10-04T12:00:00.000Z',
      ),
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          has_submitted: false,
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].active,
    ).toEqual({
      completed: 0,
      assigned: 1,
      left: 1,
    });

    expect(
      result.data[0].total,
    ).toEqual({
      completed: 0,
      assigned: 1,
      not_completed: 1,
    });
  });

  it('counts active submitted evaluation correctly', async () => {
    jest.useFakeTimers();

    jest.setSystemTime(
      new Date(
        '2026-10-04T12:00:00.000Z',
      ),
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          has_submitted: true,
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].active,
    ).toEqual({
      completed: 1,
      assigned: 1,
      left: 0,
    });

    expect(
      result.data[0].total,
    ).toEqual({
      completed: 1,
      assigned: 1,
      not_completed: 0,
    });
  });

  it('keeps upcoming OPEN evaluation in total but not active', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          evaluations: {
            status: 'OPEN',
            start_at: new Date(
              '2999-01-01T00:00:00.000Z',
            ),
            end_at: new Date(
              '2999-02-01T00:00:00.000Z',
            ),
          },
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].active.assigned,
    ).toBe(0);

    expect(
      result.data[0].total.assigned,
    ).toBe(1);

    expect(
      result.data[0].total.not_completed,
    ).toBe(1);
  });

  it('keeps expired OPEN evaluation in total but not active', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          evaluations: {
            status: 'OPEN',
            start_at: new Date(
              '2000-01-01T00:00:00.000Z',
            ),
            end_at: new Date(
              '2000-02-01T00:00:00.000Z',
            ),
          },
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].active.assigned,
    ).toBe(0);

    expect(
      result.data[0].total.assigned,
    ).toBe(1);
  });

  it('counts CLOSED evaluation in total but not active', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          has_submitted: true,

          evaluations: {
            status: 'CLOSED',
            start_at: null,
            end_at: null,
          },
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].active,
    ).toEqual({
      completed: 0,
      assigned: 0,
      left: 0,
    });

    expect(
      result.data[0].total,
    ).toEqual({
      completed: 1,
      assigned: 1,
      not_completed: 0,
    });
  });

  it('does not treat OPEN evaluation without schedule boundaries as active', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          evaluations: {
            status: 'OPEN',
            start_at: null,
            end_at: null,
          },
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].active.assigned,
    ).toBe(0);

    expect(
      result.data[0].total.assigned,
    ).toBe(1);
  });

  it('deduplicates the same student and evaluation pair', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    const participant =
      makeParticipant({
        has_submitted: true,

        evaluations: {
          status: 'CLOSED',
          start_at: null,
          end_at: null,
        },
      });

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        participant,
        participant,
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].total,
    ).toEqual({
      completed: 1,
      assigned: 1,
      not_completed: 0,
    });
  });

  it('calculates multiple students in one participant query', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),

      makeStudent({
        id: 2n,
        user_id: 76n,
        student_code: 'e20221112',

        users: {
          full_name: 'Second Student',
          gender: 'FEMALE',
          status: 'INACTIVE',
        },
      }),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [
        makeParticipant({
          student_id: 73n,
          evaluation_id: 10n,
          has_submitted: true,

          evaluations: {
            status: 'CLOSED',
            start_at: null,
            end_at: null,
          },
        }),

        makeParticipant({
          student_id: 76n,
          evaluation_id: 11n,
          has_submitted: false,

          evaluations: {
            status: 'CLOSED',
            start_at: null,
            end_at: null,
          },
        }),
      ],
    );

    const result =
      await service.getExportData({});

    expect(
      prisma.evaluation_participants.findMany,
    ).toHaveBeenCalledTimes(1);

    expect(
      result.data,
    ).toHaveLength(2);

    expect(
      result.data[0].total.completed,
    ).toBe(1);

    expect(
      result.data[1].total.completed,
    ).toBe(0);

    expect(
      result.data[1].account_status,
    ).toBe('INACTIVE');
  });

  it('uses academic-year-specific major for period export', async () => {
    prisma.academic_years.findUnique.mockResolvedValue(
      {
        id: 2n,
        name: '2026-2027',
        start_year: 2026,
      },
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent({
        student_academic_records: [
          {
            academic_year_id: 2n,
            major_id: 2n,
            year_level: 5,
            class_group: 'DS-A',

            academic_years: {
              id: 2n,
              name: '2026-2027',
              start_year: 2026,
            },

            majors: {
              id: 2n,
              code: 'DS',
              name: 'Data Science',
            },
          },

          {
            academic_year_id: 1n,
            major_id: 1n,
            year_level: 4,
            class_group: 'AMS1-A',

            academic_years: {
              id: 1n,
              name: '2025-2026',
              start_year: 2025,
            },

            majors: {
              id: 1n,
              code: 'AMS',
              name:
                'Applied Mathematics & Statistics',
            },
          },
        ],
      }),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({
        academic_year_id: '2',
      });

    expect(
      result.data[0].major,
    ).toEqual({
      id: '2',
      code: 'DS',
      name: 'Data Science',
    });
  });

  it('uses latest explicit major for all-time export', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent({
        student_academic_records: [
          {
            academic_year_id: 2n,
            major_id: 2n,
            year_level: 5,
            class_group: 'DS-A',

            academic_years: {
              id: 2n,
              name: '2026-2027',
              start_year: 2026,
            },

            majors: {
              id: 2n,
              code: 'DS',
              name: 'Data Science',
            },
          },

          {
            academic_year_id: 1n,
            major_id: 1n,
            year_level: 4,
            class_group: 'AMS1-A',

            academic_years: {
              id: 1n,
              name: '2025-2026',
              start_year: 2025,
            },

            majors: {
              id: 1n,
              code: 'AMS',
              name:
                'Applied Mathematics & Statistics',
            },
          },
        ],
      }),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].major,
    ).toEqual({
      id: '2',
      code: 'DS',
      name: 'Data Science',
    });
  });

  it('labels the placement academic year for class group in an all-time export', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent({
        student_academic_records: [
          {
            academic_year_id: 2n,
            major_id: 2n,
            year_level: 5,
            class_group: ' ds-a ',

            academic_years: {
              id: 2n,
              name: '2026-2027',
              start_year: 2026,
            },

            majors: {
              id: 2n,
              code: 'DS',
              name: 'Data Science',
            },
          },

          {
            academic_year_id: 1n,
            major_id: 1n,
            year_level: 4,
            class_group: 'AMS1-A',

            academic_years: {
              id: 1n,
              name: '2025-2026',
              start_year: 2025,
            },

            majors: {
              id: 1n,
              code: 'AMS',
              name:
                'Applied Mathematics & Statistics',
            },
          },
        ],
      }),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].placement,
    ).toEqual({
      academic_year: {
        id: '2',
        name: '2026-2027',
        start_year: 2026,
      },

      year_level: 5,
      major_id: '2',
      class_group: 'DS-A',
      source: 'ACADEMIC_RECORD',
    });
  });

  it('returns null major when no academic record exists', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent({
        student_academic_records: [],
      }),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    expect(
      result.data[0].major,
    ).toBeNull();
  });

  it('does not expose internal IDs, responses, answers, or credentials', async () => {
    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({});

    const row =
      result.data[0] as Record<
        string,
        unknown
      >;

    expect(row).not.toHaveProperty(
      'user_id',
    );

    expect(row).not.toHaveProperty(
      'response_id',
    );

    expect(row).not.toHaveProperty(
      'responses',
    );

    expect(row).not.toHaveProperty(
      'answers',
    );

    expect(row).not.toHaveProperty(
      'password',
    );

    expect(row).not.toHaveProperty(
      'password_hash',
    );
  });

  it('returns scope, generated time, preview, and privacy warning', async () => {
    prisma.student_generations.findUnique.mockResolvedValue(
      {
        id: 1n,
        name: 'Gen43',
      },
    );

    prisma.students.findMany.mockResolvedValue([
      makeStudent(),
    ]);

    prisma.evaluation_participants.findMany.mockResolvedValue(
      [],
    );

    const result =
      await service.getExportData({
        generation_id: '1',
      });

    expect(
      result.report.scope.generation_id,
    ).toBe('1');

    expect(
      result.report.scope.generation_name,
    ).toBe('Gen43');

    expect(
      result.report.generated_at,
    ).toMatch(/Z$/);

    expect(
      result.report.identifiable_participation_data,
    ).toBe(true);

    expect(
      result.report.privacy_notice,
    ).toContain('authorized staff');

    expect(
      result.preview.student_count,
    ).toBe(1);

    expect(
      result.preview.complete,
    ).toBe(true);
  });
});