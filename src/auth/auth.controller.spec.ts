import { jest } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

type LoginResult = {
  access_token: string;
  user: {
    id: string;
    email: string | null;
    full_name: string;
    gender: string | null;
    role: string;
  };
};

type MeResult = {
  id: bigint;
  email: string | null;
  full_name: string;
  role: string;
  status: string;
  capabilities: {
    change_password: boolean;
  };
};

type ChangePasswordResult = {
  message: string;
};

describe('AuthController', () => {
  let controller: AuthController;

  const loginMock = jest.fn<
    (
      ...args: unknown[]
    ) => Promise<LoginResult>
  >();

  const getMeMock = jest.fn<
    (...args: unknown[]) => Promise<MeResult>
  >();

  const changePasswordMock = jest.fn<
    (
      ...args: unknown[]
    ) => Promise<ChangePasswordResult>
  >();

  const authServiceMock = {
    login: loginMock,
    getMe: getMeMock,
    changePassword: changePasswordMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: authServiceMock,
          },
        ],
      }).compile();

    controller =
      module.get<AuthController>(
        AuthController,
      );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should call AuthService.login with the DTO', async () => {
      const dto = {
        identifier: 'admin@itc.edu.kh',
        password: 'Password123',
      };

      const expectedResult: LoginResult = {
        access_token: 'test-access-token',
        user: {
          id: '1',
          email: 'admin@itc.edu.kh',
          full_name: 'System Admin',
          gender: null,
          role: 'ADMIN',
        },
      };

      loginMock.mockResolvedValue(
        expectedResult,
      );

      const result =
        await controller.login(dto);

      expect(loginMock).toHaveBeenCalledWith(
        dto,
      );

      expect(result).toEqual(
        expectedResult,
      );
    });
  });

  describe('me', () => {
    it('should call AuthService.getMe with the authenticated user id', async () => {
      const currentUser = {
        id: BigInt(1),
        email: 'admin@itc.edu.kh',
        full_name: 'System Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      const expectedResult: MeResult = {
        ...currentUser,
        capabilities: {
          change_password: true,
        },
      };

      getMeMock.mockResolvedValue(
        expectedResult,
      );

      const result =
        await controller.me(currentUser);

      expect(getMeMock).toHaveBeenCalledWith(
        BigInt(1),
      );

      expect(result).toEqual(
        expectedResult,
      );
    });
  });

  describe('changePassword', () => {
    it('should call AuthService.changePassword with the authenticated user id and DTO', async () => {
      const currentUser = {
        id: BigInt(1),
        email: 'admin@itc.edu.kh',
        full_name: 'System Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      };

      const dto = {
        current_password: 'Password123',
        new_password: 'NewPassword456',
      };

      const expectedResult: ChangePasswordResult = {
        message:
          'Password changed successfully. Please sign in again.',
      };

      changePasswordMock.mockResolvedValue(
        expectedResult,
      );

      const result =
        await controller.changePassword(
          currentUser,
          dto,
        );

      expect(
        changePasswordMock,
      ).toHaveBeenCalledWith(
        BigInt(1),
        dto,
      );

      expect(result).toEqual(
        expectedResult,
      );
    });

    it('should use the authenticated user id instead of an id from the DTO', async () => {
      const currentUser = {
        id: BigInt(73),
        email: null,
        full_name: 'Test Student',
        role: 'STUDENT',
        status: 'ACTIVE',
      };

      const dto = {
        current_password: 'Password123',
        new_password: 'NewPassword456',
      };

      changePasswordMock.mockResolvedValue({
        message:
          'Password changed successfully. Please sign in again.',
      });

      await controller.changePassword(
        currentUser,
        dto,
      );

      expect(
        changePasswordMock,
      ).toHaveBeenCalledWith(
        BigInt(73),
        dto,
      );

      // The DTO does not contain a user ID.
      // The authenticated JWT identity determines
      // which account's password is changed.
      expect(dto).not.toHaveProperty(
        'user_id',
      );
    });
  });
});