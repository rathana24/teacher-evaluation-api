export const CLASS_GROUP_MAX_LENGTH = 50;

export function normalizeClassGroup(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

  return normalized.length > 0
    ? normalized
    : null;
}

export function normalizeClassGroups(
  values: string[] | null | undefined,
): string[] {
  if (!values) {
    return [];
  }

  return [
    ...new Set(
      values
        .map((value) => normalizeClassGroup(value))
        .filter(
          (value): value is string =>
            value !== null,
        ),
    ),
  ];
}
