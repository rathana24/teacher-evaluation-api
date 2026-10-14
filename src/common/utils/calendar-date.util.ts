import { BadRequestException } from '@nestjs/common';

/** DATE columns retain the UTC calendar day, rather than a time of day. */
export function calendarDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  // Unqualified ISO datetimes also mean UTC, independently of the server timezone.
  const qualified =
    value.includes('T') && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value)
      ? `${value}Z`
      : value;
  const date = new Date(qualified);
  if (!Number.isFinite(date.getTime()))
    throw new BadRequestException('Invalid calendar date');
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
