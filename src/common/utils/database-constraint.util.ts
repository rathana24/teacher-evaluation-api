import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const checks: Record<string, string> = {
  student_generations_starting_level_check:
    'Starting year level must be between 1 and 5',
  student_academic_records_level_check: 'Year level must be between 1 and 5',
  course_year_rules_level_check: 'Year level must be between 1 and 5',
  course_offering_group_scopes_level_check:
    'Year level must be between 1 and 5',
  evaluation_group_targets_level_check: 'Year level must be between 1 and 5',
  course_offerings_level_check: 'Year level must be between 1 and 5',
  academic_years_start_year_check: 'start_year must be between 1900 and 2200',
  academic_years_date_order_check: 'end_date must be after start_date',
  semesters_date_order_check: 'end_date must be after start_date',
  evaluations_date_order_check: 'end_at must be after start_at',
  surveys_title_nonblank_check: 'Question set title cannot be blank',
};

/** Map only owned constraints; unrelated/immutable-history errors keep their handling. */
export function throwKnownDatabaseConstraint(error: any): void {
  const detail = `${error?.meta?.database_error ?? ''} ${error?.meta?.constraint ?? ''} ${error?.message ?? ''}`;
  if (
    error?.code === 'P2002' &&
    (detail.includes('academic_years_one_active_idx') ||
      (error?.meta?.modelName === 'academic_years' &&
        Array.isArray(error?.meta?.target) &&
        error.meta.target.includes('is_active')))
  ) {
    throw new ConflictException({
      code: 'ACADEMIC_YEAR_ACTIVATION_CONFLICT',
      message:
        'Another academic year activation conflicted. Reload the years and retry.',
    });
  }
  if (
    !['P2004', 'P2010'].includes(error?.code) &&
    !(error instanceof Prisma.PrismaClientUnknownRequestError)
  )
    return;
  for (const [constraint, message] of Object.entries(checks)) {
    if (detail.includes(constraint)) throw new BadRequestException(message);
  }
}
