import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import { ReviewedOperationStore } from '../reviewed-workflows/reviewed-operation.store';
import { StudentsService } from '../students/students.service';
import { StudentEvaluationProgressService } from '../students/student-evaluation-progress.service';
import { CourseOfferingsService } from './course-offerings.service';
import { OfferingCurriculumPolicy } from './offering-curriculum.policy';
import {
  AssignmentCreationConfirmDto,
  AssignmentCreationPreviewDto,
} from './dto/reviewed-assignment.dto';
import {
  assignmentInput,
  assignmentConfirmations,
  assignmentCreationSchemaReady,
  ASSIGNMENT_CREATE_KIND,
  ASSIGNMENT_CREATE_RESOURCE,
} from './assignment-creation.util';

@Injectable()
export class AssignmentCreationService {
  constructor(private readonly prisma: PrismaService) {}

  private async run<T>(
    actor: bigint,
    operation: (db: PrismaService) => Promise<T>,
    requireSchema = true,
  ): Promise<T> {
    try {
      return await inSerializableTransaction(this.prisma, async (db) => {
        await new OfferingCurriculumPolicy(db).requireAdmin(actor);
        if (requireSchema && !(await assignmentCreationSchemaReady(db)))
          throw new ServiceUnavailableException({
            code: 'ASSIGNMENT_SCHEMA_NOT_READY',
            message:
              'Reviewed assignment creation requires the deployed receipt kind and complete-identity database index. Ask the operator to finish deployment.',
          });
        return operation(db);
      });
    } catch (error) {
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (
          error.getStatus() === 409 &&
          (typeof response === 'string' ||
            (response as { code?: string }).code === 'OFFERING_WRITE_CONFLICT')
        )
          throw new ConflictException({
            code: 'ASSIGNMENT_RETRY_REQUIRED',
            message:
              'The operation conflicted or could not finish atomically. Retry the SAME review_id and unchanged confirmation, or recover its receipt. Do not create a replacement review after an uncertain result.',
          });
        throw error;
      }
      throw new InternalServerErrorException({
        code: 'ASSIGNMENT_RESULT_UNCERTAIN',
        message:
          'The operation did not return a verified result. For a confirmation, recover or retry the SAME review_id and unchanged body; do not issue another creation.',
      });
    }
  }

  private async resolve(
    db: PrismaService,
    dto: AssignmentCreationPreviewDto,
    actor: bigint,
  ) {
    const input = assignmentInput(dto),
      offerings = new CourseOfferingsService(db),
      students = new StudentsService(
        db,
        new StudentEvaluationProgressService(db),
      );
    const snapshots: unknown[] = [],
      items: Array<Record<string, unknown>> = [],
      confirmations: Array<{
        row_key: string;
        confirmed_student_ids: string[];
      }> = [];
    let total = 0;
    for (const row of input.assignments) {
      const creation = {
        course_id: input.course_id,
        year_level: input.year_level,
        ...row,
      };
      const selectedSemester = await db.semesters.findUnique({
        where: { id: BigInt(row.semester_id) },
        select: { academic_year_id: true },
      });
      if (
        selectedSemester &&
        String(selectedSemester.academic_year_id) !== input.academic_year_id
      )
        throw new BadRequestException({
          code: 'ASSIGNMENT_YEAR_MISMATCH',
          message:
            'Every selected semester must belong to the explicit operation academic year.',
        });
      const prepared = await offerings.validateCreation(creation, actor);
      const [semester, course, lecturer, cohorts, rules] = await Promise.all([
        db.semesters.findUniqueOrThrow({
          where: { id: prepared.semesterId },
          include: { academic_years: true },
        }),
        db.courses.findUniqueOrThrow({
          where: { id: prepared.courseId },
          include: { departments: true },
        }),
        db.users.findUniqueOrThrow({
          where: { id: prepared.lecturerId },
          select: { id: true, full_name: true, role: true, status: true },
        }),
        db.student_generations.findMany({
          where: {
            id: {
              in: row.group_scopes.map((scope) => BigInt(scope.generation_id)),
            },
          },
          orderBy: { id: 'asc' },
        }),
        db.course_year_rules.findMany({
          where: {
            course_id: prepared.courseId,
            year_level: input.year_level,
            major_id: {
              in: row.group_scopes.map((scope) => BigInt(scope.major_id)),
            },
          },
          include: {
            revisions: { orderBy: { revision_no: 'asc' } },
            majors: { include: { departments: true } },
          },
          orderBy: { id: 'asc' },
        }),
      ]);
      if (String(semester.academic_year_id) !== input.academic_year_id)
        throw new BadRequestException({
          code: 'ASSIGNMENT_YEAR_MISMATCH',
          message:
            'Every selected semester must belong to the explicit operation academic year.',
        });
      const selected = new Map<
          string,
          Awaited<
            ReturnType<StudentsService['selectStudentsForEnrollment']>
          >[number]
        >(),
        breakdown = [];
      for (const scope of row.group_scopes) {
        const cohort = cohorts.find(
          (item) => String(item.id) === scope.generation_id,
        );
        if (
          cohort?.ownership_state !== 'MAJOR_SCOPED' ||
          String(cohort.major_id) !== scope.major_id
        )
          throw new BadRequestException({
            code: 'ASSIGNMENT_COHORT_REQUIRED',
            message:
              'New reviewed audiences require an explicitly major-owned cohort. Unknown historical ownership must be reviewed first.',
          });
        const roster = await students.selectStudentsForEnrollment({
          academic_year_id: scope.academic_year_id,
          generation_id: scope.generation_id,
          major_id: scope.major_id,
          year_level: scope.year_level,
          class_groups: scope.class_groups,
        });
        const major = rules.find(
          (rule) => String(rule.major_id) === scope.major_id,
        )!.majors;
        for (const group of scope.class_groups)
          breakdown.push({
            academic_year_id: scope.academic_year_id,
            generation_id: scope.generation_id,
            generation_number: cohort.generation_number,
            major_id: scope.major_id,
            major_code: major.code,
            major_name: major.name,
            year_level: scope.year_level,
            class_group: group,
            eligible_count: roster.filter(
              (student) =>
                student.academic_context.placement.class_group === group,
            ).length,
          });
        for (const student of roster)
          selected.set(String(student.user_id), student);
      }
      const roster = [...selected.values()].sort((a, b) =>
          String(a.user_id).localeCompare(String(b.user_id)),
        ),
        ids = roster.map((student) => String(student.user_id));
      if (!ids.length)
        throw new BadRequestException({
          code: 'ASSIGNMENT_AUDIENCE_EMPTY',
          row_key: row.row_key,
          message:
            'This explicit class audience has no eligible active students with an assigned yearly group. Review progression, cohort and placement; no broader audience is substituted.',
        });
      total += ids.length;
      if (total > 10000)
        throw new BadRequestException(
          'At most 10,000 student-to-assignment memberships are supported per operation.',
        );
      confirmations.push({ row_key: row.row_key, confirmed_student_ids: ids });
      snapshots.push({
        row,
        semester,
        course,
        lecturer,
        cohorts,
        rules,
        roster,
        bindings: [...prepared.curriculumBindings].map(([key, value]) => [
          key,
          String(value),
        ]),
      });
      items.push({
        row_key: row.row_key,
        course_id: input.course_id,
        lecturer_id: row.lecturer_id,
        lecturer_name: lecturer.full_name,
        semester_id: row.semester_id,
        semester_name: semester.semester_name,
        academic_year_id: input.academic_year_id,
        year_level: input.year_level,
        class_type: row.class_type,
        section_code: row.section_code ?? null,
        group_scopes: row.group_scopes.map((scope) => ({
          ...scope,
          curriculum_revision_id: String(
            prepared.curriculumBindings.get(
              `${scope.major_id}:${scope.year_level}`,
            ),
          ),
        })),
        eligible_count: ids.length,
        confirmed_student_ids: ids,
        eligible_students: roster.map((student) => ({
          user_id: String(student.user_id),
          student_code: student.student_code,
          full_name: student.users.full_name,
          placement_major_id: String(
            student.academic_context.placement.major_id,
          ),
          generation_id: String(
            student.academic_context.cohort_context.generation_id,
          ),
          class_group: student.academic_context.placement.class_group,
          year_level: student.academic_context.effective_year_level,
        })),
        breakdown,
      });
    }
    return {
      input: {
        ...input,
        confirmations: assignmentConfirmations(confirmations),
      },
      snapshot: snapshots,
      output: { can_confirm: true, items, total_enrollment_count: total },
    };
  }

  preview(dto: AssignmentCreationPreviewDto, actor: bigint) {
    return this.run(actor, (db) =>
      new ReviewedOperationStore(db).preview(
        ASSIGNMENT_CREATE_KIND,
        ASSIGNMENT_CREATE_RESOURCE,
        actor,
        (tx) => this.resolve(tx, dto, actor),
      ),
    );
  }

  confirm(dto: AssignmentCreationConfirmDto, actor: bigint) {
    const input = {
      ...assignmentInput(dto),
      confirmations: assignmentConfirmations(dto.confirmations),
    };
    return this.run(actor, (db) =>
      new ReviewedOperationStore(db).confirm(
        ASSIGNMENT_CREATE_KIND,
        ASSIGNMENT_CREATE_RESOURCE,
        actor,
        dto.review_id,
        input,
        (tx) => this.resolve(tx, dto, actor),
        async (tx) => {
          const items = [];
          for (const row of input.assignments) {
            const ids = input.confirmations.find(
              (item) => item.row_key === row.row_key,
            )!.confirmed_student_ids;
            const offering = await new CourseOfferingsService(tx).create(
              {
                course_id: input.course_id,
                year_level: input.year_level,
                ...row,
              },
              actor,
            );
            const inserted = await tx.enrollments.createMany({
              data: ids.map((id) => ({
                course_offering_id: offering!.id,
                student_id: BigInt(id),
                enrolled_at: new Date(),
              })),
            });
            if (inserted.count !== ids.length)
              throw new ConflictException({
                code: 'ASSIGNMENT_ENROLLMENT_INCOMPLETE',
                message:
                  'Exact reviewed enrollment could not complete. All assignment/enrollment writes are rolled back.',
              });
            items.push({
              row_key: row.row_key,
              course_offering_id: String(offering!.id),
              status: 'CREATED',
              matched_count: ids.length,
              enrolled_count: inserted.count,
              already_enrolled_count: 0,
            });
          }
          return {
            status: 'COMPLETE',
            items,
            created_offering_count: items.length,
            enrolled_count: items.reduce(
              (sum, item) => sum + item.enrolled_count,
              0,
            ),
          };
        },
      ),
    );
  }

  receipt(reviewId: string, actor: bigint) {
    return this.run(
      actor,
      async (db) => {
        const review = await db.reviewed_operations.findUnique({
          where: { id: reviewId },
        });
        if (
          !review ||
          review.actor_id !== actor ||
          review.operation_kind !== ASSIGNMENT_CREATE_KIND ||
          review.resource_key !== ASSIGNMENT_CREATE_RESOURCE
        )
          throw new NotFoundException('Review not found');
        if (!review.completed_at)
          throw new ConflictException({
            code: 'ASSIGNMENT_NOT_COMMITTED',
            message:
              'No committed receipt is visible in this snapshot. Retry the SAME confirmation after an uncertain result; do not start another operation.',
          });
        return {
          ...(review.result_json as Record<string, unknown>),
          review_id: review.id,
          already_applied: true,
        };
      },
      false,
    );
  }
}
