import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { class_type } from '@prisma/client';

import { CourseOfferingsService } from './course-offerings.service';
import { LecturerCourseOfferingsController } from './lecturer-course-offerings.controller';

describe(
  'LecturerCourseOfferingsController',
  () => {
    let controller: LecturerCourseOfferingsController;

    const findOwnedByLecturerMock =
      jest.fn<
        (
          lecturerId: bigint,
          query: any,
        ) => Promise<any>
      >();

    beforeEach(async () => {
      findOwnedByLecturerMock.mockReset();

      const moduleRef =
        await Test.createTestingModule({
          controllers: [
            LecturerCourseOfferingsController,
          ],

          providers: [
            {
              provide:
                CourseOfferingsService,

              useValue: {
                findOwnedByLecturer:
                  findOwnedByLecturerMock,
              },
            },
          ],
        }).compile();

      controller =
        moduleRef.get(
          LecturerCourseOfferingsController,
        );
    });

    it(
      'uses the authenticated lecturer id when listing assignments',
      async () => {
        const expected = {
          items: [],
          total: 0,
          complete: true,
        };

        findOwnedByLecturerMock
          .mockResolvedValue(expected);

        const query = {
          search: 'data',
          academic_year_id: '70',
          semester_id: '60',
          year_level: 4,
          class_type: class_type.COURSE,
        };

        const result =
          await controller.findOwn(
            {
              id: 20n,
            },
            query,
          );

        expect(
          findOwnedByLecturerMock,
        ).toHaveBeenCalledTimes(1);

        expect(
          findOwnedByLecturerMock,
        ).toHaveBeenCalledWith(
          20n,
          query,
        );

        expect(result).toBe(expected);
      },
    );

    it(
      'does not obtain lecturer ownership from query parameters',
      async () => {
        findOwnedByLecturerMock
          .mockResolvedValue({
            items: [],
            total: 0,
            complete: true,
          });

        const query = {
          search: 'lecturer',
        };

        await controller.findOwn(
          {
            id: 55n,
          },
          query,
        );

        expect(
          findOwnedByLecturerMock,
        ).toHaveBeenCalledWith(
          55n,
          query,
        );
      },
    );
  },
);