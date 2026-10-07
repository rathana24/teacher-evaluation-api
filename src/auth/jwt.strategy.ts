import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string | null;
  role: string;
  auth_version: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Runs after the JWT signature and expiration are verified.
  // The returned user becomes req.user.
  async validate(payload: JwtPayload) {
    /*
     * Tokens issued before auth_version was introduced do not
     * contain this field. Reject them so they cannot bypass
     * the session-revocation mechanism.
     */
    if (
      !Number.isInteger(payload.auth_version) ||
      payload.auth_version < 0
    ) {
      throw new UnauthorizedException();
    }

    let userId: bigint;

    /*
     * Avoid allowing a malformed JWT subject to cause a
     * BigInt conversion error inside the request pipeline.
     */
    try {
      userId = BigInt(payload.sub);
    } catch {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.users.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        status: true,
        auth_version: true,
      },
    });

    /*
     * Reject when:
     * - the account no longer exists;
     * - the account has been disabled;
     * - the token was issued before the latest credential
     *   revision/password change.
     */
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.auth_version !== payload.auth_version
    ) {
      throw new UnauthorizedException();
    }

    /*
     * auth_version is used internally for authentication
     * checks and does not need to become part of req.user.
     */
    const {
      auth_version: _authVersion,
      ...safeUser
    } = user;

    return safeUser;
  }
}