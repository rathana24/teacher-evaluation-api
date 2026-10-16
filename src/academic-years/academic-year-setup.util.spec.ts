import { randomUUID } from 'node:crypto';
import {
  yearSetupId,
  yearSetupInput,
  yearSetupKey,
  yearSetupSchemaReady,
} from './academic-year-setup.util';

const input = () => ({
  academic_year: { name: ' 2098-2099 ', start_year: 2098 },
  semesters: [
    { semester_number: 2, semester_name: ' Second ' },
    { semester_number: 1, semester_name: ' First ' },
  ],
});

describe('Academic year setup input and readiness', () => {
  it('normalizes names, semester order, optional dates and defaults before any write', () => {
    expect(yearSetupInput(input())).toEqual({
      mode: 'CREATE',
      academic_year_id: null,
      academic_year: {
        name: '2098-2099',
        start_year: 2098,
        is_active: false,
        start_date: null,
        end_date: null,
      },
      semesters: [
        {
          semester_number: 1,
          semester_name: 'First',
          start_date: null,
          end_date: null,
        },
        {
          semester_number: 2,
          semester_name: 'Second',
          start_date: null,
          end_date: null,
        },
      ],
    });
  });
  it('binds missing-only completion to the exact bigint year ID', () => {
    expect(
      yearSetupInput({ semesters: input().semesters }, '9223372036854775807')
        .academic_year_id,
    ).toBe('9223372036854775807');
  });
  it.each(['', '0', '-1', '01', '1.5', '9223372036854775808', '1e2'])(
    'rejects invalid completion ID %s',
    (id) => expect(() => yearSetupId(id)).toThrow(),
  );
  it('normalizes UUID case', () => {
    const key = randomUUID();
    expect(yearSetupKey(key.toUpperCase())).toBe(key);
  });
  it.each([
    undefined,
    null,
    '',
    'one',
    5,
    '00000000-0000-1000-8000-000000000000',
  ])('rejects unsafe/missing key %s', (key) =>
    expect(() => yearSetupKey(key)).toThrow(),
  );
  it.each([
    {},
    { academic_year: null, semesters: input().semesters },
    { ...input(), semesters: [] },
    { ...input(), semesters: [input().semesters[0]] },
    { ...input(), semesters: [input().semesters[0], input().semesters[0]] },
    {
      ...input(),
      semesters: input().semesters.map((s) => ({
        ...s,
        semester_name: 'Same',
      })),
    },
    { ...input(), academic_year: { name: ' ', start_year: 2098 } },
    { ...input(), academic_year: { name: 'Y', start_date: '2098-02-30' } },
    {
      ...input(),
      academic_year: {
        name: 'Y',
        start_date: '2098-02-20',
        end_date: '2098-02-19',
      },
    },
    {
      ...input(),
      semesters: [
        {
          semester_number: 1,
          semester_name: 'S1',
          start_date: '2098-01-01',
          end_date: '2098-01-01',
        },
        input().semesters[0],
      ],
    },
    { ...input(), unexpected: true },
  ])('rejects malformed nested or contradictory input %#', (body) =>
    expect(() => yearSetupInput(body as any)).toThrow(),
  );
  it('rejects year changes on missing-only completion', () =>
    expect(() => yearSetupInput(input(), '1')).toThrow());
  it('accepts explicit null optional dates and independent semester windows', () => {
    const result = yearSetupInput({
      academic_year: { name: 'Y', start_date: null },
      semesters: [
        {
          semester_name: 'S1',
          semester_number: 1,
          start_date: '2098-03-01',
          end_date: '2098-04-01',
        },
        { semester_name: 'S2', semester_number: 2, start_date: '2098-01-01' },
      ],
    });
    expect(result.academic_year!.start_date).toBeNull();
    expect(result.semesters[1].start_date!.toISOString()).toBe(
      '2098-01-01T00:00:00.000Z',
    );
  });
  it.each([false, undefined, 'true', 1, true])(
    'advertises schema readiness only on literal true (%s)',
    async (ready) => {
      expect(
        await yearSetupSchemaReady({
          $queryRaw: async () => [{ ready }],
        } as any),
      ).toBe(ready === true);
    },
  );
});
