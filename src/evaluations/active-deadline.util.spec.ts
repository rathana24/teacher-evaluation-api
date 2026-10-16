import { activeDeadlineExtension } from './active-deadline.util';

describe('Active evaluation deadline policy', () => {
  const now = new Date('2098-10-15T12:00:00Z');
  const active = {
    status: 'OPEN',
    start_at: new Date('2098-10-15T11:00:00Z'),
    end_at: new Date('2098-10-15T13:00:00Z'),
  };
  const later = { end_at: '2098-10-15T14:00:00Z' };
  it('accepts a strictly later deadline in the active window', () =>
    expect(activeDeadlineExtension(active, later, now)).toEqual(
      new Date(later.end_at),
    ));
  it('accepts exactly the opening boundary', () =>
    expect(
      activeDeadlineExtension({ ...active, start_at: now }, later, now),
    ).toEqual(new Date(later.end_at)));
  it('rejects exactly the existing closing boundary', () =>
    expect(() =>
      activeDeadlineExtension({ ...active, end_at: now }, later, now),
    ).toThrow('currently active'));
  it('accepts the last millisecond before the existing deadline', () =>
    expect(
      activeDeadlineExtension(
        { ...active, end_at: new Date(now.getTime() + 1) },
        later,
        now,
      ),
    ).toEqual(new Date(later.end_at)));
  it.each(['DRAFT', 'CLOSED', 'UNKNOWN'])(
    'rejects %s in this active-only policy',
    (status) =>
      expect(() =>
        activeDeadlineExtension({ ...active, status }, later, now),
      ).toThrow(),
  );
  it.each([
    { start_at: new Date(now.getTime() + 1) },
    { end_at: new Date(now.getTime() - 1) },
    { start_at: null },
    { end_at: null },
  ])('rejects unavailable or inactive windows %#', (patch) =>
    expect(() =>
      activeDeadlineExtension({ ...active, ...patch }, later, now),
    ).toThrow(),
  );
  it.each([null, '', active.start_at.toISOString()])(
    'rejects any supplied JSON start_at (%s)',
    (start_at) =>
      expect(() =>
        activeDeadlineExtension(active, { ...later, start_at } as any, now),
      ).toThrow('end_at only'),
  );
  it('accepts an omitted start_at initialized to undefined by DTO transformation', () =>
    expect(
      activeDeadlineExtension(active, { ...later, start_at: undefined }, now),
    ).toEqual(new Date(later.end_at)));
  it.each([
    undefined,
    null,
    '',
    'invalid',
    '2098-02-30T14:00:00Z',
    '2098-10-15T13:00:00Z',
    '2098-10-15T12:59:59.999Z',
    42,
  ])('rejects missing, invalid or nonincreasing end_at (%s)', (end_at) =>
    expect(() =>
      activeDeadlineExtension(active, { end_at } as any, now),
    ).toThrow(),
  );
  it('compares timezone offsets as instants', () => {
    expect(() =>
      activeDeadlineExtension(
        active,
        { end_at: '2098-10-15T20:00:00+07:00' },
        now,
      ),
    ).toThrow();
    expect(
      activeDeadlineExtension(
        active,
        { end_at: '2098-10-15T21:00:00+07:00' },
        now,
      ),
    ).toEqual(new Date(later.end_at));
  });
  it('does not mutate the evaluation or request', () => {
    const evaluation = Object.freeze({ ...active }),
      dto = Object.freeze({ ...later });
    activeDeadlineExtension(evaluation, dto, now);
    expect(evaluation.end_at).toEqual(active.end_at);
    expect(dto).toEqual(later);
  });
});
