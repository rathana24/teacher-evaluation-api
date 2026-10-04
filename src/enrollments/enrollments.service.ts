import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudentsService } from '../students/students.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentGroupSelectionDto } from './dto/enrollment-group-selection.dto';

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

    const students =
      await this.studentsService.selectStudentsForEnrollment(
        dto,
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
        class_group:
          dto.class_group?.trim() || null,
      },
      matched_count: previewStudents.length,
      already_enrolled_count:
        alreadyEnrolledCount,
      new_enrollment_count:
        previewStudents.length -
        alreadyEnrolledCount,
      students: previewStudents,
    };
  }

  async bulkCreate(
    offeringId: bigint,
    dto: EnrollmentGroupSelectionDto,
  ) {
    await this.checkOfferingExists(offeringId);

    /*
     * Re-resolve the group at confirmation time.
     *
     * The filter is only used to choose the students.
     * Once confirmed, explicit enrollment rows are stored,
     * so future generation/profile changes do not silently
     * change course membership.
     */
    const students =
      await this.studentsService.selectStudentsForEnrollment(
        dto,
      );

    const userIds = students.map(
      (student) => student.user_id,
    );

    if (userIds.length === 0) {
      return {
        course_offering_id: offeringId,
        matched_count: 0,
        enrolled_count: 0,
        already_enrolled_count: 0,
      };
    }

    const existingEnrollments =
      await this.prisma.enrollments.findMany({
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

    const newStudentIds = userIds.filter(
      (userId) =>
        !enrolledUserIds.has(userId.toString()),
    );

    if (newStudentIds.length > 0) {
      await this.prisma.enrollments.createMany({
        data: newStudentIds.map((studentId) => ({
          student_id: studentId,
          course_offering_id: offeringId,
          enrolled_at: new Date(),
        })),

        /*
         * Protect confirmation against a duplicate race.
         * The database unique constraint remains the final
         * source of truth.
         */
        skipDuplicates: true,
      });
    }

    return {
      course_offering_id: offeringId,
      matched_count: userIds.length,
      enrolled_count: newStudentIds.length,
      already_enrolled_count:
        userIds.length - newStudentIds.length,
    };
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