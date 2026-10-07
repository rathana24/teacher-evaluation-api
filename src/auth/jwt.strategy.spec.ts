import { jest } from '@jest/globals';

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const usersFindUniqueMock = jest.fn<
    (...args: unknown[]) => Promise<any>
  >();

  const prismaMock = {
    users: {
      findUnique: usersFindUniqueMock,
    },
  };

  const configMock = {
    getOrThrow: jest.fn(() => 'test-jwt-secret'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          JwtStrategy,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: ConfigService,
            useValue: configMock,
          },
        ],
      }).compile();

    strategy =
      module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should accept an active user when auth_version matches', async () => {
    usersFindUniqueMock.mockResolvedValue({
      id: BigInt(1),
      email: 'admin@itc.edu.kh',
      full_name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      auth_version: 3,
    });

    const result = await strategy.validate({
      sub: '1',
      email: 'admin@itc.edu.kh',
      role: 'ADMIN',
      auth_version: 3,
    });

    expect(
      usersFindUniqueMock,
    ).toHaveBeenCalledWith({
      where: {
        id: BigInt(1),
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

    expect(result).toEqual({
      id: BigInt(1),
      email: 'admin@itc.edu.kh',
      full_name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    expect(result).not.toHaveProperty(
      'auth_version',
    );
  });

  it('should reject a token when auth_version does not match', async () => {
    usersFindUniqueMock.mockResolvedValue({
      id: BigInt(1),
      email: 'admin@itc.edu.kh',
      full_name: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',

      // Database version changed after password change.
      auth_version: 4,
    });

    await expect(
      strategy.validate({
        sub: '1',
        email: 'admin@itc.edu.kh',
        role: 'ADMIN',

        // Old token still contains version 3.
        auth_version: 3,
      }),
    ).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject a legacy token without auth_version', async () => {
    await expect(
      strategy.validate({
        sub: '1',
        email: 'admin@itc.edu.kh',
        role: 'ADMIN',
        auth_version:
          undefined as unknown as number,
      }),
    ).rejects.toThrow(
      UnauthorizedException,
    );

    expect(
      usersFindUniqueMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject a malformed auth_version', async () => {
    await expect(
      strategy.validate({
        sub: '1',
        email: 'admin@itc.edu.kh',
        role: 'ADMIN',
        auth_version: -1,
      }),
    ).rejects.toThrow(
      UnauthorizedException,
    );

    expect(
      usersFindUniqueMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject a malformed user id', async () => {
    await expect(
      strategy.validate({
        sub: 'not-a-number',
        email: 'admin@itc.edu.kh',
        role: 'ADMIN',
        auth_version: 0,
      }),
    ).rejects.toThrow(
      UnauthorizedException,
    );

    expect(
      usersFindUniqueMock,
    ).not.toHaveBeenCalled();
  });

  it('should reject a user that no longer exists', async () => {
    usersFindUniqueMock.mockResolvedValue(
      null,
    );

    await expect(
      strategy.validate({
        sub: '999',
        email: 'deleted@itc.edu.kh',
        role: 'ADMIN',
        auth_version: 0,
      }),
    ).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should reject an inactive user', async () => {
    usersFindUniqueMock.mockResolvedValue({
      id: BigInt(1),
      email: 'admin@itc.edu.kh',
      full_name: 'System Admin',
      role: 'ADMIN',
      status: 'DISABLED',
      auth_version: 0,
    });

    await expect(
      strategy.validate({
        sub: '1',
        email: 'admin@itc.edu.kh',
        role: 'ADMIN',
        auth_version: 0,
      }),
    ).rejects.toThrow(
      UnauthorizedException,
    );
  });
});