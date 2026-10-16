/** Safe metadata shared by selected-year placement consumers. */
export const cohortMetadataSelect = {
  id: true,
  name: true,
  ownership_state: true,
  major_id: true,
  generation_number: true,
  majors: { select: { id: true, code: true, name: true, department_id: true } },
  entry_academic_year_id: true,
  starting_year_level: true,
  entry_academic_year: {
    select: { id: true, name: true, start_year: true, is_active: true },
  },
} as const;

/** Exact yearly record only; an unresolved tracked row must not borrow a profile ID. */
export function yearlyCohortWhere(generationId: bigint) {
  return {
    OR: [
      { generation_id: generationId },
      {
        generation_id: null,
        students: {
          generation_id: generationId,
          student_generations: { ownership_state: 'LEGACY_READ_ONLY' as const },
          student_academic_records: { none: { generation_id: { not: null } } },
        },
      },
    ],
  };
}

type Cohort = {
  id?: bigint;
  name?: string;
  ownership_state?: string;
  major_id?: bigint | null;
  generation_number?: number | null;
  majors?: {
    id: bigint;
    code: string;
    name: string;
    department_id: bigint;
  } | null;
  entry_academic_year_id?: bigint;
  starting_year_level: number;
  entry_academic_year: {
    id?: bigint;
    name?: string;
    start_year: number | null;
    is_active?: boolean;
  };
};
type CohortRecord = {
  id?: bigint;
  academic_year_id: bigint;
  major_id: bigint;
  generation_id?: bigint | null;
  student_generations?: Cohort | null;
  academic_years?: { start_year: number | null };
};

/** Also used by the self-only projection: never spread arbitrary stored input. */
export function cohortView(
  cohort: Cohort | null | undefined,
  profileId?: bigint,
) {
  if (!cohort) return null;
  return {
    id: cohort.id ?? profileId ?? null,
    name: cohort.name ?? null,
    ownership_state: cohort.ownership_state ?? 'LEGACY_READ_ONLY',
    major_id: cohort.major_id ?? null,
    generation_number: cohort.generation_number ?? null,
    majors: cohort.majors
      ? {
          id: cohort.majors.id,
          code: cohort.majors.code,
          name: cohort.majors.name,
          department_id: cohort.majors.department_id,
        }
      : null,
    entry_academic_year_id:
      cohort.entry_academic_year_id ?? cohort.entry_academic_year?.id ?? null,
    starting_year_level: cohort.starting_year_level,
    entry_academic_year: {
      id: cohort.entry_academic_year?.id ?? null,
      name: cohort.entry_academic_year?.name ?? null,
      start_year: cohort.entry_academic_year?.start_year ?? null,
      is_active: cohort.entry_academic_year?.is_active ?? null,
    },
  };
}

export function resolveStudentCohort<T extends CohortRecord>(
  profile: Cohort,
  records: T[],
  year: { id: bigint; start_year: number | null },
  profileId?: bigint,
) {
  const unavailable = (reason: string) => ({
    generation_id: null as bigint | null,
    generation: null as ReturnType<typeof cohortView>,
    source: 'UNAVAILABLE',
    availability: 'UNAVAILABLE',
    reason,
    anchor_record_id: null as bigint | null,
  });
  const tracked =
    profile.ownership_state === 'MAJOR_SCOPED' ||
    records.some((record) => record.generation_id != null);
  const exact = records.find((record) => record.academic_year_id === year.id);
  let anchor = exact;
  if (!anchor && year.start_year != null) {
    const prior = records.filter(
      (record) =>
        record.academic_years?.start_year != null &&
        record.academic_years.start_year <= year.start_year!,
    );
    const latest = Math.max(
      ...prior.map((record) => record.academic_years!.start_year!),
    );
    const latestRecords = prior.filter(
      (record) => record.academic_years!.start_year === latest,
    );
    if (
      tracked &&
      (records.some((record) => record.academic_years?.start_year == null) ||
        new Set(
          latestRecords.map(
            (record) => `${record.generation_id}:${record.major_id}`,
          ),
        ).size > 1)
    )
      return unavailable('COHORT_CHRONOLOGY_UNAVAILABLE');
    anchor = latestRecords[0];
  }
  if (anchor?.generation_id != null) {
    const cohort = anchor.student_generations;
    if (
      !cohort ||
      cohort.id !== anchor.generation_id ||
      cohort.ownership_state !== 'MAJOR_SCOPED' ||
      cohort.major_id !== anchor.major_id
    )
      return unavailable('COHORT_OWNERSHIP_MISMATCH');
    return {
      generation_id: anchor.generation_id,
      generation: cohortView(cohort),
      source: exact ? 'ACADEMIC_RECORD' : 'PROGRESSION_ANCHOR',
      availability: 'RESOLVED',
      reason: null,
      anchor_record_id: anchor.id ?? null,
    };
  }
  if (tracked) return unavailable('COHORT_HISTORY_UNAVAILABLE');
  // Transitional compatibility only. This does not establish historical ownership.
  return {
    generation_id: profileId ?? profile.id ?? null,
    generation: cohortView({ ...profile, id: profileId ?? profile.id }),
    source: 'LEGACY_PROFILE',
    availability: 'LEGACY_UNVERIFIED',
    reason: null,
    anchor_record_id: null,
  };
}
