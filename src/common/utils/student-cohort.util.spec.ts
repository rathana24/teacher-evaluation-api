import { resolveStudentPlacement } from './student-placement.util';

describe('Selected-year cohort history', () => {
  const ds = {
    id: 9007199254740993n,
    name: 'Gen 1',
    ownership_state: 'MAJOR_SCOPED',
    major_id: 1n,
    generation_number: 1,
    starting_year_level: 1,
    entry_academic_year_id: 100n,
    entry_academic_year: {
      id: 100n,
      name: 'Entry DS',
      start_year: 2023,
      is_active: false,
    },
    majors: { id: 1n, code: 'DS', name: 'Data Science', department_id: 1n },
  };
  const fe = {
    ...ds,
    id: 20n,
    major_id: 2n,
    entry_academic_year: { ...ds.entry_academic_year, start_year: 2025 },
    majors: { ...ds.majors, id: 2n, code: 'FE' },
  };
  const old = {
    id: 500n,
    academic_year_id: 100n,
    academic_years: { start_year: 2023 },
    major_id: 1n,
    year_level: 1,
    class_group: 'A',
    generation_id: ds.id,
    student_generations: ds,
  };
  const transferred = {
    ...old,
    id: 1n,
    academic_year_id: 200n,
    academic_years: { start_year: 2025 },
    major_id: 2n,
    generation_id: fe.id,
    student_generations: fe,
    year_level: 2,
    class_group: 'B',
    progression_action: 'TRANSFER' as const,
  };
  const resolve = (
    records = [old, transferred],
    year = { id: 100n, start_year: 2023 },
  ) => resolveStudentPlacement(fe, records, year, fe.id);

  it('keeps an exact old cohort despite a later equal-number cross-major transfer', () => {
    const result = resolve();
    expect(result.cohort_context).toMatchObject({
      generation_id: ds.id,
      source: 'ACADEMIC_RECORD',
      availability: 'RESOLVED',
      anchor_record_id: old.id,
      generation: {
        generation_number: 1,
        major_id: 1n,
        majors: { code: 'DS' },
      },
    });
    expect(result.calculated_year_level).toBe(1);
    expect(result.placement).toMatchObject({
      generation_id: ds.id,
      major_id: 1n,
      class_group: 'A',
    });
    expect(result.placement_eligible).toBe(true);
  });
  it('uses the explicit transfer cohort and retains approved level precedence', () => {
    expect(
      resolve([old, transferred], { id: 200n, start_year: 2025 }),
    ).toMatchObject({
      calculated_year_level: 1,
      effective_year_level: 2,
      cohort_context: { generation_id: fe.id, generation: { major_id: 2n } },
    });
  });
  it('uses only the latest earlier cohort for a missing year, with no inherited group or eligibility', () => {
    expect(
      resolve([old, transferred], { id: 150n, start_year: 2024 }),
    ).toMatchObject({
      effective_year_level: 2,
      calculated_year_level: 2,
      placement_eligible: false,
      ineligibility_reason: 'MISSING_YEARLY_GROUP',
      cohort_context: { generation_id: ds.id, source: 'PROGRESSION_ANCHOR' },
      placement: { class_group: null, major_id: 1n },
    });
  });
  it('calculates after a transfer from its own cohort and approved progression anchor', () => {
    expect(
      resolve([old, transferred], { id: 300n, start_year: 2026 }),
    ).toMatchObject({
      calculated_year_level: 2,
      effective_year_level: 3,
      placement_eligible: false,
      cohort_context: { generation_id: fe.id, source: 'PROGRESSION_ANCHOR' },
    });
  });
  it('uses start_year and preserves inputs when records arrive reversed', () => {
    const records = [transferred, old];
    const before = structuredClone(records);
    expect(resolve(records).cohort_context.generation_id).toBe(ds.id);
    expect(records).toEqual(before);
  });
  it('does not assign the latest profile cohort before the first known record', () => {
    expect(
      resolve([old, transferred], { id: 99n, start_year: 2022 }),
    ).toMatchObject({
      cohort_context: {
        generation_id: null,
        reason: 'COHORT_HISTORY_UNAVAILABLE',
      },
      effective_year_level: null,
      placement_eligible: false,
    });
  });
  it('does not invent history for a canonical profile with no records', () => {
    expect(resolve([]).cohort_context).toMatchObject({
      generation_id: null,
      availability: 'UNAVAILABLE',
    });
  });
  it('does not use a later profile cohort for an unresolved exact old row', () => {
    expect(
      resolve([
        { ...old, generation_id: null, student_generations: null },
        transferred,
      ] as any),
    ).toMatchObject({
      effective_year_level: 1,
      placement_eligible: false,
      ineligibility_reason: 'COHORT_HISTORY_UNAVAILABLE',
      cohort_context: { generation_id: null, generation: null },
    });
  });
  it('does not skip an unresolved latest anchor in favor of an older known cohort', () => {
    const unknown = {
      ...old,
      id: 150n,
      academic_year_id: 150n,
      academic_years: { start_year: 2024 },
      generation_id: null,
      student_generations: null,
    };
    expect(
      resolve([old, unknown, transferred] as any, {
        id: 160n,
        start_year: 2024,
      }),
    ).toMatchObject({
      cohort_context: {
        generation_id: null,
        reason: 'COHORT_HISTORY_UNAVAILABLE',
      },
      placement_eligible: false,
    });
  });
  it.each([
    ['missing relation', null],
    ['wrong relation ID', { ...ds, id: 99n }],
    ['wrong owner', { ...ds, major_id: 2n }],
    ['unresolved owner', { ...ds, ownership_state: 'LEGACY_READ_ONLY' }],
  ])(
    'fails closed for %s without borrowing profile metadata',
    (_label, cohort) => {
      expect(
        resolve([{ ...old, student_generations: cohort }] as any),
      ).toMatchObject({
        placement_eligible: false,
        ineligibility_reason: 'COHORT_OWNERSHIP_MISMATCH',
        cohort_context: { generation_id: null, generation: null },
      });
    },
  );
  it('does not choose between equal-date anchors with different cohorts', () => {
    const other = {
      ...old,
      id: 4n,
      academic_year_id: 400n,
      generation_id: fe.id,
      student_generations: fe,
      major_id: 2n,
    };
    expect(resolve([old, other], { id: 150n, start_year: 2024 })).toMatchObject(
      {
        cohort_context: { reason: 'COHORT_CHRONOLOGY_UNAVAILABLE' },
        placement_eligible: false,
      },
    );
  });
  it('does not order an undated tracked record for a missing year', () => {
    const unknown = { ...transferred, academic_years: { start_year: null } };
    expect(
      resolve([old, unknown] as any, { id: 150n, start_year: 2024 })
        .cohort_context.reason,
    ).toBe('COHORT_CHRONOLOGY_UNAVAILABLE');
  });
  it('can show an exact stored cohort even when the selected year has no chronology', () => {
    expect(
      resolve(
        [{ ...old, academic_years: { start_year: null } }] as any,
        { id: 100n, start_year: null } as any,
      ),
    ).toMatchObject({
      cohort_context: { generation_id: ds.id, source: 'ACADEMIC_RECORD' },
      effective_year_level: 1,
      calculated_year_level: null,
    });
  });
  it('labels wholly legacy compatibility as unverified and never infers an owner', () => {
    const legacy = {
      ...ds,
      ownership_state: 'LEGACY_READ_ONLY',
      major_id: null,
      generation_number: null,
      majors: null,
    };
    expect(
      resolveStudentPlacement(
        legacy,
        [{ ...old, generation_id: null, student_generations: null }],
        { id: 100n, start_year: 2023 },
        ds.id,
      ),
    ).toMatchObject({
      placement_eligible: true,
      cohort_context: {
        source: 'LEGACY_PROFILE',
        availability: 'LEGACY_UNVERIFIED',
        generation_id: ds.id,
        generation: { major_id: null, generation_number: null },
      },
    });
  });
  it('cannot use a legacy pointer to bypass tracked unresolved history', () => {
    const profile = { ...fe, ownership_state: 'LEGACY_READ_ONLY' };
    expect(
      resolveStudentPlacement(
        profile,
        [
          { ...old, generation_id: null, student_generations: null },
          transferred,
        ],
        { id: 100n, start_year: 2023 },
        fe.id,
      ).cohort_context.availability,
    ).toBe('UNAVAILABLE');
  });
  it('keeps cohort selection independent of PAUSE eligibility', () => {
    expect(
      resolve([{ ...old, progression_action: 'PAUSE' } as any, transferred], {
        id: 200n,
        start_year: 2025,
      }),
    ).toMatchObject({
      progression_status: 'PAUSED',
      placement_eligible: false,
      cohort_context: { generation_id: fe.id, availability: 'RESOLVED' },
    });
  });
});
