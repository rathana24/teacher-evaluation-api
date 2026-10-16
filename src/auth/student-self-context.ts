import type { StudentsService } from '../students/students.service';

export type ResolvedStudentAcademicContext = Extract<
  Awaited<ReturnType<StudentsService['findOne']>>,
  { academic_context: unknown }
>['academic_context'];

type AcademicYear = ResolvedStudentAcademicContext['academic_year'];

function yearView(
  year:
    | {
        id: bigint | null;
        name: string | null;
        start_year: number | null;
        is_active: boolean | null;
      }
    | null
    | undefined,
) {
  return year
    ? {
        id: year.id,
        name: year.name,
        start_year: year.start_year,
        is_active: year.is_active,
      }
    : null;
}

/** Expose self-only academic facts, never the full administrative student row. */
export function studentSelfContext(
  context: ResolvedStudentAcademicContext | null,
  selectedYear: AcademicYear | null,
) {
  // A missing/mismatched resolver context is unknown, rather than denied or an
  // invitation to substitute a previous year's group.
  const resolved =
    selectedYear && context?.academic_year?.id === selectedYear.id
      ? context
      : null;
  const record = resolved?.academic_record;
  const major = record?.majors;
  const placement = resolved?.placement;
  const cohort = resolved?.cohort_context;
  const generation = cohort?.generation;
  return {
    cohort_context: cohort
      ? {
          generation_id: cohort.generation_id,
          source: cohort.source,
          availability: cohort.availability,
          reason: cohort.reason,
          anchor_record_id: cohort.anchor_record_id,
          generation: generation
            ? {
                id: generation.id,
                name: generation.name,
                ownership_state: generation.ownership_state,
                major_id: generation.major_id,
                generation_number: generation.generation_number,
                entry_academic_year_id: generation.entry_academic_year_id,
                starting_year_level: generation.starting_year_level,
                entry_academic_year: yearView(generation.entry_academic_year),
                majors: generation.majors
                  ? {
                      id: generation.majors.id,
                      code: generation.majors.code,
                      name: generation.majors.name,
                      department_id: generation.majors.department_id,
                    }
                  : null,
              }
            : null,
        }
      : null,
    academic_year: yearView(selectedYear),
    academic_record: record
      ? {
          id: record.id,
          academic_year_id: record.academic_year_id,
          major_id: record.major_id,
          year_level: record.year_level,
          class_group: record.class_group,
          progression_action: record.progression_action,
          generation_id: record.generation_id ?? null,
          created_at: record.created_at,
          updated_at: record.updated_at,
          academic_years: yearView(record.academic_years),
          majors: major
            ? {
                id: major.id,
                code: major.code,
                name: major.name,
                department_id: major.department_id,
              }
            : null,
        }
      : null,
    generation_entry_academic_year: yearView(
      resolved?.generation_entry_academic_year,
    ),
    starting_year_level: resolved?.starting_year_level ?? null,
    calculated_year_level: resolved?.calculated_year_level ?? null,
    calculation_status: resolved?.calculation_status ?? null,
    effective_year_level: resolved?.effective_year_level ?? null,
    year_level_source: resolved?.year_level_source ?? null,
    progression_status: resolved?.progression_status ?? null,
    progression_anchor_record_id:
      resolved?.progression_anchor_record_id ?? null,
    placement_eligible:
      typeof resolved?.placement_eligible === 'boolean'
        ? resolved.placement_eligible
        : null,
    ineligibility_reason: resolved?.ineligibility_reason ?? null,
    placement: placement
      ? {
          academic_year_id: placement.academic_year_id,
          generation_id: placement.generation_id ?? null,
          source: placement.source,
          year_level: placement.year_level,
          major_id: placement.major_id,
          class_group: placement.class_group,
        }
      : null,
  };
}
