import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PasswordRateLimitGuard } from '../common/guards/password-rate-limit.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Log in using email or student code and receive a JWT access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token and user information',
    schema: {
      example: {
        access_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature',
        user: {
          id: '1',
          email: 'user@example.com',
          full_name: 'Jane Doe',
          gender: 'FEMALE',
          role: 'LECTURER',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid identifier or password',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid identifier or password',
        error: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account is not active',
    schema: {
      example: {
        statusCode: 403,
        message: 'Account is not active',
        error: 'Forbidden',
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get the authenticated user profile and student academic context when applicable',
  })
  @ApiResponse({
    status: 200,
    description:
      'Current authenticated user profile. Student accounts also include student and academic context information.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Missing, invalid, expired, or revoked token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  me(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  @Put('password')
  @UseGuards(
    AuthGuard('jwt'),
    PasswordRateLimitGuard,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Change the password of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description:
      'Password changed successfully. Existing access tokens are revoked.',
    schema: {
      example: {
        message:
          'Password changed successfully. Please sign in again.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Incorrect current password, invalid new password, unchanged password, or password exceeds the bcrypt byte limit',
  })
  @ApiResponse({
    status: 401,
    description:
      'Missing, invalid, expired, or revoked token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Account is not active',
    schema: {
      example: {
        statusCode: 403,
        message: 'Account is not active',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 429,
    description:
      'Too many password change requests. Maximum 5 requests per 60 seconds.',
    schema: {
      example: {
        statusCode: 429,
        message:
          'Too many password change requests. Try again later.',
      },
    },
  })
  changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto,
    );
  }
}