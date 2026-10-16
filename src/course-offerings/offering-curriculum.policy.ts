import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeClassGroups } from '../common/utils/class-group.util';
import { CourseOfferingGroupScopeDto } from './dto/course-offering-group-scope.dto';

export function offeringScopeKeys(
  scopes: CourseOfferingGroupScopeDto[],
): string[] {
  return scopes
    .flatMap((scope) =>
      normalizeClassGroups(scope.class_groups).map((group) =>
        [
          BigInt(scope.academic_year_id),
          BigInt(scope.generation_id),
          BigInt(scope.major_id),
          scope.year_level,
          group,
        ].join(':'),
      ),
    )
    .sort();
}

/** Used inside the offering's existing serializable transaction. */
export class OfferingCurriculumPolicy {
  constructor(private readonly db: PrismaService) {}

  async requireAdmin(actorId: bigint) {
    if (!actorId)
      throw new ForbiddenException('An ACTIVE administrator is required.');
    const actor = await this.db.users.findUnique({
      where: { id: actorId },
      select: { role: true, status: true },
    });
    if (!actor || actor.role !== 'ADMIN' || actor.status !== 'ACTIVE')
      throw new ForbiddenException('An ACTIVE administrator is required.');
    // Approved policy: active ADMIN is school-wide; primary departments are metadata.
  }

  async resolve(
    courseId: bigint,
    semesterId: bigint,
    yearLevel: number | null | undefined,
    scopes: CourseOfferingGroupScopeDto[] = [],
  ) {
    if (
      typeof yearLevel !== 'number' ||
      !Number.isInteger(yearLevel) ||
      yearLevel < 1 ||
      yearLevel > 5
    )
      throw new BadRequestException({
        code: 'OFFERING_YEAR_LEVEL_REQUIRED',
        message:
          'A new teaching-assignment context requires an explicit student year_level from 1 to 5.',
      });
    const [course, semester] = await Promise.all([
      this.db.courses.findUnique({
        where: { id: courseId },
        include: { departments: true },
      }),
      this.db.semesters.findUnique({
        where: { id: semesterId },
        include: { academic_years: true },
      }),
    ]);
    if (!course || !semester)
      throw new BadRequestException('Course and semester must exist');
    if (course.departments.status !== 'ACTIVE')
      throw new BadRequestException({
        code: 'OFFERING_DEPARTMENT_INACTIVE',
        message:
          'New teaching-assignment contexts require an active course department.',
      });
    const startYear = semester.academic_years.start_year;
    if (startYear === null)
      throw new BadRequestException({
        code: 'OFFERING_ACADEMIC_YEAR_REQUIRED',
        message:
          'The selected semester needs an academic year with a structured start_year. The active year cannot substitute for it.',
      });
    const rules = await this.db.course_year_rules.findMany({
      where: { course_id: courseId, year_level: yearLevel },
      include: {
        revisions: { orderBy: { effective_start_year: 'asc' } },
        majors: { include: { departments: true } },
      },
    });
    const applicable = rules
      .filter((rule) => rule.year_level === yearLevel)
      .map((rule) => ({
        rule,
        revision: rule.revisions
          .filter((revision) => revision.effective_start_year <= startYear)
          .at(-1),
      }));
    const missingApproval = (majorId?: bigint): never => {
      throw new ConflictException({
        code: 'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
        message:
          'No enabled curriculum revision permits this course and student year in the selected semester academic year. Review curriculum history and approve the intended context first.',
        course_id: String(courseId),
        academic_year_id: String(semester.academic_year_id),
        year_level: yearLevel,
        ...(majorId !== undefined && { major_id: String(majorId) }),
      });
    };
    const active = applicable.filter(
      (entry) => entry.rule.majors.departments.status === 'ACTIVE',
    );
    if (!scopes.length) {
      if (!active.some((entry) => entry.revision?.enabled)) missingApproval();
      return new Map<string, bigint>();
    }
    const bindings = new Map<string, bigint>();
    for (const scope of scopes) {
      const majorId = BigInt(scope.major_id);
      const selected = active.find((entry) => entry.rule.major_id === majorId);
      if (
        scope.year_level !== yearLevel ||
        BigInt(scope.academic_year_id) !== semester.academic_year_id
      )
        throw new BadRequestException(
          'Group scope must match the offering semester academic year and year_level',
        );
      if (!selected?.revision?.enabled) missingApproval(majorId);
      const revisionId = selected!.revision!.id;
      if (
        scope.curriculum_revision_id !== undefined &&
        String(revisionId) !== scope.curriculum_revision_id
      )
        throw new ConflictException({
          code: 'OFFERING_CURRICULUM_REVISION_MISMATCH',
          message:
            'Selected curriculum revision is obsolete, inapplicable or does not match the assignment. Reload curriculum history.',
        });
      bindings.set(`${majorId}:${yearLevel}`, revisionId);
    }
    return bindings;
  }
}
