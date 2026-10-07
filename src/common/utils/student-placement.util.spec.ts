import {
  resolveStudentPlacement,
  ProgressionAction,
} from './student-placement.util';

describe('Approved student progression policy', () => {
  const generation = {
    starting_year_level: 1,
    entry_academic_year: { start_year: 2023 },
  };
  const year = { id: 10n, start_year: 2026 };
  const record = (
    id: bigint,
    start: number,
    level: number,
    action: ProgressionAction = 'NORMAL',
    group: string | null = 'A',
  ) => ({
    id,
    academic_year_id: id,
    academic_years: { start_year: start },
    year_level: level,
    major_id: 1n,
    class_group: group,
    progression_action: action,
  });

  it('keeps ordinary generation calculation without creating placements or inheriting a group', () => {
    expect(resolveStudentPlacement(generation, [], year)).toMatchObject({
      effective_year_level: 4,
      year_level_source: 'GENERATION_CALCULATION',
      placement_eligible: false,
      ineligibility_reason: 'MISSING_YEARLY_GROUP',
      placement: { class_group: null },
    });
  });
  it('progresses a repeated year from the last approved placement', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [record(50n, 2025, 2, 'REPEAT')],
        year,
      ),
    ).toMatchObject({
      effective_year_level: 3,
      year_level_source: 'PROGRESSION_CALCULATION',
      placement: { major_id: 1n, class_group: null },
    });
  });
  it('carries a transfer anchor and major without carrying its yearly group', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [{ ...record(50n, 2025, 4, 'TRANSFER'), major_id: 2n }],
        year,
      ),
    ).toMatchObject({
      effective_year_level: 5,
      placement: { major_id: 2n, class_group: null },
      placement_eligible: false,
    });
  });
  it('uses structured year chronology when IDs and labels would imply the opposite order', () => {
    const records = [
      record(500n, 2024, 2, 'TRANSFER'),
      record(2n, 2025, 2, 'REPEAT'),
      record(1n, 2027, 5, 'RESUME'),
    ];
    expect(resolveStudentPlacement(generation, records, year)).toMatchObject({
      effective_year_level: 3,
      progression_anchor_record_id: 2n,
      progression_status: 'ACTIVE',
    });
  });
  it('keeps a paused student ineligible even after a normal yearly group assignment', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [record(50n, 2025, 2, 'PAUSE'), record(10n, 2026, 2)],
        year,
      ),
    ).toMatchObject({
      progression_status: 'PAUSED',
      placement_eligible: false,
      ineligibility_reason: 'PAUSED',
    });
  });
  it('does not treat a repeat or transfer as implicit resumption', () => {
    for (const action of ['REPEAT', 'TRANSFER'] as const)
      expect(
        resolveStudentPlacement(
          generation,
          [record(50n, 2025, 2, 'PAUSE'), record(10n, 2026, 2, action)],
          year,
        ).progression_status,
      ).toBe('PAUSED');
  });
  it('resumes explicitly from the approved resumption placement and progresses from it', () => {
    const records = [
      record(50n, 2024, 2, 'PAUSE'),
      record(60n, 2025, 2, 'RESUME'),
    ];
    expect(resolveStudentPlacement(generation, records, year)).toMatchObject({
      progression_status: 'ACTIVE',
      effective_year_level: 3,
      placement_eligible: false,
    });
    expect(
      resolveStudentPlacement(
        generation,
        [...records, record(10n, 2026, 3)],
        year,
      ).placement_eligible,
    ).toBe(true);
  });
  it.each([null, '', '   '])(
    'requires a nonempty yearly group (%s)',
    (group) => {
      expect(
        resolveStudentPlacement(
          generation,
          [record(10n, 2026, 4, 'NORMAL', group)],
          year,
        ),
      ).toMatchObject({
        placement_eligible: false,
        ineligibility_reason: 'MISSING_YEARLY_GROUP',
      });
    },
  );
  it('bounds progression to years 1 through 5 without falling back to generation after graduation', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [record(50n, 2025, 5, 'TRANSFER')],
        year,
      ),
    ).toMatchObject({
      effective_year_level: null,
      year_level_source: 'BEYOND_PROGRAM',
    });
  });
  it('does not infer progression from labels or IDs when start_year is missing', () => {
    expect(
      resolveStudentPlacement(generation, [record(50n, 2025, 2, 'REPEAT')], {
        id: 99n,
        start_year: null,
      }),
    ).toMatchObject({
      effective_year_level: null,
      calculation_status: 'UNAVAILABLE',
      placement_eligible: false,
    });
  });
  it('blocks ambiguous chronology rather than choosing an anchor by ID or array order', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [
          record(1n, 2025, 2, 'PAUSE'),
          record(2n, 2025, 3, 'RESUME'),
          record(10n, 2026, 3),
        ],
        year,
      ),
    ).toMatchObject({
      progression_status: 'UNRESOLVED',
      placement_eligible: false,
      ineligibility_reason: 'PROGRESSION_CHRONOLOGY_UNAVAILABLE',
    });
  });
  it('does not silently resume when structured metadata disappears from a pause record', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [
          {
            ...record(50n, 2025, 2, 'PAUSE'),
            academic_years: { start_year: null },
          },
          record(10n, 2026, 2),
        ],
        year,
      ),
    ).toMatchObject({
      progression_status: 'UNRESOLVED',
      placement_eligible: false,
    });
  });
  it('uses an exact annual placement despite duplicate normal calendar-year records', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [record(9n, 2026, 4), record(10n, 2026, 4)],
        year,
      ),
    ).toMatchObject({
      effective_year_level: 4,
      progression_status: 'ACTIVE',
      placement_eligible: true,
    });
  });
  it('does not pick between competing latest approved anchors when no annual placement exists', () => {
    expect(
      resolveStudentPlacement(
        generation,
        [record(9n, 2025, 2), record(50n, 2025, 3)],
        year,
      ),
    ).toMatchObject({
      progression_status: 'UNRESOLVED',
      placement_eligible: false,
    });
  });
});
