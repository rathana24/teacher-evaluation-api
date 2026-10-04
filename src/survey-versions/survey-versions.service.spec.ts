import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { SurveyVersionsService } from './survey-versions.service';
import { PrismaService } from '../prisma/prisma.service';

// =========================================================
// MOCKS
// =========================================================

const surveyFindUniqueMock =
  jest.fn<(args: any) => Promise<any>>();

const versionFindManyMock =
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

const evaluationFindManyMock =
  jest.fn<(args: any) => Promise<any>>();

const participantCountMock =
  jest.fn<(args: any) => Promise<any>>();

const participantUpdateManyMock =
  jest.fn<(args: any) => Promise<any>>();

const transactionMock =
  jest.fn<
    (
      callback: (tx: any) => Promise<any>,
    ) => Promise<any>
  >();

// =========================================================
// TRANSACTION CLIENT
// =========================================================

const tx = {
  survey_versions: {
    findFirst:
      versionFindFirstMock,

    findUniqueOrThrow:
      versionFindUniqueOrThrowMock,

    create:
      versionCreateMock,

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
      evaluationFindManyMock,
  },

  evaluation_participants: {
    count:
      participantCountMock,

    updateMany:
      participantUpdateManyMock,
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
      versionFindManyMock,

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
      evaluationFindManyMock,
  },

  evaluation_participants: {
    count:
      participantCountMock,

    updateMany:
      participantUpdateManyMock,
  },

  $transaction:
    transactionMock,
};

// =========================================================
// TESTS
// =========================================================

describe(
  'SurveyVersionsService',
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
    // FIND ALL
    // =====================================================

    describe(
      'findAllForSurvey',
      () => {
        it(
          'returns versions when the survey exists',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue({
                id: 1n,
              });

            versionFindManyMock
              .mockResolvedValue([
                {
                  id: 10n,
                  version_no: 1,
                },
              ]);

            const result =
              await service.findAllForSurvey(
                1n,
              );

            expect(
              result,
            ).toEqual([
              {
                id: 10n,
                version_no: 1,
              },
            ]);

            expect(
              versionFindManyMock,
            ).toHaveBeenCalledWith(
              expect.objectContaining({
                where: {
                  survey_id: 1n,
                },
              }),
            );
          },
        );

        it(
          'throws when survey does not exist',
          async () => {
            surveyFindUniqueMock
              .mockResolvedValue(
                null,
              );

            await expect(
              service.findAllForSurvey(
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
    // FIND ONE
    // =====================================================

    describe(
      'findOne',
      () => {
        it(
          'returns a version belonging to the survey',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
                id: 10n,
                survey_id: 1n,
                version_no: 1,
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

            const result =
              await service.findOne(
                1n,
                10n,
              );

            expect(
              result.id,
            ).toBe(10n);

            expect(
              versionFindFirstMock,
            ).toHaveBeenCalledWith(
              expect.objectContaining({
                where: {
                  id: 10n,
                  survey_id: 1n,
                },
              }),
            );
          },
        );

        it(
          'throws when version does not belong to survey',
          async () => {
            versionFindFirstMock
              .mockResolvedValue(
                null,
              );

            await expect(
              service.findOne(
                1n,
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
    // APPLY TO UNFINISHED
    // =====================================================

    describe(
      'applyToUnfinished',
      () => {
        beforeEach(() => {
          surveyFindUniqueMock
            .mockResolvedValue({
              id: 1n,
            });
        });

        it(
          'moves only safe unfinished participants and locks the target version',
          async () => {
            /*
             * First findFirst:
             * pre-transaction validation.
             *
             * Second findFirst:
             * transaction re-check.
             */
            versionFindFirstMock
              .mockResolvedValueOnce({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 5,
                },
              })
              .mockResolvedValueOnce({
                id: 20n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 5,
                },
              });

            evaluationFindManyMock
              .mockResolvedValue([
                {
                  id: 100n,
                },
                {
                  id: 101n,
                },
              ]);

            /*
             * Count call order:
             *
             * 1. submitted
             * 2. draft holders
             * 3. already target
             */
            participantCountMock
              .mockResolvedValueOnce(
                4,
              )
              .mockResolvedValueOnce(
                2,
              )
              .mockResolvedValueOnce(
                1,
              );

            participantUpdateManyMock
              .mockResolvedValue({
                count: 7,
              });

            versionUpdateManyMock
              .mockResolvedValue({
                count: 1,
              });

            const result =
              await service.applyToUnfinished(
                1n,
                20n,
              );

            expect(
              result,
            ).toEqual({
              survey_id:
                '1',

              survey_version_id:
                '20',

              version_no:
                2,

              status:
                'LOCKED',

              eligible_evaluations:
                2,

              updated_participants:
                7,

              skipped_submitted:
                4,

              skipped_with_draft:
                2,

              already_on_target:
                1,
            });

            expect(
              evaluationFindManyMock,
            ).toHaveBeenCalledWith({
              where: {
                status: {
                  in: [
                    'DRAFT',
                    'OPEN',
                  ],
                },

                survey_versions: {
                  survey_id:
                    1n,
                },
              },

              select: {
                id: true,
              },
            });

            /*
             * Verify the actual migration is restricted
             * to unfinished participants with NO draft.
             */
            expect(
              participantUpdateManyMock,
            ).toHaveBeenCalledWith({
              where: {
                evaluation_id: {
                  in: [
                    100n,
                    101n,
                  ],
                },

                has_submitted:
                  false,

                assessment_drafts: {
                  is: null,
                },

                NOT: {
                  survey_version_id:
                    20n,
                },
              },

              data: {
                survey_version_id:
                  20n,
              },
            });

            /*
             * The target version must become immutable.
             */
            expect(
              versionUpdateManyMock,
            ).toHaveBeenCalledWith(
              expect.objectContaining({
                where: {
                  id: 20n,
                  survey_id: 1n,
                  status:
                    'DRAFT',
                },

                data:
                  expect.objectContaining({
                    status:
                      'LOCKED',
                  }),
              }),
            );
          },
        );

        it(
          'does not update participants when there are no eligible evaluations',
          async () => {
            versionFindFirstMock
              .mockResolvedValueOnce({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 3,
                },
              })
              .mockResolvedValueOnce({
                id: 20n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 3,
                },
              });

            evaluationFindManyMock
              .mockResolvedValue(
                [],
              );

            versionUpdateManyMock
              .mockResolvedValue({
                count: 1,
              });

            const result =
              await service.applyToUnfinished(
                1n,
                20n,
              );

            expect(
              result.eligible_evaluations,
            ).toBe(0);

            expect(
              result.updated_participants,
            ).toBe(0);

            expect(
              participantUpdateManyMock,
            ).not.toHaveBeenCalled();

            expect(
              participantCountMock,
            ).not.toHaveBeenCalled();

            expect(
              versionUpdateManyMock,
            ).toHaveBeenCalled();
          },
        );

        it(
          'rejects a target version from another survey',
          async () => {
            versionFindFirstMock
              .mockResolvedValue(
                null,
              );

            await expect(
              service.applyToUnfinished(
                1n,
                20n,
              ),
            ).rejects.toBeInstanceOf(
              NotFoundException,
            );

            expect(
              transactionMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'rejects a non-DRAFT target version',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'LOCKED',
                locked_at:
                  new Date(),

                _count: {
                  questions: 5,
                },
              });

            await expect(
              service.applyToUnfinished(
                1n,
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              transactionMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'rejects a target version with no questions',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 0,
                },
              });

            await expect(
              service.applyToUnfinished(
                1n,
                20n,
              ),
            ).rejects.toBeInstanceOf(
              BadRequestException,
            );

            expect(
              transactionMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'rejects when target version changes before transaction reconciliation',
          async () => {
            versionFindFirstMock
              .mockResolvedValueOnce({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 5,
                },
              })
              .mockResolvedValueOnce({
                id: 20n,
                version_no: 2,
                status:
                  'LOCKED',
                locked_at:
                  new Date(),

                _count: {
                  questions: 5,
                },
              });

            await expect(
              service.applyToUnfinished(
                1n,
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );

            expect(
              participantUpdateManyMock,
            ).not.toHaveBeenCalled();
          },
        );

        it(
          'rejects when target version cannot be locked after reconciliation',
          async () => {
            versionFindFirstMock
              .mockResolvedValueOnce({
                id: 20n,
                survey_id: 1n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 5,
                },
              })
              .mockResolvedValueOnce({
                id: 20n,
                version_no: 2,
                status:
                  'DRAFT',
                locked_at:
                  null,

                _count: {
                  questions: 5,
                },
              });

            evaluationFindManyMock
              .mockResolvedValue([
                {
                  id: 100n,
                },
              ]);

            participantCountMock
              .mockResolvedValueOnce(
                0,
              )
              .mockResolvedValueOnce(
                0,
              )
              .mockResolvedValueOnce(
                0,
              );

            participantUpdateManyMock
              .mockResolvedValue({
                count: 1,
              });

            versionUpdateManyMock
              .mockResolvedValue({
                count: 0,
              });

            await expect(
              service.applyToUnfinished(
                1n,
                20n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );
          },
        );
      },
    );

    // =====================================================
    // ARCHIVE
    // =====================================================

    describe(
      'archive',
      () => {
        it(
          'archives a version',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
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
          'rejects an already archived version',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
                id: 10n,
                survey_id: 1n,
                status:
                  'ARCHIVED',

                _count: {
                  evaluations: 0,
                  evaluation_participants:
                    0,
                  assessment_drafts:
                    0,
                  responses: 0,
                },
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
    // DELETE
    // =====================================================

    describe(
      'remove',
      () => {
        it(
          'deletes an unused DRAFT version',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
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
          'rejects deleting a LOCKED version',
          async () => {
            versionFindFirstMock
              .mockResolvedValue({
                id: 10n,
                survey_id: 1n,
                status:
                  'LOCKED',

                _count: {
                  evaluations: 0,
                  evaluation_participants:
                    0,
                  assessment_drafts:
                    0,
                  responses: 0,
                },
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
              transactionMock,
            ).not.toHaveBeenCalled();
          },
        );

        it.each([
          [
            'evaluation',
            {
              evaluations: 1,
              evaluation_participants:
                0,
              assessment_drafts:
                0,
              responses: 0,
            },
          ],

          [
            'participant',
            {
              evaluations: 0,
              evaluation_participants:
                1,
              assessment_drafts:
                0,
              responses: 0,
            },
          ],

          [
            'draft',
            {
              evaluations: 0,
              evaluation_participants:
                0,
              assessment_drafts:
                1,
              responses: 0,
            },
          ],

          [
            'response',
            {
              evaluations: 0,
              evaluation_participants:
                0,
              assessment_drafts:
                0,
              responses: 1,
            },
          ],
        ])(
          'rejects deleting a version referenced by %s history',
          async (
            _label,
            counts,
          ) => {
            versionFindFirstMock
              .mockResolvedValue({
                id: 10n,
                survey_id: 1n,
                status:
                  'DRAFT',

                _count:
                  counts,
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
              transactionMock,
            ).not.toHaveBeenCalled();
          },
        );
      },
    );

    // =====================================================
    // EDITABILITY
    // =====================================================

    describe(
      'assertEditable',
      () => {
        it(
          'allows a completely unused DRAFT version',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                id: 10n,
                status:
                  'DRAFT',

                evaluations: [],

                _count: {
                  evaluation_participants:
                    0,
                  assessment_drafts:
                    0,
                  responses: 0,
                },
              });

            const result =
              await service.assertEditable(
                10n,
              );

            expect(
              result.id,
            ).toBe(10n);
          },
        );

        it(
          'rejects a LOCKED version',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                id: 10n,
                status:
                  'LOCKED',

                evaluations: [],

                _count: {
                  evaluation_participants:
                    0,
                  assessment_drafts:
                    0,
                  responses: 0,
                },
              });

            await expect(
              service.assertEditable(
                10n,
              ),
            ).rejects.toBeInstanceOf(
              ConflictException,
            );
          },
        );

        it(
          'rejects a DRAFT version used by a non-DRAFT evaluation',
          async () => {
            versionFindUniqueMock
              .mockResolvedValue({
                id: 10n,
                status:
                  'DRAFT',

                evaluations: [
                  {
                    id: 100n,
                  },
                ],

                _count: {
                  evaluation_participants:
                    0,
                  assessment_drafts:
                    0,
                  responses: 0,
                },
              });

            await expect(
              service.assertEditable(
                10n,
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
              responses: 0,
            },
          ],

          [
            'draft',
            {
              evaluation_participants:
                0,
              assessment_drafts:
                1,
              responses: 0,
            },
          ],

          [
            'response',
            {
              evaluation_participants:
                0,
              assessment_drafts:
                0,
              responses: 1,
            },
          ],
        ])(
          'rejects editing a version referenced by %s history',
          async (
            _label,
            counts,
          ) => {
            versionFindUniqueMock
              .mockResolvedValue({
                id: 10n,
                status:
                  'DRAFT',

                evaluations: [],

                _count:
                  counts,
              });

            await expect(
              service.assertEditable(
                10n,
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
  },
);