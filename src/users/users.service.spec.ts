import { jest } from '@jest/globals';

import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

type SafeUser = {
  id: bigint;
  email: string | null;
  full_name: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
  user_departments: unknown[];
};

describe('UsersService', () => {
  let service: UsersService;

  const usersCreateMock = jest.fn<
    (...args: unknown[]) => Promise<SafeUser>
  >();

  const usersFindUniqueMock = jest.fn<
    (...args: unknown[]) => Promise<SafeUser | null>
  >();

  const usersUpdateMock = jest.fn<
    (...args: unknown[]) => Promise<SafeUser>
  >();

  const usersCountMock = jest.fn<
    (...args: unknown[]) => Promise<number>
  >();

  const prismaMock = {
    users: {
      create: usersCreateMock,
      findUnique: usersFindUniqueMock,
      update: usersUpdateMock,
      count: usersCountMock,
    },
  };

  const existingUser: SafeUser = {
    id: BigInt(10),
    email: 'lecturer@itc.edu.kh',
    full_name: 'Keo Sophal',
    gender: 'MALE',
    role: 'LECTURER',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    user_departments: [],
  };

  const existingAdmin: SafeUser = {
    id: BigInt(20),
    email: 'admin2@itc.edu.kh',
    full_name: 'Second Admin',
    gender: 'FEMALE',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
    user_departments: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.assign(prismaMock, {
      $transaction: jest.fn(async (callback: (tx: any) => Promise<any>) => callback(prismaMock)),
    });

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          UsersService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    service =
      module.get<UsersService>(UsersService);

    usersFindUniqueMock.mockResolvedValue(
      existingUser,
    );

    usersCreateMock.mockResolvedValue(
      existingUser,
    );

    usersUpdateMock.mockResolvedValue(
      existingUser,
    );

    usersCountMock.mockResolvedValue(2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a staff user with normalized email and gender', async () => {
      await service.create({
        email: ' NEWLECTURER@ITC.EDU.KH ',
        password: 'Password123',
        full_name: ' Keo Sophal ',
        gender: 'MALE',
        role: 'LECTURER',
      });

      expect(
        usersCreateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email:
              'newlecturer@itc.edu.kh',
            full_name: 'Keo Sophal',
            gender: 'MALE',
            role: 'LECTURER',
            password_hash:
              expect.any(String),
          }),
        }),
      );
    });

    it('should create a staff user without gender and store gender as null', async () => {
      await service.create({
        email: 'lecturer2@itc.edu.kh',
        password: 'Password123',
        full_name: 'Lecturer Two',
        role: 'LECTURER',
      });

      expect(
        usersCreateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email:
              'lecturer2@itc.edu.kh',
            full_name: 'Lecturer Two',
            gender: null,
            role: 'LECTURER',
          }),
        }),
      );
    });

    it('should reject a create password exceeding 72 UTF-8 bytes', async () => {
      /*
       * 😀 uses 4 UTF-8 bytes.
       * 19 × 4 = 76 bytes.
       */
      const tooLongPassword =
        '😀'.repeat(19);

      await expect(
        service.create({
          email: 'new@itc.edu.kh',
          password: tooLongPassword,
          full_name: 'New Lecturer',
          role: 'LECTURER',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Password must not exceed 72 UTF-8 bytes',
        ),
      );

      expect(
        usersCreateMock,
      ).not.toHaveBeenCalled();
    });

    it('should map duplicate email to ConflictException', async () => {
      const prismaError =
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion: '6.19.3',
            meta: {
              target: ['email'],
            },
          },
        );

      usersCreateMock.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.create({
          email: 'lecturer@itc.edu.kh',
          password: 'Password123',
          full_name:
            'Duplicate Lecturer',
          gender: 'FEMALE',
          role: 'LECTURER',
        }),
      ).rejects.toThrow(
        new ConflictException(
          'Email is already in use',
        ),
      );
    });
  });

  describe('update', () => {
    it('should update gender and normalize email', async () => {
      await service.update(
        BigInt(10),
        {
          email:
            ' UPDATED@ITC.EDU.KH ',
          full_name:
            ' Updated Lecturer ',
          gender: 'FEMALE',
        },
        BigInt(1),
      );

      expect(
        usersUpdateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: BigInt(10),
          },

          data: expect.objectContaining({
            email:
              'updated@itc.edu.kh',
            full_name:
              'Updated Lecturer',
            gender: 'FEMALE',
          }),
        }),
      );
    });

    it('should leave gender unchanged when gender is not provided', async () => {
      await service.update(
        BigInt(10),
        {
          full_name:
            'Updated Lecturer',
        },
        BigInt(1),
      );

      expect(
        usersUpdateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gender: undefined,
          }),
        }),
      );
    });

    it('should reset password, hash it, and increment auth_version', async () => {
      const newPassword =
        'NewPassword456';

      await service.update(
        BigInt(10),
        {
          password: newPassword,
        },
        BigInt(1),
      );

      expect(
        usersUpdateMock,
      ).toHaveBeenCalledTimes(1);

      const updateArgument =
        usersUpdateMock.mock
          .calls[0][0] as {
          where: {
            id: bigint;
          };

          data: {
            password_hash?: string;

            auth_version?: {
              increment: number;
            };

            updated_at: Date;
          };

          select: Record<
            string,
            unknown
          >;
        };

      expect(
        updateArgument.where,
      ).toEqual({
        id: BigInt(10),
      });

      expect(
        updateArgument.data
          .password_hash,
      ).toEqual(expect.any(String));

      expect(
        updateArgument.data
          .password_hash,
      ).not.toBe(newPassword);

      expect(
        await bcrypt.compare(
          newPassword,
          updateArgument.data
            .password_hash!,
        ),
      ).toBe(true);

      expect(
        updateArgument.data
          .auth_version,
      ).toEqual({
        increment: 1,
      });

      /*
       * The safe response selection must not
       * expose password_hash or auth_version.
       */
      expect(
        updateArgument.select,
      ).not.toHaveProperty(
        'password_hash',
      );

      expect(
        updateArgument.select,
      ).not.toHaveProperty(
        'auth_version',
      );
    });

    it('should not increment auth_version when password is not changed', async () => {
      await service.update(
        BigInt(10),
        {
          full_name:
            'Updated Lecturer',
        },
        BigInt(1),
      );

      expect(
        usersUpdateMock,
      ).toHaveBeenCalledTimes(1);

      const updateArgument =
        usersUpdateMock.mock
          .calls[0][0] as {
          data: {
            password_hash?:
              | string
              | undefined;

            auth_version?:
              | {
                  increment: number;
                }
              | undefined;
          };
        };

      expect(
        updateArgument.data
          .password_hash,
      ).toBeUndefined();

      expect(
        updateArgument.data
          .auth_version,
      ).toBeUndefined();
    });

    it('should reject an admin reset password exceeding 72 UTF-8 bytes', async () => {
      /*
       * 19 emoji characters are within the
       * DTO character limit but use 76 UTF-8
       * bytes, exceeding bcrypt's safe limit.
       */
      const tooLongPassword =
        '😀'.repeat(19);

      await expect(
        service.update(
          BigInt(10),
          {
            password:
              tooLongPassword,
          },
          BigInt(1),
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Password must not exceed 72 UTF-8 bytes',
        ),
      );

      /*
       * findOne() is called first to verify
       * that the target user exists, but the
       * update itself must never happen.
       */
      expect(
        usersUpdateMock,
      ).not.toHaveBeenCalled();
    });

    it('should prevent the current admin from deactivating their own account', async () => {
      await expect(
        service.update(
          BigInt(10),
          {
            status: 'INACTIVE',
          },
          BigInt(10),
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'You cannot deactivate your own account',
        ),
      );

      expect(
        usersUpdateMock,
      ).not.toHaveBeenCalled();
    });

    it('should reject deactivation of the last active admin', async () => {
      usersFindUniqueMock.mockResolvedValue(
        existingAdmin,
      );

      usersCountMock.mockResolvedValue(1);

      await expect(
        service.update(
          BigInt(20),
          {
            status: 'INACTIVE',
          },
          BigInt(1),
        ),
      ).rejects.toThrow(
        new ConflictException(
          'Cannot deactivate the last active admin',
        ),
      );

      expect(
        usersCountMock,
      ).toHaveBeenCalledWith({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      expect(
        usersUpdateMock,
      ).not.toHaveBeenCalled();
    });

    it('should allow deactivation of an admin when another active admin exists', async () => {
      usersFindUniqueMock.mockResolvedValue(
        existingAdmin,
      );

      usersCountMock.mockResolvedValue(2);

      usersUpdateMock.mockResolvedValue({
        ...existingAdmin,
        status: 'INACTIVE',
      });

      await service.update(
        BigInt(20),
        {
          status: 'INACTIVE',
        },
        BigInt(1),
      );

      expect(
        usersCountMock,
      ).toHaveBeenCalledWith({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      expect(
        usersUpdateMock,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: BigInt(20),
          },

          data: expect.objectContaining({
            status: 'INACTIVE',
          }),
        }),
      );
    });

    it('should not count active admins when deactivating a lecturer', async () => {
      usersFindUniqueMock.mockResolvedValue(
        existingUser,
      );

      await service.update(
        BigInt(10),
        {
          status: 'INACTIVE',
        },
        BigInt(1),
      );

      expect(
        usersCountMock,
      ).not.toHaveBeenCalled();

      expect(
        usersUpdateMock,
      ).toHaveBeenCalled();
    });

    it('should map duplicate email during update to ConflictException', async () => {
      const prismaError =
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion: '6.19.3',
            meta: {
              target: ['email'],
            },
          },
        );

      usersUpdateMock.mockRejectedValue(
        prismaError,
      );

      await expect(
        service.update(
          BigInt(10),
          {
            email:
              'existing@itc.edu.kh',
          },
          BigInt(1),
        ),
      ).rejects.toThrow(
        new ConflictException(
          'Email is already in use',
        ),
      );
    });
  });
});