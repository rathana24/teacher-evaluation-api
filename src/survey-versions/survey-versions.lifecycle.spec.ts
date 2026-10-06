import { jest } from '@jest/globals';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { SurveyVersionsService } from './survey-versions.service';

// =========================================================
// MOCKS
// =========================================================

const surveyFindUniqueMock =
  jest.fn<(args: any) => Promise<any>>();

const versionFindFirstMock =
  jest.fn<(args: any) => Promise<any>>();

const versionFindUniqueMock =
  jest.fn<(args: any) => Promise<any>>();

const versionFindUniqueOrThrowMock =
  jest.fn<(args: any) => Promise<any>>();

const versionCreateMock =
  jest.fn<(args: any) => Promise<any>>();

const versionUpdateMock =
  jest.fn<(args: any) => Promise<any>>();

const versionUpdateManyMock =
  jest.fn<(args: any) => Promise<any>>();

const versionDeleteMock =
  jest.fn<(args: any) => Promise<any>>();

const questionCreateMock =
  jest.fn<(args: any) => Promise<any>>();

const questionFindManyMock =
  jest.fn<(args: any) => Promise<any>>();

const questionDeleteManyMock =
  jest.fn<(args: any) => Promise<any>>();

const optionDeleteManyMock =
  jest.fn<(args: any) => Promise<any>>();

const transactionMock =
  jest.fn<
    (
      callback: (tx: any) => Promise<any>,
      options?: any,
    ) => Promise<any>
  >();

// =========================================================
// TRANSACTION CLIENT
// =========================================================

const tx = {
  surveys: {
    findUnique:
      surveyFindUniqueMock,
  },

  survey_versions: {
    findFirst:
      versionFindFirstMock,

    findUnique:
      versionFindUniqueMock,

    findUniqueOrThrow:
      versionFindUniqueOrThrowMock,

    create:
      versionCreateMock,

    update:
      versionUpdateMock,

    updateMany:
      versionUpdateManyMock,

    delete:
      versionDeleteMock,
  },

  questions: {
    create:
      questionCreateMock,

    findMany:
      questionFindManyMock,

    deleteMany:
      questionDeleteManyMock,
  },

  question_options: {
    deleteMany:
      optionDeleteManyMock,
  },

  evaluations: {
    findMany:
      jest.fn<(args: any) => Promise<any>>(),
  },

  evaluation_participants: {
    count:
      jest.fn<(args: any) => Promise<any>>(),

    updateMany:
      jest.fn<(args: any) => Promise<any>>(),
  },
};

// =========================================================
// PRISMA MOCK
// =========================================================

const prismaMock = {
  surveys: {
    findUnique:
      surveyFindUniqueMock,
  },

  survey_versions: {
    findMany:
      jest.fn<(args: any) => Promise<any>>(),

    findFirst:
      versionFindFirstMock,

    findUnique:
      versionFindUniqueMock,

    findUniqueOrThrow:
      versionFindUniqueOrThrowMock,

    create:
      versionCreateMock,

    update:
      versionUpdateMock,

    updateMany:
      versionUpdateManyMock,

    delete:
      versionDeleteMock,
  },

  questions: {
    create:
      questionCreateMock,

    findMany:
      questionFindManyMock,

    deleteMany:
      questionDeleteManyMock,
  },

  question_options: {
    deleteMany:
      optionDeleteManyMock,
  },

  $transaction:
    transactionMock,
};

// =========================================================
// TESTS
// =========================================================

describe(
  'SurveyVersionsService lifecycle safeguards',
  () => {
    let service:
      SurveyVersionsService;

    beforeEach(async () => {
      jest.clearAllMocks();

      transactionMock.mockImplementation(
        async (
          callback:
            (client: any) =>
              Promise<any>,
        ) => {
          return callback(tx);
        },
      );

      const moduleRef =
        await Test.createTestingModule({
          providers: [
            SurveyVersionsService,

            {
              provide:
                PrismaService,

              useValue:
                prismaMock,
            },
          ],
        }).compile();

      service =
        moduleRef.get(
          SurveyVersionsService,
        );
    });

    // =====================================================
    // CREATE VERSION
    // =====================================================

    describe(
      'create',
      () => {
        it(
          'creates the next DRAFT version for an active set',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,
                archived_at:
                  null,
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 10n,
                survey_id: 1n,
                version_no: 1,
                status:
                  'DRAFT',
                questions: [],
              });

            versionCreateMock
              .mockResolvedValue({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
              });

            versionFindUniqueOrThrowMock
              .mockResolvedValue({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                questions: [],
              });

            const result =
              await service.create(
                1n,
                {
                  copy_questions:
                    false,
                },
                5n,
              );

            expect(
              result.version_no,
            ).toBe(2);

            expect(
              versionCreateMock,
            ).toHaveBeenCalledWith({
              data: expect.objectContaining({
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                created_by: 5n,
              }),
            });
          },
        );

        it(
          'rejects creation when the whole question set is archived',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,
                archived_at:
                  new Date(),
              });

            await expect(
              service.create(
                1n,
                {
                  copy_questions:
                    false,
                },
                5n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              transactionMock,
            ).not.toHaveBeenCalled();

            expect(
              versionCreateMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'rejects when the set is archived after the initial check',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValueOnce({
                id: 1n,
                archived_at:
                  null,
              })
              .mockResolvedValueOnce({
                id: 1n,
                archived_at:
                  new Date(),
              });

            await expect(
              service.create(
                1n,
                {
                  copy_questions:
                    false,
                },
                5n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              versionCreateMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'returns not found when the question set does not exist',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue(
                null,
              );

            await expect(
              service.create(
                999n,
                {
                  copy_questions:
                    false,
                },
                5n,
              ),
            ).rejects.toBeInstanceOf(
              NotFoundException,
            );
          },
        );

        it(
          'copies questions from the latest version when requested',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,
                archived_at:
                  null,
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 10n,
                survey_id: 1n,
                version_no: 1,
                status:
                  'DRAFT',

                questions: [
                  {
                    id: 100n,

                    question_text:
                      'Teaching quality',

                    question_text_km:
                      null,

                    question_type:
                      'RATING',

                    category:
                      'Teaching',

                    is_required:
                      true,

                    min_rating:
                      1,

                    max_rating:
                      5,

                    display_order:
                      1,

                    question_options:
                      [],
                  },
                ],
              });

            versionCreateMock
              .mockResolvedValue({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
              });

            questionCreateMock
              .mockResolvedValue({
                id: 200n,
              });

            versionFindUniqueOrThrowMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
                questions: [],
              });

            await service.create(
              1n,
              {
                copy_questions:
                  true,
              },
              5n,
            );

            expect(
              questionCreateMock,
            ).toHaveBeenCalledWith({
              data: expect.objectContaining({
                survey_version_id:
                  20n,

                question_text:
                  'Teaching quality',

                question_type:
                  'RATING',

                display_order:
                  1,
              }),
            });
          },
        );
      },
    );

    // =====================================================
    // LATEST-VERSION EDITABILITY
    // =====================================================

    describe(
      'assertEditable',
      () => {
        const editableVersion = {
          id: 20n,
          survey_id: 1n,
          version_no: 2,
          status:
            'DRAFT',

          surveys: {
            id: 1n,
            archived_at:
              null,
          },

          evaluations: [],

          _count: {
            evaluation_participants:
              0,

            assessment_drafts:
              0,

            responses:
              0,
          },
        };

        it(
          'allows the latest unused DRAFT version',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue(
                editableVersion,
              );

            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
              });

            const result =
              await service.assertEditable(
                20n,
              );

            expect(
              result.id,
            ).toBe(20n);
          },
        );

        it(
          'rejects editing when the whole set is archived',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                ...editableVersion,

                surveys: {
                  id: 1n,

                  archived_at:
                    new Date(),
                },
              });

            await expect(
              service.assertEditable(
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              versionFindFirstMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'rejects a stale version when a newer version exists',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                ...editableVersion,
                id: 10n,
                version_no: 1,
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
              });

            await expect(
              service.assertEditable(
                10n,
              ),
            ).rejects.toThrow(
              /no longer the latest/i,
            );
          },
        );

        it(
          'rejects a latest LOCKED version',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                ...editableVersion,

                status:
                  'LOCKED',
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
              });

            await expect(
              service.assertEditable(
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );
          },
        );

        it(
          'rejects a latest ARCHIVED version',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                ...editableVersion,

                status:
                  'ARCHIVED',
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
              });

            await expect(
              service.assertEditable(
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );
          },
        );

        it(
          'rejects a DRAFT version referenced by a non-DRAFT evaluation',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                ...editableVersion,

                evaluations: [
                  {
                    id: 100n,
                  },
                ],
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
              });

            await expect(
              service.assertEditable(
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );
          },
        );

        it.each([
          [
            'participant',
            {
              evaluation_participants:
                1,

              assessment_drafts:
                0,

              responses:
                0,
            },
          ],

          [
            'draft',
            {
              evaluation_participants:
                0,

              assessment_drafts:
                1,

              responses:
                0,
            },
          ],

          [
            'response',
            {
              evaluation_participants:
                0,

              assessment_drafts:
                0,

              responses:
                1,
            },
          ],
        ])(
          'rejects a latest DRAFT version referenced by %s history',
          async (
            _label,
            counts,
          ) => {
            versionFindUniqueMock
              .mockResolvedValue({
                ...editableVersion,
                _count:
                  counts,
              });

            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                version_no: 2,
              });

            await expect(
              service.assertEditable(
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );
          },
        );

        it(
          'throws when the version does not exist',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue(
                null,
              );

            await expect(
              service.assertEditable(
                999n,
              ),
            ).rejects.toBeInstanceOf(
              NotFoundException,
            );
          },
        );
      },
    );

    // =====================================================
    // VERSION ARCHIVE
    // =====================================================

    describe(
      'archive',
      () => {
        it(
          'archives a version while the parent set is active',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,
                archived_at:
                  null,
              });

            versionFindFirstMock
              .mockResolvedValueOnce({
                id: 10n,
                survey_id: 1n,
                status:
                  'DRAFT',

                _count: {
                  evaluations: 0,

                  evaluation_participants:
                    0,

                  assessment_drafts:
                    0,

                  responses: 0,
                },
              })
              .mockResolvedValueOnce({
                id: 10n,
                status:
                  'DRAFT',
              });

            versionUpdateMock
              .mockResolvedValue({
                id: 10n,
                status:
                  'ARCHIVED',
              });

            const result =
              await service.archive(
                1n,
                10n,
              );

            expect(
              result.status,
            ).toBe(
              'ARCHIVED',
            );

            expect(
              versionUpdateMock,
            ).toHaveBeenCalledWith({
              where: {
                id: 10n,
              },

              data: {
                status:
                  'ARCHIVED',
              },
            });
          },
        );

        it(
          'rejects version archive when the whole set is archived',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,

                archived_at:
                  new Date(),
              });

            await expect(
              service.archive(
                1n,
                10n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              versionUpdateMock,
            ).not.toHaveBeenCalled();
          },
        );
      },
    );

    // =====================================================
    // VERSION DELETE
    // =====================================================

    describe(
      'remove',
      () => {
        it(
          'deletes an unused version from an active set',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,
                archived_at:
                  null,
              });

            versionFindFirstMock
              .mockResolvedValueOnce({
                id: 10n,
                survey_id: 1n,
                status:
                  'DRAFT',

                _count: {
                  evaluations: 0,

                  evaluation_participants:
                    0,

                  assessment_drafts:
                    0,

                  responses: 0,
                },
              })
              .mockResolvedValueOnce({
                id: 10n,
                status:
                  'DRAFT',

                _count: {
                  evaluations: 0,

                  evaluation_participants:
                    0,

                  assessment_drafts:
                    0,

                  responses: 0,
                },
              });

            questionFindManyMock
              .mockResolvedValue([
                {
                  id: 100n,
                },
              ]);

            optionDeleteManyMock
              .mockResolvedValue({
                count: 2,
              });

            questionDeleteManyMock
              .mockResolvedValue({
                count: 1,
              });

            versionDeleteMock
              .mockResolvedValue({
                id: 10n,
              });

            await service.remove(
              1n,
              10n,
            );

            expect(
              optionDeleteManyMock,
            ).toHaveBeenCalled();

            expect(
              questionDeleteManyMock,
            ).toHaveBeenCalledWith({
              where: {
                survey_version_id:
                  10n,
              },
            });

            expect(
              versionDeleteMock,
            ).toHaveBeenCalledWith({
              where: {
                id: 10n,
              },
            });
          },
        );

        it(
          'rejects deletion when the whole set is archived',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,

                archived_at:
                  new Date(),
              });

            await expect(
              service.remove(
                1n,
                10n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              versionDeleteMock,
            ).not.toHaveBeenCalled();
          },
        );
      },
    );
  },
);