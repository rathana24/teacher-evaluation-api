import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { normalizeClassGroups } from '../common/utils/class-group.util';
import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentGroupSelectionDto } from './dto/enrollment-group-selection.dto';
import {
  ConfirmEnrollmentReassignmentDto,
  EnrollmentReassignmentDto,
} from './dto/enrollment-reassignment.dto';

// Return the student with each enrollment, limited to safe fields.
const enrollmentInclude = {
  users: {
    select: {
      id: true,
      full_name: true,
      email: true,
    },
  },
} satisfies Prisma.enrollmentsInclude;

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
  ) {}

  async findAllForOffering(offeringId: bigint) {
    await this.checkOfferingExists(offeringId);

    return this.prisma.enrollments.findMany({
      where: {
        course_offering_id: offeringId,
      },
      include: enrollmentInclude,
      orderBy: {
        id: 'asc',
      },
    });
  }

  async create(
    offeringId: bigint,
    dto: CreateEnrollmentDto,
  ) {
    await this.checkOfferingExists(offeringId);

    const studentId = BigInt(dto.student_id);

    /*
     * enrollments.student_id references users.id.
     *
     * Only an ACTIVE STUDENT account may be enrolled.
     */
    const student =
      await this.prisma.users.findUnique({
        where: {
          id: studentId,
        },
        select: {
          role: true,
          status: true,
        },
      });

    if (!student || student.role !== 'STUDENT') {
      throw new BadRequestException(
        'student_id must refer to a user with role STUDENT',
      );
    }

    if (student.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Student account must be ACTIVE',
      );
    }

    try {
      return await this.prisma.enrollments.create({
        data: {
          student_id: studentId,
          course_offering_id: offeringId,
          enrolled_at: new Date(),
        },
        include: enrollmentInclude,
      });
    } catch (error: unknown) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Student is already enrolled in this course offering',
        );
      }

      throw error;
    }
  }

  async previewGroup(
    offeringId: bigint,
    dto: EnrollmentGroupSelectionDto,
  ) {
    await this.checkOfferingExists(offeringId);

    const normalizedClassGroups =
      normalizeClassGroups(dto.class_groups);

    const students =
      await this.studentsService.selectStudentsForEnrollment(
        {
          academic_year_id:
            dto.academic_year_id,
          generation_id: dto.generation_id,
          year_level: dto.year_level,
          major_id: dto.major_id,
          class_groups:
            dto.class_groups === undefined
              ? undefined
              : normalizedClassGroups,
        },
      );

    const userIds = students.map(
      (student) => student.user_id,
    );

    const existingEnrollments =
      userIds.length === 0
        ? []
        : await this.prisma.enrollments.findMany({
            where: {
              course_offering_id: offeringId,
              student_id: {
                in: userIds,
              },
            },
            select: {
              student_id: true,
            },
          });

    const enrolledUserIds = new Set(
      existingEnrollments.map((enrollment) =>
        enrollment.student_id.toString(),
      ),
    );

    const previewStudents = students.map(
      (student) => ({
        ...student,
        already_enrolled: enrolledUserIds.has(
          student.user_id.toString(),
        ),
      }),
    );

    const alreadyEnrolledCount =
      previewStudents.filter(
        (student) => student.already_enrolled,
      ).length;

    return {
      course_offering_id: offeringId,
      selection: {
        academic_year_id: dto.academic_year_id,
        generation_id:
          dto.generation_id ?? null,
        year_level:
          dto.year_level ?? null,
        major_id:
          dto.major_id ?? null,
        class_groups:
          dto.class_groups === undefined
            ? null
            : normalizedClassGroups,
      },
      matched_count: previewStudents.length,
      already_enrolled_count:
        alreadyEnrolledCount,
      new_enrollment_count:
        previewStudents.length -
        alreadyEnrolledCount,
      confirmed_student_ids:
        previewStudents.map((student) =>
          student.user_id.toString(),
        ),
      students: previewStudents,
    };
  }

  async bulkCreate(
    offeringId: bigint,
    dto: EnrollmentGroupSelectionDto,
  ) {
    await this.checkOfferingExists(offeringId);

    if (!dto.confirmed_student_ids) {
      throw new BadRequestException(
        'confirmed_student_ids is required for enrollment confirmation',
      );
    }

    const normalizedClassGroups =
      normalizeClassGroups(dto.class_groups);

    const confirmedStudentIds =
      dto.confirmed_student_ids.map(
        (id) => BigInt(id),
      );

    return this.prisma.$transaction(
      async (tx) => {
        const students =
          await this.studentsService.selectStudentsForEnrollment(
            {
              academic_year_id:
                dto.academic_year_id,
              generation_id:
                dto.generation_id,
              year_level:
                dto.year_level,
              major_id:
                dto.major_id,
              class_groups:
                dto.class_groups === undefined
                  ? undefined
                  : normalizedClassGroups,
            },
            tx,
          );

        const currentStudentIds =
          students.map(
            (student) => student.user_id,
          );

        const currentIdSet = new Set(
          currentStudentIds.map((id) =>
            id.toString(),
          ),
        );

        const confirmedIdSet = new Set(
          confirmedStudentIds.map((id) =>
            id.toString(),
          ),
        );

        const sameStudentSet =
          currentIdSet.size ===
            confirmedIdSet.size &&
          [...currentIdSet].every((id) =>
            confirmedIdSet.has(id),
          );

        if (!sameStudentSet) {
          throw new ConflictException(
            'Enrollment selection changed after preview. Please preview the group again before confirming.',
          );
        }

        if (currentStudentIds.length === 0) {
          return {
            course_offering_id:
              offeringId,
            matched_count: 0,
            enrolled_count: 0,
            already_enrolled_count: 0,
          };
        }

        const existingEnrollments =
          await tx.enrollments.findMany({
            where: {
              course_offering_id:
                offeringId,
              student_id: {
                in: currentStudentIds,
              },
            },
            select: {
              student_id: true,
            },
          });

        const enrolledUserIds = new Set(
          existingEnrollments.map(
            (enrollment) =>
              enrollment.student_id.toString(),
          ),
        );

        const newStudentIds =
          currentStudentIds.filter(
            (studentId) =>
              !enrolledUserIds.has(
                studentId.toString(),
              ),
          );

        if (newStudentIds.length > 0) {
          await tx.enrollments.createMany({
            data: newStudentIds.map(
              (studentId) => ({
                student_id: studentId,
                course_offering_id:
                  offeringId,
                enrolled_at: new Date(),
              }),
            ),
            skipDuplicates: true,
          });
        }

        return {
          course_offering_id:
            offeringId,
          matched_count:
            currentStudentIds.length,
          enrolled_count:
            newStudentIds.length,
          already_enrolled_count:
            currentStudentIds.length -
            newStudentIds.length,
        };
      },
    );
  }

  async previewReassignment(
      sourceOfferingId: bigint,
      dto: EnrollmentReassignmentDto,
    ) {
      const studentId =
        BigInt(dto.student_id);

      const targetOfferingId =
        BigInt(dto.target_offering_id);

      if (
        sourceOfferingId ===
        targetOfferingId
      ) {
        throw new BadRequestException(
          'Source and target course offerings must be different',
        );
      }

      const sourceEnrollment =
        await this.prisma.enrollments.findFirst({
          where: {
            course_offering_id:
              sourceOfferingId,
            student_id:
              studentId,
          },

          select: {
            id: true,
            student_id: true,
            course_offering_id: true,
            enrolled_at: true,
          },
        });

      if (!sourceEnrollment) {
        throw new NotFoundException(
          'Student is not enrolled in the source course offering',
        );
      }

      const targetOffering =
        await this.prisma.course_offerings.findUnique({
          where: {
            id: targetOfferingId,
          },

          select: {
            id: true,
            course_id: true,
            semester_id: true,
            year_level: true,

            semesters: {
              select: {
                academic_year_id: true,
              },
            },

            group_scopes: {
              select: {
                academic_year_id: true,
                generation_id: true,
                major_id: true,
                year_level: true,
                class_group: true,
              },
            },
          },
        });

      if (!targetOffering) {
        throw new NotFoundException(
          'Target course offering not found',
        );
      }

      /*
       * Reassignment is between offerings of the
       * same course and semester only.
       */
      const sourceOffering =
        await this.prisma.course_offerings.findUnique({
          where: {
            id: sourceOfferingId,
          },

          select: {
            id: true,
            course_id: true,
            semester_id: true,
          },
        });

      if (!sourceOffering) {
        throw new NotFoundException(
          'Source course offering not found',
        );
      }

      if (
        sourceOffering.course_id !==
          targetOffering.course_id ||
        sourceOffering.semester_id !==
          targetOffering.semester_id
      ) {
        throw new BadRequestException(
          'Target offering must belong to the same course and semester as the source offering',
        );
      }

      const student =
        await this.prisma.students.findFirst({
          where: {
            user_id: studentId,
          },

          select: {
            id: true,
            user_id: true,
            generation_id: true,
            student_code: true,

            student_academic_records: {
              where: {
                academic_year_id:
                  targetOffering.semesters
                    .academic_year_id,
              },

              select: {
                academic_year_id: true,
                year_level: true,
                major_id: true,
                class_group: true,
              },
            },
          },
        });

      const placement =
        student?.student_academic_records[0];

      if (!student || !placement) {
        throw new BadRequestException(
          'Student does not have an existing placement for the target offering academic year',
        );
      }

      const normalizedStudentGroup =
        normalizeClassGroups([
          placement.class_group ?? '',
        ])[0] ?? null;

      const matchesTargetScope =
        normalizedStudentGroup !== null &&
        targetOffering.group_scopes.some(
          (scope) =>
            scope.academic_year_id ===
              placement.academic_year_id &&
            scope.generation_id ===
              student.generation_id &&
            scope.major_id ===
              placement.major_id &&
            scope.year_level ===
              placement.year_level &&
            normalizeClassGroups([
              scope.class_group,
            ])[0] === normalizedStudentGroup,
        );

      if (!matchesTargetScope) {
        throw new BadRequestException(
          'Student placement does not match the target course offering group scope',
        );
      }

      const existingTargetEnrollment =
        await this.prisma.enrollments.findFirst({
          where: {
            course_offering_id:
              targetOfferingId,
            student_id:
              studentId,
          },

          select: {
            id: true,
          },
        });

      if (existingTargetEnrollment) {
        throw new ConflictException(
          'Student is already enrolled in the target course offering',
        );
      }

      const participants =
        await this.prisma.evaluation_participants.findMany({
          where: {
            student_id:
              studentId,

            evaluations: {
              course_offering_id:
                sourceOfferingId,
            },
          },

          select: {
            id: true,
            evaluation_id: true,
            has_submitted: true,
            submitted_at: true,

            assessment_drafts: {
              select: {
                id: true,
              },
            },
          },
        });

      const draftCount =
        participants.filter(
          (participant) =>
            participant.assessment_drafts !==
            null,
        ).length;

      const submittedCount =
        participants.filter(
          (participant) =>
            participant.has_submitted,
        ).length;

      return {
        source_offering_id:
          sourceOfferingId.toString(),

        target_offering_id:
          targetOfferingId.toString(),

        student_id:
          studentId.toString(),

        confirmed_enrollment_id:
          sourceEnrollment.id.toString(),

        placement: {
          academic_year_id:
            placement.academic_year_id.toString(),

          generation_id:
            student.generation_id.toString(),

          major_id:
            placement.major_id.toString(),

          year_level:
            placement.year_level,

          class_group:
            normalizedStudentGroup,
        },

        impact: {
          frozen_participant_count:
            participants.length,

          draft_count:
            draftCount,

          submitted_count:
            submittedCount,

          protected:
            draftCount > 0 ||
            submittedCount > 0,

          participants:
            participants.map(
              (participant) => ({
                id:
                  participant.id.toString(),

                evaluation_id:
                  participant.evaluation_id.toString(),

                has_draft:
                  participant.assessment_drafts !==
                  null,

                has_submitted:
                  participant.has_submitted,
              }),
            ),
        },

        can_confirm:
          draftCount === 0 &&
          submittedCount === 0,
      };
    }

  async confirmReassignment(
    sourceOfferingId: bigint,
    dto: ConfirmEnrollmentReassignmentDto,
  ) {
    const studentId =
      BigInt(dto.student_id);

    const targetOfferingId =
      BigInt(dto.target_offering_id);

    const confirmedEnrollmentId =
      BigInt(dto.confirmed_enrollment_id);

    if (
      sourceOfferingId ===
      targetOfferingId
    ) {
      throw new BadRequestException(
        'Source and target course offerings must be different',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        /*
         * Re-check the exact source enrollment returned
         * by the preview.
         */
        const sourceEnrollment =
          await tx.enrollments.findFirst({
            where: {
              id: confirmedEnrollmentId,
              course_offering_id:
                sourceOfferingId,
              student_id: studentId,
            },

            select: {
              id: true,
              student_id: true,
              course_offering_id: true,
            },
          });

        if (!sourceEnrollment) {
          throw new ConflictException(
            'Reassignment state changed after preview. Please preview again before confirming.',
          );
        }

        /*
         * Re-check both offerings.
         */
        const sourceOffering =
          await tx.course_offerings.findUnique({
            where: {
              id: sourceOfferingId,
            },

            select: {
              id: true,
              course_id: true,
              semester_id: true,
            },
          });

        const targetOffering =
          await tx.course_offerings.findUnique({
            where: {
              id: targetOfferingId,
            },

            select: {
              id: true,
              course_id: true,
              semester_id: true,
              year_level: true,

              semesters: {
                select: {
                  academic_year_id: true,
                },
              },

              group_scopes: {
                select: {
                  academic_year_id: true,
                  generation_id: true,
                  major_id: true,
                  year_level: true,
                  class_group: true,
                },
              },
            },
          });

        if (
          !sourceOffering ||
          !targetOffering
        ) {
          throw new ConflictException(
            'Course offering state changed after preview. Please preview again before confirming.',
          );
        }

        if (
          sourceOffering.course_id !==
            targetOffering.course_id ||
          sourceOffering.semester_id !==
            targetOffering.semester_id
        ) {
          throw new ConflictException(
            'Course offering scope changed after preview. Please preview again before confirming.',
          );
        }

        /*
         * Re-read placement transactionally. Reassignment
         * never creates or changes academic placements.
         */
        const student =
          await tx.students.findFirst({
            where: {
              user_id: studentId,
            },

            select: {
              id: true,
              user_id: true,
              generation_id: true,

              student_academic_records: {
                where: {
                  academic_year_id:
                    targetOffering.semesters
                      .academic_year_id,
                },

                select: {
                  academic_year_id: true,
                  year_level: true,
                  major_id: true,
                  class_group: true,
                },
              },
            },
          });

        const placement =
          student?.student_academic_records[0];

        if (!student || !placement) {
          throw new ConflictException(
            'Student placement changed after preview. Please preview again before confirming.',
          );
        }

        const normalizedStudentGroup =
          normalizeClassGroups([
            placement.class_group ?? '',
          ])[0] ?? null;

        const matchesTargetScope =
          normalizedStudentGroup !== null &&
          targetOffering.group_scopes.some(
            (scope) =>
              scope.academic_year_id ===
                placement.academic_year_id &&
              scope.generation_id ===
                student.generation_id &&
              scope.major_id ===
                placement.major_id &&
              scope.year_level ===
                placement.year_level &&
              normalizeClassGroups([
                scope.class_group,
              ])[0] ===
                normalizedStudentGroup,
          );

        if (!matchesTargetScope) {
          throw new ConflictException(
            'Student no longer matches the target course offering group scope. Please preview again before confirming.',
          );
        }

        /*
         * The target enrollment must still be absent.
         */
        const existingTargetEnrollment =
          await tx.enrollments.findFirst({
            where: {
              course_offering_id:
                targetOfferingId,
              student_id:
                studentId,
            },

            select: {
              id: true,
            },
          });

        if (existingTargetEnrollment) {
          throw new ConflictException(
            'Student enrollment state changed after preview. Please preview again before confirming.',
          );
        }

        /*
         * Preserve frozen participants and block when any
         * source-offering evaluation has a draft/submission.
         */
        const participants =
          await tx.evaluation_participants.findMany({
            where: {
              student_id: studentId,

              evaluations: {
                course_offering_id:
                  sourceOfferingId,
              },
            },

            select: {
              id: true,
              evaluation_id: true,
              has_submitted: true,

              assessment_drafts: {
                select: {
                  id: true,
                },
              },
            },
          });

        const hasProtectedWork =
          participants.some(
            (participant) =>
              participant.has_submitted ||
              participant.assessment_drafts !==
                null,
          );

        if (hasProtectedWork) {
          throw new ConflictException(
            'Reassignment cannot be confirmed because the student has an evaluation draft or submission in the source offering.',
          );
        }

        /*
         * Move only the enrollment. Frozen evaluation
         * participants and academic placement stay unchanged.
         */
        await tx.enrollments.delete({
          where: {
            id: sourceEnrollment.id,
          },
        });

        let targetEnrollment:
          Awaited<
            ReturnType<
              typeof tx.enrollments.create
            >
          >;

        try {
          targetEnrollment =
            await tx.enrollments.create({
              data: {
                student_id: studentId,
                course_offering_id:
                  targetOfferingId,
                enrolled_at: new Date(),
              },

              select: {
                id: true,
                student_id: true,
                course_offering_id: true,
                enrolled_at: true,
              },
            });
        } catch (error: unknown) {
          if (
            error instanceof
              Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            throw new ConflictException(
              'Student enrollment state changed during reassignment. Please preview again.',
            );
          }

          throw error;
        }

        return {
          source_offering_id:
            sourceOfferingId.toString(),

          target_offering_id:
            targetOfferingId.toString(),

          student_id:
            studentId.toString(),

          source_enrollment_id:
            sourceEnrollment.id.toString(),

          target_enrollment_id:
            targetEnrollment.id.toString(),

          preserved_evaluation_participant_ids:
            participants.map(
              (participant) =>
                participant.id.toString(),
            ),

          placement_changed: false,
          evaluation_participants_changed:
            false,

          reassigned: true,
        };
      },
    );
  }

  async remove(
    offeringId: bigint,
    studentId: bigint,
  ) {
    await this.checkOfferingExists(offeringId);

    const enrollment =
      await this.prisma.enrollments.findFirst({
        where: {
          course_offering_id: offeringId,
          student_id: studentId,
        },
      });

    if (!enrollment) {
      throw new NotFoundException(
        'Student is not enrolled in this course offering',
      );
    }

    await this.prisma.enrollments.delete({
      where: {
        id: enrollment.id,
      },
    });
  }

  private async checkOfferingExists(
    offeringId: bigint,
  ) {
    const offering =
      await this.prisma.course_offerings.findUnique({
        where: {
          id: offeringId,
        },
        select: {
          id: true,
        },
      });

    if (!offering) {
      throw new NotFoundException(
        'Course offering not found',
      );
    }
  }
}