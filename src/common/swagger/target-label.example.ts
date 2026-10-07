export const capturedTargetLabelExample = {
  historical_labels: {
    schema_version: 1,
    academic_year: { id: '1', name: '2026-2027', start_year: 2026 },
    generation: { id: '2', name: 'Generation 2025' },
    major: { id: '3', code: 'SE', name: 'Software Engineering' },
    year_level: 2,
    class_group: 'A',
  },
  labels_captured_at: '2026-10-08T00:00:00.000Z',
  historical_labels_status: 'CAPTURED',
  historical_labels_unavailable_reason: null,
  current_labels: {
    academic_year: { id: '1', name: '2026-2027', start_year: 2026 },
    generation: { id: '2', name: 'Renamed generation' },
    major: { id: '3', code: 'SE', name: 'Renamed major' },
    year_level: 2,
    class_group: 'A',
  },
};
export const legacyTargetLabelExample = {
  ...capturedTargetLabelExample,
  historical_labels: null,
  labels_captured_at: null,
  historical_labels_status: 'UNKNOWN',
  historical_labels_unavailable_reason: 'LEGACY_LABELS_NOT_CAPTURED',
};
export const targetLabelDescription =
  'Target rows expose immutable historical_labels, labels_captured_at and CAPTURED/UNKNOWN status alongside current_labels. Use historical_labels for historical display; never fall back to current names for UNKNOWN. Existing name/relation fields remain current-name compatibility fields. Query slicing by generation/group is unsupported and returns 400/UNSUPPORTED_ANONYMOUS_SCOPE; counts and answers remain whole evaluation aggregates.';
