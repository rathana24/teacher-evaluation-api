import {
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { jest } from '@jest/globals';

import { PasswordRateLimitGuard } from './password-rate-limit.guard';

describe('PasswordRateLimitGuard', () => {
  let guard: PasswordRateLimitGuard;

  const createContext = (
    userId: bigint,
  ): ExecutionContext => {
    const request = {
      user: {
        id: userId,
      },
      ip: '127.0.0.1',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new PasswordRateLimitGuard();
  });

  it('should allow the first five requests', () => {
    const context = createContext(BigInt(1));

    for (let i = 0; i < 5; i += 1) {
      expect(
        guard.canActivate(context),
      ).toBe(true);
    }
  });

  it('should return 429 on the sixth request', () => {
    const context = createContext(BigInt(1));

    for (let i = 0; i < 5; i += 1) {
      guard.canActivate(context);
    }

    try {
      guard.canActivate(context);

      throw new Error(
        'Expected rate limit exception',
      );
    } catch (error) {
      expect(
        error,
      ).toBeInstanceOf(HttpException);

      const httpError =
        error as HttpException;

      expect(
        httpError.getStatus(),
      ).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );

      expect(
        httpError.message,
      ).toBe(
        'Too many password change requests. Try again later.',
      );
    }
  });

  it('should track authenticated users separately', () => {
    const userOneContext =
      createContext(BigInt(1));

    const userTwoContext =
      createContext(BigInt(2));

    for (let i = 0; i < 5; i += 1) {
      guard.canActivate(userOneContext);
    }

    expect(
      guard.canActivate(userTwoContext),
    ).toBe(true);
  });

  it('should allow requests again after the time window expires', () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(1_000);

    const context = createContext(BigInt(1));

    for (let i = 0; i < 5; i += 1) {
      guard.canActivate(context);
    }

    expect(() =>
      guard.canActivate(context),
    ).toThrow(HttpException);

    nowSpy.mockReturnValue(61_001);

    expect(
      guard.canActivate(context),
    ).toBe(true);

    nowSpy.mockRestore();
  });
});