import { jest } from '@jest/globals';

import { PrismaService } from '../prisma/prisma.service';
import { LecturerDashboardService } from './lecturer-dashboard.service';

type AsyncMock = jest.Mock<
  (...args: any[]) => Promise<any>
>;

describe('LecturerDashboardService', () => {
  let service: LecturerDashboardService;
  let evaluationFindMany: AsyncMock;

  beforeEach(() => {
    evaluationFindMany =
      jest.fn<(...args: any[]) => Promise<any>>();

    const prismaMock = {
      evaluations: {
        findMany: evaluationFindMany,
      },
    };

    service = new LecturerDashboardService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('findMyEvaluations', () => {
    it('returns frozen group labels with complete group scope metadata', async () => {
      evaluationFindMany.mockResolvedValue([
        {
          id: 100n,
          status: 'OPEN',
          start_at: new Date(
            '2026-10-01T00:00:00.000Z',
          ),
          end_at: new Date(
            '2026-10-31T23:59:59.000Z',
          ),
          survey_version_id: 200n,

          course_offerings: {
            lecturer_id: 20n,
            section_code: 'TD-01',

            courses: {
              course_code: 'AMS401',
              course_name: 'Data Science',
            },

            semesters: {
              semester_name: 'Semester 1',
              academic_year_id: 70n,

              academic_years: {
                id: 70n,
                name: '2026-2027',
              },
            },
          },

          survey_versions: {
            version_no: 1,

            surveys: {
              title: 'Teaching Evaluation',
            },
          },

          group_targets: [
            {
              academic_year_id: 70n,
              generation_id: 5n,
              major_id: 10n,
              year_level: 4,
              class_group: 'A',

              academic_years: {
                id: 70n,
                name: '2026-2027',
                start_year: 2026,
              },

              student_generations: {
                id: 5n,
                name: 'Generation 2023',
              },

              majors: {
                id: 10n,
                code: 'AMS',
                name:
                  'Applied Mathematics and Statistics',
              },
            },
          ],

          _count: {
            evaluation_participants: 30,
            responses: 20,
          },
        },
      ]);

      const result =
        await service.findMyEvaluations(20n);

      expect(result).toHaveLength(1);

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 100n,
          eligible_count: 30,
          response_count: 20,
          results_available: false,

          group_scope: {
            complete: true,
            unavailable_reason: null,

            groups: [
              {
                academic_year: {
                  id: 70n,
                  name: '2026-2027',
                  start_year: 2026,
                },

                generation: {
                  id: 5n,
                  name: 'Generation 2023',
                },

                major: {
                  id: 10n,
                  code: 'AMS',
                  name:
                    'Applied Mathematics and Statistics',
                },

                year_level: 4,
                class_group: 'A',
              },
            ],
          },
        }),
      );

      expect(
        evaluationFindMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              not: 'DRAFT',
            },

            course_offerings: {
              lecturer_id: 20n,
            },
          },

          select: expect.objectContaining({
            group_targets:
              expect.any(Object),
          }),
        }),
      );
    });

    it('reports missing frozen group metadata explicitly', async () => {
      evaluationFindMany.mockResolvedValue([
        {
          id: 101n,
          status: 'CLOSED',
          start_at: new Date(
            '2026-09-01T00:00:00.000Z',
          ),
          end_at: new Date(
            '2026-09-30T23:59:59.000Z',
          ),
          survey_version_id: 201n,

          course_offerings: {
            lecturer_id: 20n,
            section_code: 'COURSE-01',

            courses: {
              course_code: 'AMS402',
              course_name: 'Statistics',
            },

            semesters: {
              semester_name: 'Semester 1',
              academic_year_id: 70n,

              academic_years: {
                id: 70n,
                name: '2026-2027',
              },
            },
          },

          survey_versions: {
            version_no: 1,

            surveys: {
              title: 'Teaching Evaluation',
            },
          },

          group_targets: [],

          _count: {
            evaluation_participants: 25,
            responses: 25,
          },
        },
      ]);

      const result =
        await service.findMyEvaluations(20n);

      expect(result[0].group_scope).toEqual({
        complete: false,
        unavailable_reason:
          'NO_FROZEN_GROUP_TARGETS',
        groups: [],
      });

      expect(
        result[0].results_available,
      ).toBe(true);
    });
  });
});
