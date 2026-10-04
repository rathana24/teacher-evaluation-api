import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { class_type } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CourseOfferingsService } from './course-offerings.service';

type AsyncMock = jest.Mock<
  (...args: any[]) => Promise<any>
>;

describe('CourseOfferingsService', () => {
  let service: CourseOfferingsService;

  let courseFindUnique: AsyncMock;
  let userFindUnique: AsyncMock;
  let semesterFindUnique: AsyncMock;
  let offeringFindUnique: AsyncMock;
  let offeringFindFirst: AsyncMock;
  let offeringFindMany: AsyncMock;
  let offeringCreate: AsyncMock;
  let offeringUpdate: AsyncMock;
  let offeringDelete: AsyncMock;

  beforeEach(() => {
    courseFindUnique =
      jest.fn<(...args: any[]) => Promise<any>>();

    userFindUnique =
      jest.fn<(...args: any[]) => Promise<any>>();

    semesterFindUnique =
      jest.fn<(...args: any[]) => Promise<any>>();

    offeringFindUnique =
      jest.fn<(...args: any[]) => Promise<any>>();

    offeringFindFirst =
      jest.fn<(...args: any[]) => Promise<any>>();

    offeringFindMany =
      jest.fn<(...args: any[]) => Promise<any>>();

    offeringCreate =
      jest.fn<(...args: any[]) => Promise<any>>();

    offeringUpdate =
      jest.fn<(...args: any[]) => Promise<any>>();

    offeringDelete =
      jest.fn<(...args: any[]) => Promise<any>>();

    const prismaMock = {
      courses: {
        findUnique: courseFindUnique,
      },

      users: {
        findUnique: userFindUnique,
      },

      semesters: {
        findUnique: semesterFindUnique,
      },

      course_offerings: {
        findUnique: offeringFindUnique,
        findFirst: offeringFindFirst,
        findMany: offeringFindMany,
        create: offeringCreate,
        update: offeringUpdate,
        delete: offeringDelete,
      },
    };

    service = new CourseOfferingsService(
      prismaMock as unknown as PrismaService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns course offerings', async () => {
      const offerings = [
        {
          id: 1n,
          year_level: 4,
          class_type: class_type.COURSE,
        },
      ];

      offeringFindMany.mockResolvedValue(offerings);

      const result = await service.findAll();

      expect(result).toBe(offerings);

      expect(offeringFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            id: 'asc',
          },
          include: expect.objectContaining({
            courses: true,
            semesters: expect.objectContaining({
              include: {
                academic_years: true,
              },
            }),
            users: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns an existing course offering', async () => {
      const offering = {
        id: 1n,
        course_id: 10n,
        lecturer_id: 20n,
        semester_id: 30n,
        section_code: 'A',
        year_level: 4,
        class_type: class_type.COURSE,
      };

      offeringFindUnique.mockResolvedValue(offering);

      await expect(
        service.findOne(1n),
      ).resolves.toBe(offering);
    });

    it('throws when course offering does not exist', async () => {
      offeringFindUnique.mockResolvedValue(null);

      await expect(
        service.findOne(999n),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      courseFindUnique.mockResolvedValue({
        id: 10n,
      });

      userFindUnique.mockResolvedValue({
        role: 'LECTURER',
        status: 'ACTIVE',
      });

      semesterFindUnique.mockResolvedValue({
        id: 30n,
      });

      offeringFindFirst.mockResolvedValue(null);
    });

    it('creates an offering with year level and class type', async () => {
      const created = {
        id: 1n,
        course_id: 10n,
        lecturer_id: 20n,
        semester_id: 30n,
        section_code: 'A',
        year_level: 4,
        class_type: class_type.TD,
      };

      offeringCreate.mockResolvedValue(created);

      const result = await service.create({
        course_id: '10',
        lecturer_id: '20',
        semester_id: '30',
        section_code: ' A ',
        year_level: 4,
        class_type: class_type.TD,
      });

      expect(result).toBe(created);

      expect(offeringCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            course_id: 10n,
            lecturer_id: 20n,
            semester_id: 30n,
            section_code: 'A',
            year_level: 4,
            class_type: class_type.TD,
          }),
        }),
      );
    });

    it('allows optional year level and class type to be null', async () => {
      offeringCreate.mockResolvedValue({
        id: 1n,
      });

      await service.create({
        course_id: '10',
        lecturer_id: '20',
        semester_id: '30',
      });

      expect(offeringCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            year_level: null,
            class_type: null,
            section_code: null,
          }),
        }),
      );
    });

    it('rejects an unknown course', async () => {
      courseFindUnique.mockResolvedValue(null);

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
        }),
      ).rejects.toThrow(
        'course_id does not match any course',
      );

      expect(offeringCreate).not.toHaveBeenCalled();
    });

    it('rejects an unknown semester', async () => {
      semesterFindUnique.mockResolvedValue(null);

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
        }),
      ).rejects.toThrow(
        'semester_id does not match any semester',
      );

      expect(offeringCreate).not.toHaveBeenCalled();
    });

    it('rejects a user who is not a lecturer', async () => {
      userFindUnique.mockResolvedValue({
        role: 'STUDENT',
        status: 'ACTIVE',
      });

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
        }),
      ).rejects.toThrow(
        'lecturer_id must refer to a user with role LECTURER',
      );

      expect(offeringCreate).not.toHaveBeenCalled();
    });

    it('rejects an inactive lecturer', async () => {
      userFindUnique.mockResolvedValue({
        role: 'LECTURER',
        status: 'INACTIVE',
      });

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
        }),
      ).rejects.toThrow(
        'lecturer_id must refer to an ACTIVE lecturer',
      );

      expect(offeringCreate).not.toHaveBeenCalled();
    });

    it('rejects a duplicate offering', async () => {
      offeringFindFirst.mockResolvedValue({
        id: 99n,
      });

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
          section_code: 'A',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(offeringCreate).not.toHaveBeenCalled();
    });

    it('converts a database unique conflict to ConflictException', async () => {
      offeringCreate.mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('converts a database foreign-key error to BadRequestException', async () => {
      offeringCreate.mockRejectedValue({
        code: 'P2003',
      });

      await expect(
        service.create({
          course_id: '10',
          lecturer_id: '20',
          semester_id: '30',
        }),
      ).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const existingOffering = {
      id: 1n,
      course_id: 10n,
      lecturer_id: 20n,
      semester_id: 30n,
      section_code: 'A',
      year_level: 3,
      class_type: class_type.COURSE,
    };

    beforeEach(() => {
      offeringFindUnique.mockResolvedValue(
        existingOffering,
      );

      courseFindUnique.mockResolvedValue({
        id: 10n,
      });

      userFindUnique.mockResolvedValue({
        role: 'LECTURER',
        status: 'ACTIVE',
      });

      semesterFindUnique.mockResolvedValue({
        id: 30n,
      });

      offeringFindFirst.mockResolvedValue(null);
    });

    it('updates year level and class type', async () => {
      const updated = {
        ...existingOffering,
        year_level: 4,
        class_type: class_type.TP,
      };

      offeringUpdate.mockResolvedValue(updated);

      const result = await service.update(1n, {
        year_level: 4,
        class_type: class_type.TP,
      });

      expect(result).toBe(updated);

      expect(offeringUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 1n,
          },
          data: expect.objectContaining({
            course_id: 10n,
            lecturer_id: 20n,
            semester_id: 30n,
            section_code: 'A',
            year_level: 4,
            class_type: class_type.TP,
          }),
        }),
      );
    });

    it('preserves existing values when fields are omitted', async () => {
      offeringUpdate.mockResolvedValue(
        existingOffering,
      );

      await service.update(1n, {});

      expect(offeringUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            course_id: 10n,
            lecturer_id: 20n,
            semester_id: 30n,
            section_code: 'A',
            year_level: 3,
            class_type: class_type.COURSE,
          }),
        }),
      );
    });

    it('excludes the current offering from duplicate checking', async () => {
      offeringUpdate.mockResolvedValue(
        existingOffering,
      );

      await service.update(1n, {
        section_code: 'B',
      });

      expect(offeringFindFirst).toHaveBeenCalledWith({
        where: {
          course_id: 10n,
          lecturer_id: 20n,
          semester_id: 30n,
          section_code: 'B',
          id: {
            not: 1n,
          },
        },
      });
    });

    it('rejects an inactive lecturer during update', async () => {
      userFindUnique.mockResolvedValue({
        role: 'LECTURER',
        status: 'INACTIVE',
      });

      await expect(
        service.update(1n, {
          year_level: 4,
        }),
      ).rejects.toThrow(
        'lecturer_id must refer to an ACTIVE lecturer',
      );

      expect(offeringUpdate).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing unused offering', async () => {
      offeringFindUnique.mockResolvedValue({
        id: 1n,
      });

      offeringDelete.mockResolvedValue({
        id: 1n,
      });

      await service.remove(1n);

      expect(offeringDelete).toHaveBeenCalledWith({
        where: {
          id: 1n,
        },
      });
    });

    it('rejects deletion when the offering is in use', async () => {
      offeringFindUnique.mockResolvedValue({
        id: 1n,
      });

      offeringDelete.mockRejectedValue({
        code: 'P2003',
      });

      await expect(
        service.remove(1n),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects deletion when the offering does not exist', async () => {
      offeringFindUnique.mockResolvedValue(null);

      await expect(
        service.remove(999n),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(offeringDelete).not.toHaveBeenCalled();
    });
  });
});