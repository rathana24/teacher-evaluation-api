import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

type FailureEntry = {
  count: number;
  resetAt: number;
};

/**
 * Limits repeated FAILED logins per client IP and identifier.
 * A successful login clears the counter, so normal use is never blocked.
 */
@Injectable()
export class LoginAttemptLimiter {
  private readonly failures =
    new Map<string, FailureEntry>();

  private readonly limit = 5;
  private readonly windowMs = 15 * 60_000;

  key(
    ip: string | undefined,
    identifier: unknown,
  ): string {
    const normalized =
      typeof identifier === 'string'
        ? identifier.trim().toLowerCase()
        : '';

    return `${ip ?? 'unknown'}|${normalized}`;
  }

  assertAllowed(key: string): void {
    const entry = this.failures.get(key);

    if (
      entry &&
      Date.now() < entry.resetAt &&
      entry.count >= this.limit
    ) {
      throw new HttpException(
        'Too many failed login attempts. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const entry = this.failures.get(key);

    if (!entry || now >= entry.resetAt) {
      this.failures.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      this.cleanup(now);

      return;
    }

    entry.count += 1;
  }

  clear(key: string): void {
    this.failures.delete(key);
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.failures) {
      if (now >= entry.resetAt) {
        this.failures.delete(key);
      }
    }
  }
}
