import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type EvaluationProgress = {
  active: {
    completed: number;
    assigned: number;
  };

  total: {
    completed: number;
    assigned: number;
  };
};

type ParticipantProgressRow = {
  student_id: bigint;
  has_submitted: boolean;

  evaluations: {
    id: bigint;
    status: 'DRAFT' | 'OPEN' | 'CLOSED';
    start_at: Date | null;
    end_at: Date | null;
  };
};

@Injectable()
export class StudentEvaluationProgressService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getProgressForUsers(
    userIds: bigint[],
    now: Date = new Date(),
  ): Promise<Map<bigint, EvaluationProgress>> {
    const uniqueUserIds = [
      ...new Set(userIds),
    ];

    const progressByUserId =
      new Map<bigint, EvaluationProgress>();

    /*
     * Every requested student starts at zero.
     *
     * Zero/zero here means that after checking the
     * participant assignments, the student genuinely
     * has no applicable assignments.
     */
    for (const userId of uniqueUserIds) {
      progressByUserId.set(
        userId,
        this.emptyProgress(),
      );
    }

    if (uniqueUserIds.length === 0) {
      return progressByUserId;
    }

    /*
     * evaluation_participants.student_id references
     * users.id, not students.id.
     *
     * Only published evaluations are relevant:
     * OPEN and CLOSED.
     *
     * DRAFT evaluations must never contribute to
     * either active or total progress.
     */
    const participants =
      await this.prisma.evaluation_participants.findMany({
        where: {
          student_id: {
            in: uniqueUserIds,
          },

          evaluations: {
            is: {
              status: {
                in: ['OPEN', 'CLOSED'],
              },
            },
          },
        },

        select: {
          student_id: true,
          has_submitted: true,

          evaluations: {
            select: {
              id: true,
              status: true,
              start_at: true,
              end_at: true,
            },
          },
        },
      });

    /*
     * The schema currently has:
     *
     * @@unique([evaluation_id, student_id])
     *
     * so one student should have at most one participant
     * row for one evaluation.
     *
     * We still keep a Set per user so progress remains
     * defensive and counts distinct evaluations only.
     */
    const seenEvaluationIdsByUser =
      new Map<bigint, Set<bigint>>();

    for (const participant of participants) {
      this.applyParticipant(
        participant as ParticipantProgressRow,
        now,
        progressByUserId,
        seenEvaluationIdsByUser,
      );
    }

    return progressByUserId;
  }

  async getProgressForUser(
    userId: bigint,
    now: Date = new Date(),
  ): Promise<EvaluationProgress> {
    const progressByUserId =
      await this.getProgressForUsers(
        [userId],
        now,
      );

    return (
      progressByUserId.get(userId) ??
      this.emptyProgress()
    );
  }

  private applyParticipant(
    participant: ParticipantProgressRow,
    now: Date,
    progressByUserId: Map<
      bigint,
      EvaluationProgress
    >,
    seenEvaluationIdsByUser: Map<
      bigint,
      Set<bigint>
    >,
  ): void {
    const progress =
      progressByUserId.get(
        participant.student_id,
      );

    /*
     * Ignore unexpected participant rows that do not
     * belong to one of the requested users.
     */
    if (!progress) {
      return;
    }

    let seenEvaluationIds =
      seenEvaluationIdsByUser.get(
        participant.student_id,
      );

    if (!seenEvaluationIds) {
      seenEvaluationIds = new Set<bigint>();

      seenEvaluationIdsByUser.set(
        participant.student_id,
        seenEvaluationIds,
      );
    }

    /*
     * Progress counts evaluations, not participant rows,
     * questions, answers, enrollments, or lecturers.
     */
    if (
      seenEvaluationIds.has(
        participant.evaluations.id,
      )
    ) {
      return;
    }

    seenEvaluationIds.add(
      participant.evaluations.id,
    );

    /*
     * Total:
     *
     * Every explicitly assigned published evaluation
     * counts in the denominator.
     *
     * OPEN includes both currently active and upcoming/
     * expired OPEN schedules. CLOSED also counts.
     */
    progress.total.assigned += 1;

    if (participant.has_submitted) {
      progress.total.completed += 1;
    }

    /*
     * Active:
     *
     * status must be OPEN
     * start_at <= now
     * now < end_at
     *
     * Null schedule boundaries cannot safely be guessed,
     * so such an evaluation is not counted as active.
     */
    const isActive =
      participant.evaluations.status ===
        'OPEN' &&
      participant.evaluations.start_at !==
        null &&
      participant.evaluations.end_at !==
        null &&
      participant.evaluations.start_at.getTime() <=
        now.getTime() &&
      now.getTime() <
        participant.evaluations.end_at.getTime();

    if (!isActive) {
      return;
    }

    progress.active.assigned += 1;

    /*
     * Submitted participants remain in the active
     * denominator. This allows values such as 6/7
     * rather than removing the six completed
     * assignments from the denominator.
     */
    if (participant.has_submitted) {
      progress.active.completed += 1;
    }
  }

  private emptyProgress(): EvaluationProgress {
    return {
      active: {
        completed: 0,
        assigned: 0,
      },

      total: {
        completed: 0,
        assigned: 0,
      },
    };
  }
}