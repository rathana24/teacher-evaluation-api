import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Log in and receive a JWT access token' })
  @ApiResponse({
    status: 200,
    description: 'Access token and user info',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature',
        user: {
          id: '1',
          email: 'user@example.com',
          full_name: 'Jane Doe',
          role: 'LECTURER',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
    schema: { example: { statusCode: 401, message: 'Invalid email or password', error: 'Unauthorized' } },
  })
  @ApiResponse({
    status: 403,
    description: 'Account is not active',
    schema: { example: { statusCode: 403, message: 'Account is not active', error: 'Forbidden' } },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'The current user (from JWT payload)',
    schema: {
      example: {
        id: '1',
        email: 'user@example.com',
        full_name: 'Jane Doe',
        role: 'LECTURER',
        status: 'ACTIVE',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid token',
    schema: { example: { statusCode: 401, message: 'Unauthorized' } },
  })
  me(@CurrentUser() user: any) {
    return user;
  }
}