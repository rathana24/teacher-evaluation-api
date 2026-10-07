import { normalizeClassGroup } from './class-group.util';

export type OfferingGroupScope = {
  academic_year_id: bigint;
  generation_id: bigint;
  major_id: bigint;
  year_level: number;
  class_group: string;
};

/** Saved placement and explicit scope are authoritative; section labels are not. */
export function matchesOfferingScope(
  scopes: OfferingGroupScope[],
  academicYearId: bigint,
  generationId: bigint | null,
  placement: {
    academic_year_id: bigint;
    major_id: bigint | null;
    year_level: number;
    class_group: string | null;
  },
): boolean {
  const group = normalizeClassGroup(placement.class_group);
  return (
    group !== null &&
    placement.academic_year_id === academicYearId &&
    scopes.some(
      (scope) =>
        scope.academic_year_id === academicYearId &&
        scope.generation_id === generationId &&
        scope.major_id === placement.major_id &&
        scope.year_level === placement.year_level &&
        normalizeClassGroup(scope.class_group) === group,
    )
  );
}
