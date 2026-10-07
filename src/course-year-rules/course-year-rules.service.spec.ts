import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { CourseYearRulesService } from './course-year-rules.service';

describe('CourseYearRulesService', () => {
  let service: CourseYearRulesService;

  const findManyMock = jest.fn<(args: any) => Promise<any>>();

  const findUniqueMock = jest.fn<(args: any) => Promise<any>>();

  const findFirstMock = jest.fn<(args: any) => Promise<any>>();

  const createMock = jest.fn<(args: any) => Promise<any>>();

  const updateMock = jest.fn<(args: any) => Promise<any>>();

  const deleteMock = jest.fn<(args: any) => Promise<any>>();

  const courseFindUniqueMock = jest.fn<(args: any) => Promise<any>>();

  const majorFindUniqueMock = jest.fn<(args: any) => Promise<any>>();

  const prismaMock = {
    $transaction: jest.fn<any>(async (operation: any) => operation(prismaMock)),
    course_year_rules: {
      findMany: findManyMock,
      findUnique: findUniqueMock,
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
    courses: {
      findUnique: courseFindUniqueMock,
    },
    majors: {
      findUnique: majorFindUniqueMock,
    },
  };

  const rule = {
    id: 1n,
    course_id: 10n,
    major_id: 20n,
    year_level: 4,
    created_at: new Date('2026-10-06T00:00:00.000Z'),
    updated_at: new Date('2026-10-06T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CourseYearRulesService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = moduleRef.get(CourseYearRulesService);
  });

  it('returns all curriculum rules', async () => {
    findManyMock.mockResolvedValue([rule]);

    const result = await service.findAll();

    expect(result).toEqual([rule]);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course_id: undefined,
          major_id: undefined,
          year_level: undefined,
        }),
      }),
    );
  });

  it('filters by course, major, and year level', async () => {
    findManyMock.mockResolvedValue([rule]);

    await service.findAll({
      course_id: '10',
      major_id: '20',
      year_level: 4,
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course_id: 10n,
          major_id: 20n,
          year_level: 4,
        }),
      }),
    );
  });

  it('adds search conditions for course and major fields', async () => {
    findManyMock.mockResolvedValue([rule]);

    await service.findAll({
      search: 'AMS',
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );

    const call = findManyMock.mock.calls[0][0];

    expect(call.where.OR).toHaveLength(4);
  });

  it('rejects an invalid course filter ID', async () => {
    await expect(
      service.findAll({
        course_id: 'abc',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('rejects a non-positive major filter ID', async () => {
    await expect(
      service.findAll({
        major_id: '0',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid year level filter', async () => {
    await expect(
      service.findAll({
        year_level: 6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns one curriculum rule', async () => {
    findUniqueMock.mockResolvedValue(rule);

    await expect(service.findOne(1n)).resolves.toEqual(rule);

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
        },
      }),
    );
  });

  it('throws when a curriculum rule does not exist', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(service.findOne(999n)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a curriculum rule when references are valid', async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue(rule);

    const result = await service.create({
      course_id: '10',
      major_id: '20',
      year_level: 4,
    });

    expect(result).toEqual(rule);

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          course_id: 10n,
          major_id: 20n,
          year_level: 4,
        },
      }),
    );
  });

  it('rejects create when the course does not exist', async () => {
    courseFindUniqueMock.mockResolvedValue(null);

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    await expect(
      service.create({
        course_id: '10',
        major_id: '20',
        year_level: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects create when the major does not exist', async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue(null);

    await expect(
      service.create({
        course_id: '10',
        major_id: '20',
        year_level: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects a duplicate curriculum rule before create', async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    findFirstMock.mockResolvedValue({
      id: 2n,
    });

    await expect(
      service.create({
        course_id: '10',
        major_id: '20',
        year_level: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(createMock).not.toHaveBeenCalled();
  });

  it('maps a database unique conflict during create to 409', async () => {
    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    findFirstMock.mockResolvedValue(null);

    createMock.mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.create({
        course_id: '10',
        major_id: '20',
        year_level: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a curriculum rule', async () => {
    findUniqueMock.mockResolvedValue(rule);

    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    findFirstMock.mockResolvedValue(null);

    const updated = {
      ...rule,
      year_level: 5,
    };

    updateMock.mockResolvedValue(updated);

    const result = await service.update(1n, {
      year_level: 5,
    });

    expect(result).toEqual(updated);

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 1n,
        },
        data: {
          course_id: 10n,
          major_id: 20n,
          year_level: 5,
        },
      }),
    );
  });

  it('excludes the current rule from duplicate checking during update', async () => {
    findUniqueMock.mockResolvedValue(rule);

    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    findFirstMock.mockResolvedValue(null);
    updateMock.mockResolvedValue(rule);

    await service.update(1n, {
      year_level: 4,
    });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        course_id: 10n,
        major_id: 20n,
        year_level: 4,
        id: {
          not: 1n,
        },
      },
      select: {
        id: true,
      },
    });
  });

  it('rejects a duplicate curriculum rule during update', async () => {
    findUniqueMock.mockResolvedValue(rule);

    courseFindUniqueMock.mockResolvedValue({
      id: 10n,
    });

    majorFindUniqueMock.mockResolvedValue({
      id: 20n,
    });

    findFirstMock.mockResolvedValue({
      id: 2n,
    });

    await expect(
      service.update(1n, {
        year_level: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('deletes an existing curriculum rule', async () => {
    findUniqueMock.mockResolvedValue(rule);
    deleteMock.mockResolvedValue(rule);

    const result = await service.remove(1n);

    expect(result).toEqual(rule);

    expect(deleteMock).toHaveBeenCalledWith({
      where: {
        id: 1n,
      },
    });
  });

  it('does not delete a missing curriculum rule', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(service.remove(999n)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(deleteMock).not.toHaveBeenCalled();
  });
});
