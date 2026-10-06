import { jest } from '@jest/globals';
import {
  NotFoundException,
} from '@nestjs/common';
import {
  Test,
  TestingModule,
} from '@nestjs/testing';

import { ResultsService } from './results.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ResultsService', () => {
  let service: ResultsService;

  const evaluationsFindManyMock =
    jest.fn<(args: any) => Promise<any[]>>();

  const usersFindFirstMock =
    jest.fn<(args: any) => Promise<any>>();

  const mockPrismaService = {
    evaluations: {
      findMany:
        evaluationsFindManyMock,
    },

    users: {
      findFirst:
        usersFindFirstMock,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          ResultsService,
          {
            provide: PrismaService,
            useValue:
              mockPrismaService,
          },
        ],
      }).compile();

    service =
      module.get<ResultsService>(
        ResultsService,
      );
  });

  // =========================================================
  // HELPERS
  // =========================================================

  function buildEvaluation() {
    const version1 = {
      id: 101n,
      survey_id: 10n,
      version_no: 1,

      surveys: {
        id: 10n,
        title:
          'Teaching Quality',
      },

      questions: [
        {
          id: 1001n,
          survey_version_id: 101n,
          question_text:
            'Rate the lecturer',
          question_text_km: null,
          question_type:
            'RATING',
          category:
            'Teaching',
          is_required: true,
          min_rating: 1,
          max_rating: 5,
          display_order: 1,

          question_options: [],
        },

        {
          id: 1002n,
          survey_version_id: 101n,
          question_text:
            'What was good?',
          question_text_km: null,
          question_type:
            'TEXT',
          category:
            'Feedback',
          is_required: false,
          min_rating: null,
          max_rating: null,
          display_order: 2,

          question_options: [],
        },
      ],
    };

    const version2 = {
      id: 102n,
      survey_id: 10n,
      version_no: 2,

      surveys: {
        id: 10n,
        title:
          'Teaching Quality',
      },

      questions: [
        {
          id: 2001n,
          survey_version_id: 102n,
          question_text:
            'Rate teaching quality',
          question_text_km: null,
          question_type:
            'RATING',
          category:
            'Teaching',
          is_required: true,
          min_rating: 1,
          max_rating: 5,
          display_order: 1,

          question_options: [],
        },

        {
          id: 2002n,
          survey_version_id: 102n,
          question_text:
            'Choose strengths',
          question_text_km: null,
          question_type:
            'CHECKBOX',
          category:
            'Teaching',
          is_required: false,
          min_rating: null,
          max_rating: null,
          display_order: 2,

          question_options: [
            {
              id: 3001n,
              question_id: 2002n,
              option_text:
                'Clear explanation',
              display_order: 1,
            },
            {
              id: 3002n,
              question_id: 2002n,
              option_text:
                'Good examples',
              display_order: 2,
            },
          ],
        },
      ],
    };

    return {
      id: 75n,
      course_offering_id: 50n,
      survey_version_id: 101n,
      participant_scope: 'SELECTED_GENERATIONS',
      status: 'OPEN',
      start_at:
        new Date(
          '2026-10-01T00:00:00.000Z',
        ),
      end_at:
        new Date(
          '2026-10-31T23:59:59.000Z',
        ),

      course_offerings: {
        id: 50n,
        section_code: 'A',
        class_type: 'COURSE',
        year_level: 4,

        users: {
          id: 20n,
          full_name:
            'Lecturer One',
          email:
            'lecturer@example.com',
        },

        courses: {
          id: 30n,
          course_code: 'AMS401',
          course_name:
            'Data Analysis',

          departments: {
            id: 40n,
            code: 'AMS',
            name:
              'Applied Mathematics and Statistics',
          },
        },

        semesters: {
          id: 60n,
          semester_name: 'Semester 1',
          semester_number: 1,

          academic_years: {
            id: 70n,
            name: '2026-2027',
            start_year: 2026,
            is_active: true,
          },
        },
      },

      generation_targets: [
        {
          generation_id: 5n,

          student_generations: {
            id: 5n,
            name: 'Generation 2023',
            entry_academic_year_id: 71n,
            starting_year_level: 1,

            entry_academic_year: {
              id: 71n,
              name: '2023-2024',
              start_year: 2023,
            },
          },
        },
      ],

      group_targets: [
        {
          academic_year_id: 70n,
          generation_id: 5n,
          major_id: 10n,
          year_level: 4,
          class_group: 'AMS1-A',

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

      /*
       * Evaluation base version remains V1.
       */
      survey_versions: {
        id: version1.id,
        survey_id:
          version1.survey_id,
        version_no:
          version1.version_no,
        surveys:
          version1.surveys,
      },

      /*
       * Four total submissions:
       *
       * - two using V1
       * - one using V2
       * - one historical response with no
       *   saved survey version
       */
      responses: [
        {
          id: 501n,
          evaluation_id: 75n,
          survey_version_id: 101n,
          survey_versions:
            version1,

          answers: [
            {
              id: 6001n,
              question_id: 1001n,
              rating_value: 4,
              text_value: null,
              answer_options: [],
            },

            {
              id: 6002n,
              question_id: 1002n,
              rating_value: null,
              text_value:
                'Clear explanation',
              answer_options: [],
            },
          ],
        },

        {
          id: 502n,
          evaluation_id: 75n,
          survey_version_id: 101n,
          survey_versions:
            version1,

          answers: [
            {
              id: 6003n,
              question_id: 1001n,
              rating_value: 2,
              text_value: null,
              answer_options: [],
            },

            {
              id: 6004n,
              question_id: 1002n,
              rating_value: null,
              text_value:
                'Good examples',
              answer_options: [],
            },
          ],
        },

        {
          id: 503n,
          evaluation_id: 75n,
          survey_version_id: 102n,
          survey_versions:
            version2,

          answers: [
            {
              id: 6005n,
              question_id: 2001n,
              rating_value: 5,
              text_value: null,
              answer_options: [],
            },

            {
              id: 6006n,
              question_id: 2002n,
              rating_value: null,
              text_value: null,

              answer_options: [
                {
                  answer_id: 6006n,
                  option_id: 3001n,

                  question_options: {
                    id: 3001n,
                    question_id:
                      2002n,
                    option_text:
                      'Clear explanation',
                    display_order: 1,
                  },
                },
              ],
            },
          ],
        },

        {
          id: 504n,
          evaluation_id: 75n,
          survey_version_id: null,
          survey_versions: null,

          answers: [
            {
              id: 6007n,
              question_id: 1001n,
              rating_value: 1,
              text_value: null,
              answer_options: [],
            },
          ],
        },
      ],

      _count: {
        evaluation_participants: 8,
        responses: 4,
      },
    };
  }

  // =========================================================
  // BASIC
  // =========================================================

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it(
    'should exclude DRAFT evaluations from admin results',
    async () => {
      evaluationsFindManyMock.mockResolvedValue([]);

      await service.getAdminResults();

      expect(
        evaluationsFindManyMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: {
              not: 'DRAFT',
            },
          },
        }),
      );
    },
  );

  it(
    'should exclude DRAFT evaluations from admin lecturer results',
    async () => {
      usersFindFirstMock.mockResolvedValue({
        id: 20n,
        full_name: 'Lecturer One',
        email: 'lecturer@example.com',
      });

      evaluationsFindManyMock.mockResolvedValue([]);

      await service.getAdminResultsByLecturer(
        20n,
      );

      expect(
        evaluationsFindManyMock,
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
        }),
      );
    },
  );

  it(
    'should exclude DRAFT evaluations from lecturer results',
    async () => {
      usersFindFirstMock.mockResolvedValue({
        id: 20n,
        full_name: 'Lecturer One',
        email: 'lecturer@example.com',
      });

      evaluationsFindManyMock.mockResolvedValue([]);

      await service.getLecturerResults(
        20n,
      );

      expect(
        evaluationsFindManyMock,
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
        }),
      );
    },
  );

  // =========================================================
  // MIXED VERSION AGGREGATION
  // =========================================================

  it(
    'should separate results by the actual survey version used by each response',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      expect(result).toHaveLength(1);

      expect(
        result[0].version_results,
      ).toHaveLength(2);

      expect(
        result[0]
          .version_results[0]
          .survey_version_id,
      ).toBe(101n);

      expect(
        result[0]
          .version_results[0]
          .version_no,
      ).toBe(1);

      expect(
        result[0]
          .version_results[0]
          .submission_count,
      ).toBe(2);

      expect(
        result[0]
          .version_results[1]
          .survey_version_id,
      ).toBe(102n);

      expect(
        result[0]
          .version_results[1]
          .version_no,
      ).toBe(2);

      expect(
        result[0]
          .version_results[1]
          .submission_count,
      ).toBe(1);
    },
  );

  it(
    'should aggregate V1 ratings using only V1 responses',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      const v1 =
        result[0].version_results[0];

      const ratingQuestion =
        v1.questions.find(
          (question: any) =>
            question.question_id ===
            1001n,
        );

      expect(
        ratingQuestion.answer_count,
      ).toBe(2);

      /*
       * V1 ratings = 4 and 2.
       *
       * The unversioned rating = 1 must NOT
       * be silently included.
       */
      expect(
        ratingQuestion.average,
      ).toBe(3);

      expect(
        ratingQuestion.distribution,
      ).toEqual({
        '1': 0,
        '2': 1,
        '3': 0,
        '4': 1,
        '5': 0,
      });
    },
  );

  it(
    'should aggregate V2 ratings using only V2 responses',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      const v2 =
        result[0].version_results[1];

      const ratingQuestion =
        v2.questions.find(
          (question: any) =>
            question.question_id ===
            2001n,
        );

      expect(
        ratingQuestion.answer_count,
      ).toBe(1);

      expect(
        ratingQuestion.average,
      ).toBe(5);

      expect(
        ratingQuestion.distribution,
      ).toEqual({
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 1,
      });
    },
  );

  it(
    'should preserve the original questions for each survey version',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      const v1 =
        result[0].version_results[0];

      const v2 =
        result[0].version_results[1];

      expect(
        v1.questions.map(
          (question: any) =>
            question.question_id,
        ),
      ).toEqual([
        1001n,
        1002n,
      ]);

      expect(
        v2.questions.map(
          (question: any) =>
            question.question_id,
        ),
      ).toEqual([
        2001n,
        2002n,
      ]);
    },
  );

  it(
    'should aggregate multiple-choice or checkbox options using the original option ids',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      const v2 =
        result[0].version_results[1];

      const checkboxQuestion =
        v2.questions.find(
          (question: any) =>
            question.question_id ===
            2002n,
        );

      expect(
        checkboxQuestion.options,
      ).toEqual([
        {
          option_id: 3001n,
          option_text:
            'Clear explanation',
          display_order: 1,
          count: 1,
        },
        {
          option_id: 3002n,
          option_text:
            'Good examples',
          display_order: 2,
          count: 0,
        },
      ]);
    },
  );

  it(
    'should aggregate anonymous text feedback for the correct version',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      const v1 =
        result[0].version_results[0];

      const textQuestion =
        v1.questions.find(
          (question: any) =>
            question.question_id ===
            1002n,
        );

      expect(
        textQuestion.answer_count,
      ).toBe(2);

      expect(
        textQuestion.feedback,
      ).toEqual([
        'Clear explanation',
        'Good examples',
      ]);
    },
  );

  // =========================================================
  // UNVERSIONED HISTORICAL RESPONSES
  // =========================================================

  it(
    'should report unversioned historical responses without guessing their survey version',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0]
          .unversioned_submission_count,
      ).toBe(1);

      const groupedSubmissions =
        result[0].version_results.reduce(
          (
            total: number,
            version: any,
          ) =>
            total +
            version.submission_count,
          0,
        );

      expect(
        groupedSubmissions,
      ).toBe(3);

      expect(
        result[0].submission_count,
      ).toBe(4);
    },
  );

  // =========================================================
  // OVERALL COUNTS
  // =========================================================

  it(
    'should keep overall participant count, submission count and response rate correct',
    async () => {
      evaluationsFindManyMock.mockResolvedValue([
        buildEvaluation(),
      ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].participant_count,
      ).toBe(8);

      expect(
        result[0].submission_count,
      ).toBe(4);

      expect(
        result[0].response_rate,
      ).toEqual({
        value: 50,
        unavailable_reason: null,
      });
    },
  );

  it(
    'should return a real zero response rate when participants exist but nobody submitted',
    async () => {
      const evaluation = buildEvaluation();

      evaluation.responses = [];
      evaluation._count = {
        evaluation_participants: 8,
        responses: 0,
      };

      evaluationsFindManyMock.mockResolvedValue([
        evaluation,
      ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].participant_count,
      ).toBe(8);

      expect(
        result[0].submission_count,
      ).toBe(0);

      expect(
        result[0].response_rate,
      ).toEqual({
        value: 0,
        unavailable_reason: null,
      });
    },
  );

  it(
    'should return an unavailable response rate when there are no participants',
    async () => {
      const evaluation = buildEvaluation();

      evaluation.responses = [];
      evaluation._count = {
        evaluation_participants: 0,
        responses: 0,
      };

      evaluationsFindManyMock.mockResolvedValue([
        evaluation,
      ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].participant_count,
      ).toBe(0);

      expect(
        result[0].submission_count,
      ).toBe(0);

      expect(
        result[0].response_rate,
      ).toEqual({
        value: null,
        unavailable_reason:
          'NO_PARTICIPANTS',
      });
    },
  );

  it(
    'should return offering, semester, academic year and frozen targeting metadata',
    async () => {
      evaluationsFindManyMock.mockResolvedValue([
        buildEvaluation(),
      ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].evaluation.participant_scope,
      ).toBe('SELECTED_GENERATIONS');

      expect(
        result[0].offering,
      ).toEqual({
        id: 50n,
        class_type: 'COURSE',
        year_level: 4,
      });

      expect(
        result[0].semester,
      ).toEqual({
        id: 60n,
        name: 'Semester 1',
        semester_number: 1,

        academic_year: {
          id: 70n,
          name: '2026-2027',
          start_year: 2026,
          is_active: true,
        },
      });

      expect(
        result[0].target_scope,
      ).toEqual({
        participant_scope:
          'SELECTED_GENERATIONS',

        generations_complete: true,
        generations_unavailable_reason: null,

        generations: [
          {
            id: 5n,
            name: 'Generation 2023',
            entry_academic_year_id: 71n,
            starting_year_level: 1,

            entry_academic_year: {
              id: 71n,
              name: '2023-2024',
              start_year: 2023,
            },
          },
        ],

        groups_complete: true,
        groups_unavailable_reason: null,

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
            class_group: 'AMS1-A',
          },
        ],
      });
    },
  );

  it(
    'should mark generation metadata incomplete for ALL_ENROLLED scope',
    async () => {
      const evaluation = buildEvaluation();

      evaluation.participant_scope =
        'ALL_ENROLLED';

      evaluation.generation_targets = [];
      evaluation.group_targets = [];

      evaluationsFindManyMock.mockResolvedValue([
        evaluation,
      ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].target_scope,
      ).toEqual({
        participant_scope:
          'ALL_ENROLLED',

        generations_complete: false,

        generations_unavailable_reason:
          'SCOPE_NOT_GENERATION_ONLY',

        generations: [],

        groups_complete: false,

        groups_unavailable_reason:
          'NO_FROZEN_GROUP_TARGETS',

        groups: [],
      });
    },
  );

  it(
    'should mark generation metadata incomplete when frozen generation targets are missing',
    async () => {
      const evaluation = buildEvaluation();

      evaluation.participant_scope =
        'SELECTED_GENERATIONS';

      evaluation.generation_targets = [];

      evaluationsFindManyMock.mockResolvedValue([
        evaluation,
      ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].target_scope,
      ).toEqual({
        participant_scope:
          'SELECTED_GENERATIONS',

        generations_complete: false,

        generations_unavailable_reason:
          'NO_FROZEN_GENERATION_TARGETS',

        generations: [],

        groups_complete: true,
        groups_unavailable_reason: null,

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
            class_group: 'AMS1-A',
          },
        ],
      });
    },
  );

  // =========================================================
  // BASE VERSION METADATA
  // =========================================================

  it(
    'should preserve the evaluation base survey version as metadata',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      expect(
        result[0].survey,
      ).toEqual({
        id: 10n,
        title:
          'Teaching Quality',
        base_version_id: 101n,
        base_version_no: 1,
      });
    },
  );

  // =========================================================
  // PRIVACY
  // =========================================================

  it(
    'should not expose student, participant or response identity in aggregated results',
    async () => {
      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getAdminResults();

      const serialized =
        JSON.stringify(
          result,
          (_key, value) =>
            typeof value === 'bigint'
              ? value.toString()
              : value,
        );

      expect(
        serialized,
      ).not.toContain(
        '"student_id"',
      );

      expect(
        serialized,
      ).not.toContain(
        '"participant_id"',
      );

      expect(
        serialized,
      ).not.toContain(
        '"response_id"',
      );
    },
  );

  // =========================================================
  // LECTURER RESULTS
  // =========================================================

  it(
    'should return lecturer results with the same mixed-version aggregation',
    async () => {
      usersFindFirstMock
        .mockResolvedValue({
          id: 20n,
          full_name:
            'Lecturer One',
          email:
            'lecturer@example.com',
        });

      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service.getLecturerResults(
          20n,
        );

      expect(
        result.lecturer.id,
      ).toBe(20n);

      expect(
        result.evaluations,
      ).toHaveLength(1);

      expect(
        result.evaluations[0]
          .version_results,
      ).toHaveLength(2);
    },
  );

  it(
    'should throw NotFoundException when lecturer does not exist',
    async () => {
      usersFindFirstMock
        .mockResolvedValue(null);

      await expect(
        service.getLecturerResults(
          999n,
        ),
      ).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(
        evaluationsFindManyMock,
      ).not.toHaveBeenCalled();
    },
  );

  // =========================================================
  // ADMIN RESULTS BY LECTURER
  // =========================================================

  it(
    'should return admin results for one lecturer using mixed-version aggregation',
    async () => {
      usersFindFirstMock
        .mockResolvedValue({
          id: 20n,
          full_name:
            'Lecturer One',
          email:
            'lecturer@example.com',
        });

      evaluationsFindManyMock
        .mockResolvedValue([
          buildEvaluation(),
        ]);

      const result =
        await service
          .getAdminResultsByLecturer(
            20n,
          );

      expect(
        result.lecturer.id,
      ).toBe(20n);

      expect(
        result.evaluations[0]
          .version_results,
      ).toHaveLength(2);

      expect(
        result.evaluations[0]
          .unversioned_submission_count,
      ).toBe(1);
    },
  );
});