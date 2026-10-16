import { jest } from '@jest/globals';
import {
  courseCodePrefix,
  nextCourseCode,
  courseCreationKey,
  courseCreationSchemaReady,
} from './course-code.util';
describe('Automatic course-code rules', () => {
  it.each([
    ['gic', 'GIC'],
    ['  gîc / td  ', 'GIC-TD'],
    ['A__B...C', 'A-B-C'],
    ['123', '123'],
    ['Å-é', 'A-E'],
    ['A'.repeat(30), 'A'.repeat(20)],
    ['A'.repeat(19) + '--X', 'A'.repeat(19)],
    ['---GIC---', 'GIC'],
  ])(
    'normalizes new prefix %s to %s without editing the department',
    (input, expected) => expect(courseCodePrefix(input)).toBe(expected),
  );
  it.each(['', '---', 'ខ្មែរ', '😀'])(
    'rejects an unusable generated prefix %s',
    (input) =>
      expect(() => courseCodePrefix(input)).toThrow('department needs a code'),
  );
  it.each([
    [[], 'GIC-001'],
    [['GIC-001'], 'GIC-002'],
    [['gic-002', 'GIC-001'], 'GIC-003'],
    [['GIC-999'], 'GIC-1000'],
    [['GIC-000009'], 'GIC-010'],
    [['OTHER-100', 'GIC-CS101', 'GIC-1X', 'GIC--2'], 'GIC-001'],
    [['GIC-000', 'GIC-01'], 'GIC-002'],
    [['GIC-9007199254740993'], 'GIC-9007199254740994'],
  ])('allocates from occupied numeric codes %j', (codes, expected) =>
    expect(nextCourseCode('GIC', codes as string[])).toBe(expected),
  );
  it('uses the 30-character boundary exactly', () =>
    expect(
      nextCourseCode('A'.repeat(20), ['A'.repeat(20) + '-999999998']),
    ).toHaveLength(30));
  it('rejects exhaustion without truncating or wrapping the suffix', () =>
    expect(() =>
      nextCourseCode('A'.repeat(20), ['A'.repeat(20) + '-999999999']),
    ).toThrow('30-character'));
  it('supports an absent key for explicit legacy creation only', () =>
    expect(courseCreationKey(undefined)).toBeUndefined());
  it('normalizes a UUID v4 key case', () =>
    expect(courseCreationKey('A1234567-1234-4567-8123-123456789ABC')).toBe(
      'a1234567-1234-4567-8123-123456789abc',
    ));
  it.each([
    '',
    null,
    123,
    'not-uuid',
    'a1234567-1234-1567-8123-123456789abc',
    ' a1234567-1234-4567-8123-123456789abc',
  ])('rejects malformed key %s', (value) =>
    expect(() => courseCreationKey(value)).toThrow('UUID v4'),
  );
  it.each([true, false])(
    'advertises schema readiness only for actual supported catalog %s',
    async (ready) => {
      const query = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([{ ready }]);
      expect(await courseCreationSchemaReady({ $queryRaw: query } as any)).toBe(
        ready,
      );
    },
  );
  it('does not turn database unavailability into an unsupported successful response', async () => {
    const query = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockRejectedValue(new Error('Unavailable'));
    await expect(
      courseCreationSchemaReady({ $queryRaw: query } as any),
    ).rejects.toThrow('Unavailable');
  });
});
