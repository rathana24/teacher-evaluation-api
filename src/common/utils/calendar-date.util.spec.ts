import { BadRequestException } from '@nestjs/common';
import { calendarDate } from './calendar-date.util';

describe('UTC calendar-date persistence', () => {
  it.each([
    ['2026-10-14', '2026-10-14T00:00:00.000Z'],
    ['2026-10-14T18:30:00Z', '2026-10-14T00:00:00.000Z'],
    ['2026-10-14T00:30:00+07:00', '2026-10-13T00:00:00.000Z'],
    ['2026-10-14T23:30:00-05:00', '2026-10-15T00:00:00.000Z'],
    ['2026-10-14T23:30:00', '2026-10-14T00:00:00.000Z'],
  ])('normalizes %s to the stored UTC day', (value, expected) => {
    expect(calendarDate(value)?.toISOString()).toBe(expected);
  });
  it('preserves missing endpoints', () => {
    expect(calendarDate(null)).toBeNull();
    expect(calendarDate(undefined)).toBeNull();
  });
  it('rejects invalid dates before database persistence', () => {
    expect(() => calendarDate('invalid')).toThrow(BadRequestException);
  });
});
