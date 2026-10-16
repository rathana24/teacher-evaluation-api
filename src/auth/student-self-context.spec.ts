import {
  studentSelfContext,
  type ResolvedStudentAcademicContext,
} from './student-self-context';

describe('Student self-profile academic context projection', () => {
  const year = {
    id: 20n,
    name: '2026-2027',
    start_year: 2026,
    is_active: true,
  };
  const context = (changes: Record<string, unknown> = {}) =>
    ({
      academic_year: year,
      academic_record: {
        id: 30n,
        academic_year_id: year.id,
        major_id: 2n,
        year_level: 1,
        class_group: 'A',
        progression_action: 'REPEAT',
        created_at: new Date(0),
        updated_at: new Date(0),
        academic_years: year,
        majors: {
          id: 2n,
          code: 'DS',
          name: 'Data Science',
          department_id: 1n,
          private: 'secret',
        },
        notes: 'secret',
        student_id: 999n,
      },
      generation_entry_academic_year: { ...year, id: 19n, start_year: 2025 },
      starting_year_level: 1,
      calculated_year_level: 2,
      calculation_status: 'CALCULATED',
      effective_year_level: 1,
      year_level_source: 'ACADEMIC_RECORD',
      progression_status: 'ACTIVE',
      progression_anchor_record_id: 30n,
      placement_eligible: true,
      ineligibility_reason: null,
      placement: {
        academic_year_id: year.id,
        source: 'ACADEMIC_RECORD',
        year_level: 1,
        major_id: 2n,
        class_group: 'A',
        password_hash: 'secret',
      },
      password_hash: 'secret',
      evaluation_progress: { secret: true },
      ...changes,
    }) as unknown as ResolvedStudentAcademicContext;

  it('preserves resolved academic facts and excludes private or administrative fields at every level', () => {
    const result = studentSelfContext(context(), year);
    expect(result).toMatchObject({
      academic_year: year,
      academic_record: {
        id: 30n,
        class_group: 'A',
        majors: { id: 2n, code: 'DS', name: 'Data Science', department_id: 1n },
      },
      calculated_year_level: 2,
      effective_year_level: 1,
      progression_anchor_record_id: 30n,
      progression_status: 'ACTIVE',
      placement_eligible: true,
    });
    expect(result.academic_record).not.toHaveProperty('student_id');
    expect(result.academic_record).not.toHaveProperty('notes');
    expect(result.academic_record!.majors).not.toHaveProperty('private');
    expect(result.placement).not.toHaveProperty('password_hash');
    expect(result).not.toHaveProperty('evaluation_progress');
    expect(result).not.toHaveProperty('password_hash');
  });
  it('projects selected-year cohort metadata without leaking nested administrative or authentication fields', () => {
    const result = studentSelfContext(context({cohort_context: {
      generation_id: 9007199254740993n, source:'ACADEMIC_RECORD',availability:'RESOLVED',reason:null,anchor_record_id:30n,
      private:'secret',generation:{id:9007199254740993n,name:'Gen 1',ownership_state:'MAJOR_SCOPED',major_id:2n,generation_number:1,
        entry_academic_year_id:19n,starting_year_level:1,entry_academic_year:{...year,id:19n},password_hash:'secret',mapping_operation_id:'secret',
        majors:{id:2n,code:'DS',name:'Data Science',department_id:1n,private:'secret'},
      },
    }}),year);
    expect(result.cohort_context).toMatchObject({generation_id:9007199254740993n,generation:{major_id:2n,generation_number:1}});
    expect(result.cohort_context).not.toHaveProperty('private');
    expect(result.cohort_context!.generation).not.toHaveProperty('password_hash');
    expect(result.cohort_context!.generation).not.toHaveProperty('mapping_operation_id');
    expect(result.cohort_context!.generation!.majors).not.toHaveProperty('private');
  });
  it.each([true, false])(
    'preserves explicit placement eligibility %s',
    (eligible) => {
      const result = studentSelfContext(
        context({
          placement_eligible: eligible,
          ineligibility_reason: eligible ? null : 'PAUSED',
        }),
        year,
      );
      expect(result.placement_eligible).toBe(eligible);
      expect(result.ineligibility_reason).toBe(eligible ? null : 'PAUSED');
    },
  );
  it('returns null rather than false for absent legacy eligibility metadata', () => {
    const result = studentSelfContext(
      context({ placement_eligible: undefined, progression_status: undefined }),
      year,
    );
    expect(result.placement_eligible).toBeNull();
    expect(result.progression_status).toBeNull();
  });
  it.each<[string, typeof year | null]>([
    ['no year', null],
    ['selected year', year],
  ])(
    'represents unavailable context explicitly with %s',
    (_label, selected) => {
      const result = studentSelfContext(null, selected);
      expect(result).toEqual({
        cohort_context: null,
        academic_year: selected,
        academic_record: null,
        generation_entry_academic_year: null,
        starting_year_level: null,
        calculated_year_level: null,
        calculation_status: null,
        effective_year_level: null,
        year_level_source: null,
        progression_status: null,
        progression_anchor_record_id: null,
        placement_eligible: null,
        ineligibility_reason: null,
        placement: null,
      });
    },
  );
  it('does not substitute a different resolved year when the selected year is unavailable', () => {
    const result = studentSelfContext(context(), { ...year, id: 21n });
    expect(result.academic_year!.id).toBe(21n);
    expect(result.academic_record).toBeNull();
    expect(result.placement).toBeNull();
    expect(result.placement_eligible).toBeNull();
  });
  it('keeps a missing current-year record and group absent while retaining authoritative progression', () => {
    const result = studentSelfContext(
      context({
        academic_record: null,
        effective_year_level: 2,
        year_level_source: 'PROGRESSION_CALCULATION',
        placement_eligible: false,
        ineligibility_reason: 'MISSING_YEARLY_GROUP',
        placement: {
          academic_year_id: year.id,
          source: 'PROGRESSION_CALCULATION',
          year_level: 2,
          major_id: 2n,
          class_group: null,
        },
      }),
      year,
    );
    expect(result.academic_record).toBeNull();
    expect(result.placement!.class_group).toBeNull();
    expect(result.effective_year_level).toBe(2);
    expect(result.placement_eligible).toBe(false);
  });
});
