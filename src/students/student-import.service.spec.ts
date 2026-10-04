import {
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { ImportStudentsDto } from './dto/import-students.dto';
import { StudentImportService } from './student-import.service';

describe('StudentImportService', () => {
  let service: StudentImportService;

  let prisma: {
    academic_years: {
      findUnique: jest.Mock;
    };

    student_generations: {
      findMany: jest.Mock;
      create: jest.Mock;
    };

    majors: {
      findMany: jest.Mock;
    };

    students: {
      findMany: jest.Mock;
    };

    $transaction: jest.Mock;
  };

  const existingAcademicYear = {
    id: BigInt(1),
    name: '2025-2026',
    start_year: 2025,
  };

  const existingGeneration = {
    id: BigInt(1),
    name: 'Gen 43',
    entry_academic_year_id: BigInt(1),
    starting_year_level: 1,
  };

  const amsMajor = {
    id: BigInt(1),
    code: 'AMS',
    name: 'Applied Mathematics & Statistics',
  };

  const makeDto = (
    overrides: Partial<ImportStudentsDto> = {},
  ): ImportStudentsDto => ({
    generation: 'Gen 43',
    academic_year_id: '1',
    year_level: 1,
    initial_password: 'password@1235',

    students: [
      {
        student_code: 'E20260001',
        full_name: 'Student One',
        gender: 'MALE',
        major: 'AMS',
        notes: 'Imported student',
      },
    ],

    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      academic_years: {
        findUnique: jest.fn(),
      },

      student_generations: {
        findMany: jest.fn(),
        create: jest.fn(),
      },

      majors: {
        findMany: jest.fn(),
      },

      students: {
        findMany: jest.fn(),
      },

      $transaction: jest.fn(),
    };

    service = new StudentImportService(
      prisma as unknown as PrismaService,
    );

    prisma.academic_years.findUnique.mockResolvedValue(
      existingAcademicYear as never,
    );

    prisma.student_generations.findMany.mockResolvedValue(
      [existingGeneration] as never,
    );

    prisma.majors.findMany.mockResolvedValue(
      [amsMajor] as never,
    );

    prisma.students.findMany.mockResolvedValue(
      [] as never,
    );

    prisma.$transaction.mockImplementation(
      async (...args: unknown[]) => {
        const callback = args[0] as (
          tx: unknown,
        ) => Promise<unknown>;

        const tx = {
          users: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(100),
            } as never),
          },

          students: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(200),
            } as never),
          },

          student_academic_records: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(300),
            } as never),
          },
        };

        return callback(tx);
      },
    );
  });

  it('imports a new student successfully', async () => {
    const result = await service.importStudents(
      makeDto(),
    );

    expect(
      prisma.academic_years.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: BigInt(1),
      },

      select: {
        id: true,
        name: true,
        start_year: true,
      },
    });

    expect(
      prisma.student_generations.findMany,
    ).toHaveBeenCalledWith({
      where: {
        name: {
          equals: 'Gen 43',
          mode: 'insensitive',
        },
      },

      select: {
        id: true,
        name: true,
        entry_academic_year_id: true,
        starting_year_level: true,
      },
    });

    expect(
      prisma.majors.findMany,
    ).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            code: {
              equals: 'ams',
              mode: 'insensitive',
            },
          },

          {
            name: {
              equals: 'ams',
              mode: 'insensitive',
            },
          },
        ],
      },

      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    expect(
      prisma.$transaction,
    ).toHaveBeenCalledTimes(1);

    expect(result.summary).toEqual({
      total: 1,
      created: 1,
      skipped: 0,
      failed: 0,
    });

    expect(result.results).toEqual([
      {
        row: 1,
        student_code: 'e20260001',
        status: 'CREATED',
        message: 'Student created successfully',
        student_id: '200',
      },
    ]);
  });

  it('uses the normalized student code as the name when the name is missing', async () => {
    const dto = makeDto({
      students: [
        {
          student_code: ' E20260002 ',
          major: 'AMS',
        },
      ],
    });

    let capturedTx:
      | {
          users: {
            create: jest.Mock;
          };

          students: {
            create: jest.Mock;
          };

          student_academic_records: {
            create: jest.Mock;
          };
        }
      | undefined;

    prisma.$transaction.mockImplementation(
      async (...args: unknown[]) => {
        const callback = args[0] as (
          tx: unknown,
        ) => Promise<unknown>;

        capturedTx = {
          users: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(101),
            } as never),
          },

          students: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(201),
            } as never),
          },

          student_academic_records: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(301),
            } as never),
          },
        };

        return callback(capturedTx);
      },
    );

    const result =
      await service.importStudents(dto);

    expect(
      capturedTx?.users.create,
    ).toHaveBeenCalledWith({
      data: {
        email: null,
        password_hash: expect.any(String),
        full_name: 'e20260002',
        gender: null,
        role: 'STUDENT',
        status: 'ACTIVE',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      },

      select: {
        id: true,
      },
    });

    expect(
      capturedTx?.students.create,
    ).toHaveBeenCalledWith({
      data: {
        user_id: BigInt(101),
        student_code: 'e20260002',
        generation_id: BigInt(1),
        notes: null,
      },

      select: {
        id: true,
      },
    });

    expect(
      capturedTx?.student_academic_records.create,
    ).toHaveBeenCalledWith({
      data: {
        student_id: BigInt(201),
        academic_year_id: BigInt(1),
        year_level: 1,
        major_id: BigInt(1),
        class_group: null,
      },
    });

    expect(result.summary.created).toBe(1);
  });

  it('uses the default password when initial_password is blank', async () => {
    let capturedHash: string | undefined;

    prisma.$transaction.mockImplementation(
      async (...args: unknown[]) => {
        const callback = args[0] as (
          tx: unknown,
        ) => Promise<unknown>;

        const tx = {
          users: {
            create: jest.fn(
              async (input: unknown) => {
                const data = input as {
                  data: {
                    password_hash: string;
                  };
                };

                capturedHash =
                  data.data.password_hash;

                return {
                  id: BigInt(100),
                };
              },
            ),
          },

          students: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(200),
            } as never),
          },

          student_academic_records: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(300),
            } as never),
          },
        };

        return callback(tx);
      },
    );

    await service.importStudents(
      makeDto({
        initial_password: '   ',
      }),
    );

    expect(capturedHash).toBeDefined();
    expect(typeof capturedHash).toBe('string');
    expect(capturedHash).not.toBe(
      'password@1235',
    );
  });

  it('rejects duplicate normalized student codes in the same import before saving', async () => {
    const dto = makeDto({
      students: [
        {
          student_code: 'E20260001',
          major: 'AMS',
        },

        {
          student_code: ' e20260001 ',
          major: 'AMS',
        },
      ],
    });

    await expect(
      service.importStudents(dto),
    ).rejects.toThrow(
      'Duplicate student codes in import: e20260001',
    );

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('skips an existing student without creating another account', async () => {
    prisma.students.findMany.mockResolvedValue(
      [
        {
          id: BigInt(50),
          student_code: 'e20260001',
        },
      ] as never,
    );

    const result = await service.importStudents(
      makeDto(),
    );

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();

    expect(result.summary).toEqual({
      total: 1,
      created: 0,
      skipped: 1,
      failed: 0,
    });

    expect(result.results[0]).toEqual({
      row: 1,
      student_code: 'e20260001',
      status: 'SKIPPED',
      message: 'Student code already exists',
    });
  });

  it('reports an unknown major as a failed row without creating the student', async () => {
    prisma.majors.findMany.mockResolvedValue(
      [] as never,
    );

    const result = await service.importStudents(
      makeDto(),
    );

    expect(result.summary).toEqual({
      total: 1,
      created: 0,
      skipped: 0,
      failed: 1,
    });

    expect(result.results[0]).toEqual({
      row: 1,
      student_code: 'e20260001',
      status: 'FAILED',
      message: 'Major "ams" was not found',
    });

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('reports an ambiguous major as a failed row', async () => {
    prisma.majors.findMany.mockResolvedValue(
      [
        {
          id: BigInt(1),
          code: 'AMS',
          name: 'Applied Mathematics & Statistics',
        },

        {
          id: BigInt(2),
          code: 'OTHER',
          name: 'AMS',
        },
      ] as never,
    );

    const result = await service.importStudents(
      makeDto(),
    );

    expect(result.summary.failed).toBe(1);

    expect(result.results[0]).toEqual({
      row: 1,
      student_code: 'e20260001',
      status: 'FAILED',
      message: 'Major "ams" is ambiguous',
    });

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('creates a new generation when the generation does not exist and entry year is provided', async () => {
    prisma.student_generations.findMany.mockResolvedValue(
      [] as never,
    );

    prisma.academic_years.findUnique
      .mockResolvedValueOnce(
        existingAcademicYear as never,
      )
      .mockResolvedValueOnce({
        id: BigInt(1),
      } as never);

    prisma.student_generations.create.mockResolvedValue({
      id: BigInt(2),
      name: 'Gen 44',
      entry_academic_year_id: BigInt(1),
      starting_year_level: 1,
    } as never);

    const dto = makeDto({
      generation: '  Gen   44  ',
      entry_academic_year_id: '1',
      starting_year_level: 1,
    });

    const result =
      await service.importStudents(dto);

    expect(
      prisma.student_generations.create,
    ).toHaveBeenCalledWith({
      data: {
        name: 'Gen 44',
        entry_academic_year_id: BigInt(1),
        starting_year_level: 1,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      },

      select: {
        id: true,
        name: true,
        entry_academic_year_id: true,
        starting_year_level: true,
      },
    });

    expect(result.generation).toEqual({
      id: '2',
      name: 'Gen 44',
      entry_academic_year_id: '1',
      starting_year_level: 1,
    });
  });

  it('requires entry_academic_year_id when creating a new generation', async () => {
    prisma.student_generations.findMany.mockResolvedValue(
      [] as never,
    );

    const dto = makeDto({
      generation: 'Gen 44',
      entry_academic_year_id: undefined,
    });

    await expect(
      service.importStudents(dto),
    ).rejects.toThrow(
      'entry_academic_year_id is required when creating a new student generation',
    );

    expect(
      prisma.student_generations.create,
    ).not.toHaveBeenCalled();

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects an unknown import academic year', async () => {
    prisma.academic_years.findUnique.mockResolvedValue(
      null as never,
    );

    await expect(
      service.importStudents(makeDto()),
    ).rejects.toThrow(
      'Academic year not found',
    );

    expect(
      prisma.student_generations.findMany,
    ).not.toHaveBeenCalled();

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects an initial password shorter than 6 characters', async () => {
    const dto = makeDto({
      initial_password: '12345',
    });

    await expect(
      service.importStudents(dto),
    ).rejects.toThrow(
      'Initial password must be between 6 and 72 characters',
    );

    expect(
      prisma.academic_years.findUnique,
    ).not.toHaveBeenCalled();

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('rejects a password that exceeds bcrypt 72-byte UTF-8 limit', async () => {
    const dto = makeDto({
      initial_password: 'ក'.repeat(30),
    });

    await expect(
      service.importStudents(dto),
    ).rejects.toThrow(
      'Initial password must not exceed 72 UTF-8 bytes',
    );

    expect(
      prisma.$transaction,
    ).not.toHaveBeenCalled();
  });

  it('creates each new student in its own transaction', async () => {
    const dto = makeDto({
      students: [
        {
          student_code: 'E20260001',
          major: 'AMS',
        },

        {
          student_code: 'E20260002',
          major: 'AMS',
        },
      ],
    });

    const result =
      await service.importStudents(dto);

    expect(
      prisma.$transaction,
    ).toHaveBeenCalledTimes(2);

    expect(result.summary).toEqual({
      total: 2,
      created: 2,
      skipped: 0,
      failed: 0,
    });
  });

  it('generates different bcrypt hashes for students sharing the same initial password', async () => {
    const hashes: string[] = [];

    prisma.$transaction.mockImplementation(
      async (...args: unknown[]) => {
        const callback = args[0] as (
          tx: unknown,
        ) => Promise<unknown>;

        const tx = {
          users: {
            create: jest.fn(
              async (input: unknown) => {
                const data = input as {
                  data: {
                    password_hash: string;
                  };
                };

                hashes.push(
                  data.data.password_hash,
                );

                return {
                  id: BigInt(
                    hashes.length + 100,
                  ),
                };
              },
            ),
          },

          students: {
            create: jest.fn().mockImplementation(
              async () => ({
                id: BigInt(
                  hashes.length + 200,
                ),
              }),
            ),
          },

          student_academic_records: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(300),
            } as never),
          },
        };

        return callback(tx);
      },
    );

    await service.importStudents(
      makeDto({
        students: [
          {
            student_code: 'E20260001',
            major: 'AMS',
          },

          {
            student_code: 'E20260002',
            major: 'AMS',
          },
        ],
      }),
    );

    expect(hashes).toHaveLength(2);

    expect(hashes[0]).not.toBe(
      'password@1235',
    );

    expect(hashes[1]).not.toBe(
      'password@1235',
    );

    expect(hashes[0]).not.toBe(hashes[1]);
  });

  it('treats a concurrent student-code unique conflict as skipped', async () => {
    const conflict =
      new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '6.19.3',

          meta: {
            target: ['student_code'],
          },
        },
      );

    prisma.$transaction.mockRejectedValue(
      conflict as never,
    );

    const result = await service.importStudents(
      makeDto(),
    );

    expect(result.summary).toEqual({
      total: 1,
      created: 0,
      skipped: 1,
      failed: 0,
    });

    expect(result.results[0]).toEqual({
      row: 1,
      student_code: 'e20260001',
      status: 'SKIPPED',
      message: 'Student code already exists',
    });
  });

  it('returns a failed row for an unexpected per-student save error without exposing internal details', async () => {
    prisma.$transaction.mockRejectedValue(
      new Error(
        'database connection details',
      ) as never,
    );

    const result = await service.importStudents(
      makeDto(),
    );

    expect(result.summary).toEqual({
      total: 1,
      created: 0,
      skipped: 0,
      failed: 1,
    });

    expect(result.results[0]).toEqual({
      row: 1,
      student_code: 'e20260001',
      status: 'FAILED',
      message: 'Student could not be imported',
    });
  });
});