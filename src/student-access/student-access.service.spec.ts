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

    start_at: new Date(now.getTime() - 60_000),

    end_at: new Date(now.getTime() + 60_000),

    survey_version_id: BigInt(3),

    course_offering_id: BigInt(1),

    course_offerings: {
      section_code: 'A',

      courses: {
        course_code: 'AMS401',
        course_name: 'Data Science',
      },

      semesters: {
        semester_name: 'Semester 1',
        academic_year_id: BigInt(10),

        academic_years: {
          id: BigInt(10),
          name: '2026-2027',
          start_year: 2026,
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
    });

    it('should fall back to the evaluation base version for a historical participant with no pinned version', async () => {
      participantFindFirstMock.mockResolvedValue({
        ...participantResult,

        survey_version_id: null,
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
    });
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
