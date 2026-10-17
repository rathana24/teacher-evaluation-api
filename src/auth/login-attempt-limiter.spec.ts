import { HttpException, HttpStatus } from '@nestjs/common';
import { jest } from '@jest/globals';

import { LoginAttemptLimiter } from './login-attempt-limiter';

describe('LoginAttemptLimiter', () => {
  let limiter: LoginAttemptLimiter;
  let now: number;

  beforeEach(() => {
    limiter = new LoginAttemptLimiter();
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const fail = (key: string, times: number) => {
    for (let i = 0; i < times; i += 1) {
      limiter.assertAllowed(key);
      limiter.recordFailure(key);
    }
  };

  const expectBlocked = (key: string) => {
    try {
      limiter.assertAllowed(key);
      throw new Error('Expected login to be blocked');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  };

  it('normalizes identifier case and whitespace in the key', () => {
    expect(limiter.key('1.2.3.4', ' Admin@ITC.edu.kh ')).toBe(
      limiter.key('1.2.3.4', 'admin@itc.edu.kh'),
    );
  });

  it('allows four failures and blocks after the fifth', () => {
    const key = limiter.key('1.2.3.4', 'e20221111');

    fail(key, 4);
    expect(() => limiter.assertAllowed(key)).not.toThrow();

    limiter.recordFailure(key);
    expectBlocked(key);
  });

  it('tracks identifiers and IPs separately', () => {
    const blocked = limiter.key('1.2.3.4', 'e20221111');
    fail(blocked, 5);

    expectBlocked(blocked);
    expect(() =>
      limiter.assertAllowed(limiter.key('1.2.3.4', 'e20229999')),
    ).not.toThrow();
    expect(() =>
      limiter.assertAllowed(limiter.key('5.6.7.8', 'e20221111')),
    ).not.toThrow();
  });

  it('clears the failures after a successful login', () => {
    const key = limiter.key('1.2.3.4', 'e20221111');

    fail(key, 4);
    limiter.clear(key);
    fail(key, 4);

    expect(() => limiter.assertAllowed(key)).not.toThrow();
  });

  it('unblocks after the 15 minute window', () => {
    const key = limiter.key('1.2.3.4', 'e20221111');

    fail(key, 5);
    expectBlocked(key);

    now += 15 * 60_000;
    expect(() => limiter.assertAllowed(key)).not.toThrow();
  });
});
