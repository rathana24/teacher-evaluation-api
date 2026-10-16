import { jest } from '@jest/globals';

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { StudentAccessService } from './student-access.service';

describe('StudentAccessService', () => {
  let service: StudentAccessService;

  const evaluationFindUniqueMock = jest.fn<() => Promise<any>>();

  const participantFindManyMock = jest.fn<() => Promise<any[]>>();

  const participantFindFirstMock = jest.fn<() => Promise<any>>();

  const enrollmentFindFirstMock = jest.fn<() => Promise<any>>();

  const questionsFindManyMock = jest.fn<() => Promise<any[]>>();

  const studentFindFirstMock = jest.fn<() => Promise<any>>();
  const prismaMock: any = {
    students: { findFirst: studentFindFirstMock },
    evaluations: {
      findUnique: evaluationFindUniqueMock,
    },

    evaluation_participants: {
      findMany: participantFindManyMock,

      findFirst: participantFindFirstMock,
    },

    enrollments: {
      findFirst: enrollmentFindFirstMock,
    },

    questions: {
      findMany: questionsFindManyMock,
    },
  };

  const now = new Date();

  const evaluationResult = {
    id: BigInt(50),
    status: 'OPEN',

    start_at: new Date(now.getTime() - 3_600_000),

    end_at: new Date(now.getTime() + 3_600_000),

    survey_version_id: BigInt(3),

    course_offering_id: BigInt(1),

    course_offerings: {
      section_code: 'A',
      class_type: 'TP',

      courses: {
        course_code: 'AMS401',
        course_name: 'Data Science',
      },

      semesters: {
        semester_name: 'Semester 1',
        semester_number: 2,
        academic_year_id: BigInt(10),

        academic_years: {
          id: BigInt(10),
          name: '2026-2027',
          start_year: 2026,
          is_active: true,
        },
      },

      users: {
        full_name: 'Lecturer One',
      },
    },

    survey_versions: {
      version_no: 1,

      surveys: {
        title: 'Teaching Evaluation',
      },
    },
  };

  const participantResult = {
    id: BigInt(100),
    evaluation_id: BigInt(50),
    student_id: BigInt(21),

    survey_version_id: BigInt(5),

    survey_versions: {
      version_no: 2,
      surveys: { title: 'Teaching Evaluation' },
    },

    has_submitted: false,
    submitted_at: null,

    created_at: new Date('2026-10-01T00:00:00.000Z'),
  };

  const questionResult = {
    id: BigInt(200),

    question_text: 'The lecturer explains clearly.',

    question_text_km: null,

    question_type: 'RATING',

    category: 'Teaching Quality',

    is_required: true,

    min_rating: 1,
    max_rating: 5,

    display_order: 1,

    question_options: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentAccessService,

        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<StudentAccessService>(StudentAccessService);

    studentFindFirstMock.mockResolvedValue({
      generation_id: 1n,
      student_generations: {
        starting_year_level: 1,
        entry_academic_year: { start_year: 2026 },
      },
      student_academic_records: [
        {
          academic_year_id: 10n,
          academic_years: { start_year: 2026 },
          year_level: 1,
          major_id: 1n,
          class_group: 'A',
          progression_action: 'NORMAL',
        },
      ],
    });
    evaluationFindUniqueMock.mockResolvedValue(evaluationResult);

    participantFindManyMock.mockResolvedValue([]);

    participantFindFirstMock.mockResolvedValue(participantResult);

    enrollmentFindFirstMock.mockResolvedValue({
      id: BigInt(300),
    });

    questionsFindManyMock.mockResolvedValue([questionResult]);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSurvey', () => {
    it('should use the participant survey version when one is pinned', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,

        survey_version_id: BigInt(5),
      });

      const result = await service.getSurvey(BigInt(50), BigInt(21));

      expect(questionsFindManyMock).toHaveBeenCalledWith({
        where: {
          survey_version_id: BigInt(5),
        },

        select: expect.any(Object),

        orderBy: {
          display_order: 'asc',
        },
      });

      expect(result.survey_version_id).toBe(BigInt(5));

      expect(result.participant_survey_version_id).toBe(BigInt(5));

      expect(result.questions).toEqual([questionResult]);

      expect(result.evaluation.survey).toEqual({
        title: 'Teaching Evaluation',
        version_no: 2,
      });
      expect(result.evaluation).toHaveProperty('assigned_survey', {
        title: 'Teaching Evaluation',
        version_no: 1,
      });
    });

    it('should fall back to the evaluation base version for a historical participant with no pinned version', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,

        survey_version_id: null,
        survey_versions: null,
      });

      const result = await service.getSurvey(BigInt(50), BigInt(21));

      expect(questionsFindManyMock).toHaveBeenCalledWith({
        where: {
          survey_version_id: BigInt(3),
        },

        select: expect.any(Object),

        orderBy: {
          display_order: 'asc',
        },
      });

      expect(result.survey_version_id).toBe(BigInt(3));

      expect(result.participant_survey_version_id).toBeNull();
      expect(result.evaluation.survey).toEqual({
        title: 'Teaching Evaluation',
        version_no: 1,
      });
      expect(result.evaluation).toHaveProperty(
        'assigned_survey',
        result.evaluation.survey,
      );
    });

    it('keeps metadata unchanged when the participant is pinned to the base version', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,
        survey_version_id: evaluationResult.survey_version_id,
        survey_versions: evaluationResult.survey_versions,
      });

      const result = await service.getSurvey(50n, 21n);

      expect(result.survey_version_id).toBe(3n);
      expect(result.evaluation.survey).toEqual({
        title: 'Teaching Evaluation',
        version_no: 1,
      });
      expect(result.evaluation).toHaveProperty(
        'assigned_survey',
        result.evaluation.survey,
      );
    });
  });

  describe('student list questionnaire metadata', () => {
    it('shows the participant version in available evaluations without exposing internal IDs', async () => {
      participantFindManyMock.mockResolvedValue([
        {
          ...participantResult,
          evaluations: evaluationResult,
        },
      ]);

      const [result] = await service.findAvailable(21n);

      expect(result.survey.version_no).toBe(2);
      expect(result).toHaveProperty('assigned_survey.version_no', 1);
      expect(result).not.toHaveProperty('survey_version_id');
      expect(result).not.toHaveProperty('course_offering_id');
      expect(result.survey).not.toHaveProperty('id');
    });

    it('uses the base descriptor in available evaluations for a legacy null pin', async () => {
      participantFindManyMock.mockResolvedValue([
        {
          ...participantResult,
          survey_version_id: null,
          survey_versions: null,
          evaluations: evaluationResult,
        },
      ]);

      const [result] = await service.findAvailable(21n);

      expect(result.survey.version_no).toBe(1);
      expect(result).toHaveProperty('assigned_survey', result.survey);
    });

    it.each([false, true])(
      'history keeps the pinned descriptor when submitted=%s',
      async (submitted) => {
        const submittedAt = submitted
          ? new Date('2026-10-01T00:00:00.000Z')
          : null;
        participantFindManyMock.mockResolvedValue([
          {
            ...participantResult,
            has_submitted: submitted,
            submitted_at: submittedAt,
            evaluations: evaluationResult,
          },
        ]);

        const [result] = await service.findHistory(21n);

        expect(result.survey).toEqual({
          title: 'Teaching Evaluation',
          version_no: 2,
        });
        expect(result).toHaveProperty('assigned_survey.version_no', 1);
        expect(result.has_submitted).toBe(submitted);
        expect(result.submitted_at).toBe(submittedAt);
        expect(result.history_status).toBe(
          submitted ? 'Completed' : 'Not Started',
        );
        expect(result).not.toHaveProperty('survey_version_id');
        expect(evaluationResult.survey_versions.version_no).toBe(1);
      },
    );

    it('retains legacy history metadata when no participant version was stored', async () => {
      participantFindManyMock.mockResolvedValue([
        {
          ...participantResult,
          survey_version_id: null,
          survey_versions: null,
          evaluations: evaluationResult,
        },
      ]);

      const [result] = await service.findHistory(21n);

      expect(result.survey.version_no).toBe(1);
      expect(result).toHaveProperty('assigned_survey', result.survey);
    });
  });

  describe('student academic display metadata', () => {
    const read = async (endpoint: string) => {
      if (endpoint === 'survey')
        return (await service.getSurvey(50n, 21n)).evaluation;
      participantFindManyMock.mockResolvedValue([
        {
          ...participantResult,
          evaluations: evaluationResult,
        },
      ]);
      const rows =
        endpoint === 'available'
          ? await service.findAvailable(21n)
          : await service.findHistory(21n);
      return rows[0];
    };

    it.each(['available', 'history', 'survey'])(
      '%s returns stored numeric semester and active-year metadata rather than inferring from the label',
      async (endpoint) => {
        const result = await read(endpoint);

        expect(result.class_type).toBe('TP');
        expect(result.semester).toEqual({
          name: 'Semester 1',
          semester_number: 2,
          academic_year_id: 10n,
          academic_year: '2026-2027',
          start_year: 2026,
          is_active: true,
        });
        expect(result.course).toEqual({ code: 'AMS401', name: 'Data Science' });
        expect(result.survey.version_no).toBe(2);
        expect(result.assigned_survey.version_no).toBe(1);
        expect(result).not.toHaveProperty('student_id');
        expect(result).not.toHaveProperty('participant_id');
      },
    );

    it.each(['available', 'survey'])(
      '%s preserves null offering/semester classification and false active-year status',
      async (endpoint) => {
        const legacy = {
          ...evaluationResult,
          course_offerings: {
            ...evaluationResult.course_offerings,
            class_type: null,
            semesters: {
              ...evaluationResult.course_offerings.semesters,
              semester_number: null,
              academic_years: {
                ...evaluationResult.course_offerings.semesters.academic_years,
                is_active: false,
              },
            },
          },
        };
        evaluationFindUniqueMock.mockResolvedValue(legacy);
        participantFindManyMock.mockResolvedValue([
          {
            ...participantResult,
            evaluations: legacy,
          },
        ]);
        const result =
          endpoint === 'available'
            ? (await service.findAvailable(21n))[0]
            : (await service.getSurvey(50n, 21n)).evaluation;

        expect(result.class_type).toBeNull();
        expect(result.semester.semester_number).toBeNull();
        expect(result.semester.start_year).toBe(2026);
        expect(result.semester.is_active).toBe(false);
      },
    );

    it('history preserves unknown stored year/classification without changing completion', async () => {
      const submittedAt = new Date('2026-10-01T00:00:00.000Z');
      participantFindManyMock.mockResolvedValue([
        {
          ...participantResult,
          has_submitted: true,
          submitted_at: submittedAt,
          evaluations: {
            ...evaluationResult,
            course_offerings: {
              ...evaluationResult.course_offerings,
              class_type: null,
              semesters: {
                ...evaluationResult.course_offerings.semesters,
                semester_number: null,
                academic_years: {
                  ...evaluationResult.course_offerings.semesters.academic_years,
                  start_year: null,
                  is_active: false,
                },
              },
            },
          },
        },
      ]);

      const [result] = await service.findHistory(21n);

      expect(result.class_type).toBeNull();
      expect(result.semester).toMatchObject({
        semester_number: null,
        start_year: null,
        is_active: false,
        academic_year_id: 10n,
        academic_year: '2026-2027',
      });
      expect(result.has_submitted).toBe(true);
      expect(result.submitted_at).toBe(submittedAt);
      expect(result.history_status).toBe('Completed');
      expect(result.survey.version_no).toBe(2);
      expect(result.assigned_survey.version_no).toBe(1);
    });
  });

  describe('current answerability', () => {
    const placementStudent = (
      action = 'NORMAL',
      group: string | null = 'A',
    ) => ({
      generation_id: 1n,
      student_generations: {
        starting_year_level: 1,
        entry_academic_year: { start_year: 2026 },
      },
      student_academic_records: [
        {
          academic_year_id: 10n,
          academic_years: { start_year: 2026 },
          year_level: 1,
          major_id: 1n,
          class_group: group,
          progression_action: action,
        },
      ],
    });

    it.each(['available', 'survey'])(
      '%s exposes allowed answerability',
      async (endpoint) => {
        participantFindManyMock.mockResolvedValue([
          { ...participantResult, evaluations: evaluationResult },
        ]);
        const result =
          endpoint === 'available'
            ? (await service.findAvailable(21n))[0]
            : (await service.getSurvey(50n, 21n)).evaluation;
        expect(result).toMatchObject({
          answerable: true,
          answerability_reason: null,
        });
      },
    );

    const cases = [
      {
        name: 'unavailable bounded year (defensive unit fixture)',
        student: {
          ...placementStudent(),
          student_academic_records: [
            {
              ...placementStudent().student_academic_records[0],
              year_level: 6,
            },
          ],
        },
        reason: 'YEAR_LEVEL_UNAVAILABLE',
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 403,
      },
      {
        name: 'eligible',
        student: placementStudent(),
        reason: null,
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 200,
      },
      {
        name: 'inactive or missing student profile',
        student: null,
        reason: 'INACTIVE_STUDENT',
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 403,
      },
      {
        name: 'paused',
        student: placementStudent('PAUSE'),
        reason: 'PAUSED',
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 403,
      },
      {
        name: 'missing yearly group',
        student: placementStudent('NORMAL', null),
        reason: 'MISSING_YEARLY_GROUP',
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 403,
      },
      {
        name: 'missing annual placement',
        student: { ...placementStudent(), student_academic_records: [] },
        reason: 'MISSING_YEARLY_GROUP',
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 403,
      },
      {
        name: 'unresolved chronology',
        student: {
          ...placementStudent('REPEAT'),
          student_academic_records: [
            {
              ...placementStudent('REPEAT').student_academic_records[0],
              academic_years: { start_year: null },
            },
          ],
        },
        reason: 'PROGRESSION_CHRONOLOGY_UNAVAILABLE',
        history: 'Not Started',
        evaluation: {},
        submitted: false,
        http: 403,
      },
      {
        name: 'future schedule',
        student: placementStudent(),
        reason: 'EVALUATION_NOT_STARTED',
        history: 'Upcoming',
        evaluation: {
          start_at: new Date(now.getTime() + 3_600_000),
          end_at: new Date(now.getTime() + 7_200_000),
        },
        submitted: false,
        http: 409,
      },
      {
        name: 'ended schedule',
        student: placementStudent(),
        reason: 'EVALUATION_ENDED',
        history: 'Closed',
        evaluation: {
          start_at: new Date(now.getTime() - 7_200_000),
          end_at: new Date(now.getTime() - 3_600_000),
        },
        submitted: false,
        http: 409,
      },
      ...['DRAFT', 'CLOSED'].map((status) => ({
        name: status,
        student: placementStudent(),
        reason: 'EVALUATION_NOT_OPEN',
        history: 'Closed',
        evaluation: { status },
        submitted: false,
        http: 409,
      })),
      ...['start_at', 'end_at'].map((field) => ({
        name: `missing ${field}`,
        student: placementStudent(),
        reason: 'EVALUATION_UNSCHEDULED',
        history: 'Closed',
        evaluation: { [field]: null },
        submitted: false,
        http: 409,
      })),
      {
        name: 'already submitted',
        student: placementStudent(),
        reason: 'ALREADY_SUBMITTED',
        history: 'Completed',
        evaluation: {},
        submitted: true,
        http: 409,
      },
      {
        name: 'completed while paused',
        student: placementStudent('PAUSE'),
        reason: 'PAUSED',
        history: 'Completed',
        evaluation: {},
        submitted: true,
        http: 403,
      },
    ];

    it.each(cases)(
      'history and access agree for $name without changing historical status',
      async (item) => {
        const evaluation = { ...evaluationResult, ...item.evaluation };
        const participant = {
          ...participantResult,
          has_submitted: item.submitted,
          submitted_at: item.submitted
            ? new Date('2026-10-01T00:00:00.000Z')
            : null,
        };
        participantFindManyMock.mockResolvedValue([
          { ...participant, evaluations: evaluation },
        ]);
        participantFindFirstMock.mockResolvedValue(participant);
        evaluationFindUniqueMock.mockResolvedValue(evaluation);
        studentFindFirstMock.mockResolvedValue(item.student);

        const [history] = await service.findHistory(21n);
        expect(history).toMatchObject({
          answerable: item.reason === null,
          answerability_reason: item.reason,
          history_status: item.history,
          has_submitted: item.submitted,
          survey: { version_no: 2 },
          assigned_survey: { version_no: 1 },
        });
        expect(history.submitted_at).toBe(participant.submitted_at);
        expect(history).not.toHaveProperty('student_id');
        expect(studentFindFirstMock).toHaveBeenCalledTimes(1);
        if (item.http === 200) {
          await expect(
            service.getAnswerableEvaluation(50n, 21n),
          ).resolves.toHaveProperty('effectiveSurveyVersionId', 5n);
        } else {
          await expect(
            service.getAnswerableEvaluation(50n, 21n),
          ).rejects.toMatchObject({ status: item.http });
        }
      },
    );

    it('history computes each evaluation decision with one placement lookup', async () => {
      participantFindManyMock.mockResolvedValue([
        { ...participantResult, evaluations: evaluationResult },
        {
          ...participantResult,
          evaluations: { ...evaluationResult, id: 51n, status: 'CLOSED' },
        },
      ]);
      const history = await service.findHistory(21n);
      expect(history).toMatchObject([
        { id: 50n, answerable: true, answerability_reason: null },
        {
          id: 51n,
          answerable: false,
          answerability_reason: 'EVALUATION_NOT_OPEN',
        },
      ]);
      expect(studentFindFirstMock).toHaveBeenCalledTimes(1);
      expect(evaluationFindUniqueMock).not.toHaveBeenCalled();
      expect(participantFindFirstMock).not.toHaveBeenCalled();
      expect(enrollmentFindFirstMock).not.toHaveBeenCalled();
    });

    it.each(['NORMAL', 'RESUME'])(
      'a later %s placement respects persistent pause',
      async (action) => {
        const student = placementStudent(action);
        student.student_generations.entry_academic_year.start_year = 2025;
        student.student_academic_records.unshift({
          ...placementStudent('PAUSE').student_academic_records[0],
          academic_year_id: 9n,
          academic_years: { start_year: 2025 },
        });
        studentFindFirstMock.mockResolvedValue(student);
        participantFindManyMock.mockResolvedValue([
          { ...participantResult, evaluations: evaluationResult },
        ]);
        const [history] = await service.findHistory(21n);
        expect(history).toMatchObject({
          answerable: action === 'RESUME',
          answerability_reason: action === 'RESUME' ? null : 'PAUSED',
          history_status: 'Not Started',
        });
      },
    );

    it.each(['start', 'end'])(
      'the exact %s boundary agrees with survey access',
      async (boundary) => {
        const instant = new Date('2026-10-15T00:00:00.000Z');
        jest.useFakeTimers().setSystemTime(instant);
        try {
          const evaluation = {
            ...evaluationResult,
            start_at:
              boundary === 'start'
                ? instant
                : new Date(instant.getTime() - 60_000),
            end_at:
              boundary === 'end'
                ? instant
                : new Date(instant.getTime() + 60_000),
          };
          evaluationFindUniqueMock.mockResolvedValue(evaluation);
          participantFindManyMock.mockResolvedValue([
            { ...participantResult, evaluations: evaluation },
          ]);
          const [history] = await service.findHistory(21n);
          expect(history).toMatchObject({
            answerable: boundary === 'start',
            answerability_reason:
              boundary === 'start' ? null : 'EVALUATION_ENDED',
          });
          if (boundary === 'start')
            await expect(service.getSurvey(50n, 21n)).resolves.toHaveProperty(
              'evaluation.answerable',
              true,
            );
          else
            await expect(service.getSurvey(50n, 21n)).rejects.toThrow(
              'This evaluation is not open',
            );
        } finally {
          jest.useRealTimers();
        }
      },
    );
  });

  describe('getAnswerableEvaluation', () => {
    it('should return the participant survey version as the effective version', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,

        survey_version_id: BigInt(5),
      });

      const result = await service.getAnswerableEvaluation(
        BigInt(50),
        BigInt(21),
      );

      expect(result.effectiveSurveyVersionId).toBe(BigInt(5));

      expect(result.participant.survey_version_id).toBe(BigInt(5));
    });

    it('should use the evaluation base version when the participant version is null', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,

        survey_version_id: null,
      });

      const result = await service.getAnswerableEvaluation(
        BigInt(50),
        BigInt(21),
      );

      expect(result.effectiveSurveyVersionId).toBe(BigInt(3));
    });

    it('should reject a student who is not an evaluation participant', async () => {
      participantFindFirstMock.mockResolvedValue(null);

      await expect(
        service.getAnswerableEvaluation(BigInt(50), BigInt(21)),
      ).rejects.toThrow(
        new ForbiddenException('You are not eligible for this evaluation'),
      );
    });

    it('should reject a participant who is no longer enrolled in the course offering', async () => {
      enrollmentFindFirstMock.mockResolvedValue(null);

      await expect(
        service.getAnswerableEvaluation(BigInt(50), BigInt(21)),
      ).rejects.toThrow(
        new ForbiddenException('You are not eligible for this evaluation'),
      );
    });

    it('should reject an evaluation that is not open', async () => {
      evaluationFindUniqueMock.mockResolvedValue({
        ...evaluationResult,

        status: 'CLOSED',
      });

      await expect(
        service.getAnswerableEvaluation(BigInt(50), BigInt(21)),
      ).rejects.toThrow(new ConflictException('This evaluation is not open'));
    });

    it('should reject an evaluation that has not started yet', async () => {
      evaluationFindUniqueMock.mockResolvedValue({
        ...evaluationResult,

        start_at: new Date(Date.now() + 60_000),

        end_at: new Date(Date.now() + 120_000),
      });

      await expect(
        service.getAnswerableEvaluation(BigInt(50), BigInt(21)),
      ).rejects.toThrow(new ConflictException('This evaluation is not open'));
    });

    it('should reject an evaluation whose schedule has ended', async () => {
      evaluationFindUniqueMock.mockResolvedValue({
        ...evaluationResult,

        start_at: new Date(Date.now() - 120_000),

        end_at: new Date(Date.now() - 60_000),
      });

      await expect(
        service.getAnswerableEvaluation(BigInt(50), BigInt(21)),
      ).rejects.toThrow(new ConflictException('This evaluation is not open'));
    });

    it('should reject a participant who already submitted', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,

        has_submitted: true,

        submitted_at: new Date(),
      });

      await expect(
        service.getAnswerableEvaluation(BigInt(50), BigInt(21)),
      ).rejects.toThrow(
        new ConflictException('You have already submitted this evaluation'),
      );
    });

    it('should reject an unknown evaluation', async () => {
      evaluationFindUniqueMock.mockResolvedValue(null);

      await expect(
        service.getAnswerableEvaluation(BigInt(999), BigInt(21)),
      ).rejects.toThrow(new NotFoundException('Evaluation not found'));

      expect(participantFindFirstMock).not.toHaveBeenCalled();

      expect(enrollmentFindFirstMock).not.toHaveBeenCalled();
    });
  });

  describe('getSubmissionStatus', () => {
    it('should return the participant submission status and pinned version', async () => {
      participantFindFirstMock.mockResolvedValue({
        survey_version_id: BigInt(5),

        has_submitted: false,

        submitted_at: null,
      });

      const result = await service.getSubmissionStatus(BigInt(50), BigInt(21));

      expect(result).toEqual({
        evaluation_id: BigInt(50),

        survey_version_id: BigInt(5),

        has_submitted: false,

        submitted_at: null,
      });
    });

    it('should reject submission-status access for a non-participant', async () => {
      participantFindFirstMock.mockResolvedValue(null);

      await expect(
        service.getSubmissionStatus(BigInt(50), BigInt(21)),
      ).rejects.toThrow(
        new ForbiddenException('You are not eligible for this evaluation'),
      );
    });
  });
});
