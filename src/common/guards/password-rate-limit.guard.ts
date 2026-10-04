import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type AuthenticatedRequest = Request & {
  user?: {
    id?: bigint | string | number;
  };
};

@Injectable()
export class PasswordRateLimitGuard
  implements CanActivate
{
  private readonly attempts =
    new Map<string, RateLimitEntry>();

  private readonly limit = 5;
  private readonly windowMs = 60_000;

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request =
      context
        .switchToHttp()
        .getRequest<AuthenticatedRequest>();

    const key = this.getKey(request);
    const now = Date.now();

    const existing =
      this.attempts.get(key);

    if (
      !existing ||
      now >= existing.resetAt
    ) {
      this.attempts.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      this.cleanup(now);

      return true;
    }

    if (existing.count >= this.limit) {
      throw new HttpException(
        'Too many password change requests. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    existing.count += 1;

    return true;
  }

  private getKey(
    request: AuthenticatedRequest,
  ): string {
    if (request.user?.id !== undefined) {
      return `user:${String(request.user.id)}`;
    }

    return `ip:${request.ip ?? 'unknown'}`;
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.attempts) {
      if (now >= entry.resetAt) {
        this.attempts.delete(key);
      }
    }
  }
}