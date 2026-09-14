import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Service and database status',
    schema: { example: { status: 'ok', userCount: 42, courseCount: 12 } },
  })
  async health() {
    const userCount = await this.prisma.users.count();
    const courseCount = await this.prisma.courses.count();
    return { status: 'ok', userCount, courseCount };
  }
}