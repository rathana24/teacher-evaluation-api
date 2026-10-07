import { normalizeClassGroup } from './class-group.util';

export type ProgressionAction =
  'NORMAL' | 'REPEAT' | 'TRANSFER' | 'PAUSE' | 'RESUME';
type Year = { id: bigint; start_year: number | null };
type RecordPlacement = {
  id?: bigint;
  academic_year_id: bigint;
  year_level: number;
  major_id: bigint;
  class_group: string | null;
  progression_action?: ProgressionAction;
  academic_years?: { start_year: number | null };
};
type Generation = {
  starting_year_level: number;
  entry_academic_year: { start_year: number | null };
};

/** Approved placements anchor progression; groups belong only to their own year.
 * Chronology uses structured start_year, never IDs, labels or array order.
 * A NORMAL record cannot clear a previous PAUSE. Only RESUME does that.
 */
export function resolveStudentPlacement<T extends RecordPlacement>(
  generation: Generation,
  records: T[],
  year: Year,
) {
  const current = records.find((r) => r.academic_year_id === year.id) ?? null;
  const unknownExceptionChronology = records.some(
    (r) =>
      r.progression_action &&
      r.progression_action !== 'NORMAL' &&
      (r.academic_years?.start_year == null || year.start_year == null),
  );
  const dated = records
    .filter(
      (r) =>
        r.academic_years?.start_year != null &&
        year.start_year != null &&
        r.academic_years.start_year <= year.start_year,
    )
    .slice()
    .sort(
      (a, b) => a.academic_years!.start_year! - b.academic_years!.start_year!,
    );
  // The current explicit placement remains usable when year metadata is absent.
  if (current && !dated.includes(current)) dated.push(current);
  const groups = new Map<number, T[]>();
  for (const record of dated) {
    const start = record.academic_years?.start_year;
    if (start != null)
      groups.set(start, [...(groups.get(start) ?? []), record]);
  }
  // Duplicate normal rows do not override an exact selected-year placement.
  // Conflicting status events, or competing latest anchors without that placement,
  // cannot be ordered safely using IDs.
  const latestStart = dated.at(-1)?.academic_years?.start_year;
  const ambiguousChronology = [...groups.entries()].some(
    ([start, group]) =>
      group.length > 1 &&
      (group.some(
        (r) => r.progression_action && r.progression_action !== 'NORMAL',
      ) ||
        (!current &&
          start === latestStart &&
          new Set(group.map((r) => `${r.year_level}:${r.major_id}`)).size > 1)),
  );
  const unresolved = unknownExceptionChronology || ambiguousChronology;
  let paused = false;
  for (const record of dated) {
    if (record.progression_action === 'PAUSE') paused = true;
    if (record.progression_action === 'RESUME') paused = false;
  }
  const anchor = dated.at(-1) ?? null;
  const entry = generation.entry_academic_year?.start_year ?? null;
  const difference =
    year.start_year != null && entry != null ? year.start_year - entry : null;
  const candidate =
    difference != null && difference >= 0
      ? generation.starting_year_level + difference
      : null;
  const calculated =
    candidate != null && candidate >= 1 && candidate <= 5 ? candidate : null;
  const calculationStatus =
    difference == null
      ? 'UNAVAILABLE'
      : difference < 0
        ? 'NOT_STARTED'
        : calculated != null
          ? 'CALCULATED'
          : 'BEYOND_PROGRAM';
  const anchorStart = anchor?.academic_years?.start_year;
  const progressed =
    anchor && anchorStart != null && year.start_year != null
      ? anchor.year_level + (paused ? 0 : year.start_year - anchorStart)
      : calculated;
  const effective = current?.year_level ?? progressed;
  const bounded =
    effective != null && effective >= 1 && effective <= 5 ? effective : null;
  const source = current
    ? 'ACADEMIC_RECORD'
    : anchor
      ? bounded != null
        ? 'PROGRESSION_CALCULATION'
        : 'BEYOND_PROGRAM'
      : calculated != null
        ? 'GENERATION_CALCULATION'
        : calculationStatus;
  const classGroup = normalizeClassGroup(current?.class_group);
  const eligibilityReason = unresolved
    ? 'PROGRESSION_CHRONOLOGY_UNAVAILABLE'
    : paused
      ? 'PAUSED'
      : !current || classGroup == null
        ? 'MISSING_YEARLY_GROUP'
        : bounded == null
          ? 'YEAR_LEVEL_UNAVAILABLE'
          : null;
  return {
    academic_record: current,
    calculated_year_level: calculated,
    calculation_status: calculationStatus,
    effective_year_level: bounded,
    year_level_source: source,
    progression_status: unresolved
      ? 'UNRESOLVED'
      : paused
        ? 'PAUSED'
        : 'ACTIVE',
    progression_anchor_record_id: anchor?.id ?? null,
    placement_eligible: eligibilityReason == null,
    ineligibility_reason: eligibilityReason,
    placement: {
      academic_year_id: year.id,
      source,
      year_level: bounded,
      major_id: current?.major_id ?? anchor?.major_id ?? null,
      class_group: classGroup,
    },
  };
}

export const progressionRecordSelect = {
  id: true,
  academic_year_id: true,
  year_level: true,
  major_id: true,
  class_group: true,
  progression_action: true,
  academic_years: { select: { start_year: true } },
} as const;

export const progressionStudentSelect = {
  generation_id: true,
  student_generations: {
    select: {
      starting_year_level: true,
      entry_academic_year: { select: { start_year: true } },
    },
  },
  student_academic_records: { select: progressionRecordSelect },
} as const;
