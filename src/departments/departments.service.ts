import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.departments.findMany({
      include: {
        _count: {
          select: {
            courses: true,
            user_departments: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const department =
      await this.prisma.departments.findUnique({
        where: {
          id,
        },

        include: {
          _count: {
            select: {
              courses: true,
              user_departments: true,
            },
          },
        },
      });

    if (!department) {
      throw new NotFoundException(
        'Department not found',
      );
    }

    return department;
  }

  async create(dto: CreateDepartmentDto) {
    const now = new Date();

    try {
      return await this.prisma.departments.create({
        data: {
          code: dto.code.trim(),
          name: dto.name.trim(),
          status: dto.status ?? 'ACTIVE',
          created_at: now,
          updated_at: now,
        },

        include: {
          _count: {
            select: {
              courses: true,
              user_departments: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Department code or name already exists',
        );
      }

      throw e;
    }
  }

  async update(
    id: bigint,
    dto: UpdateDepartmentDto,
  ) {
    await this.findOne(id);

    try {
      return await this.prisma.departments.update({
        where: {
          id,
        },

        data: {
          code:
            dto.code !== undefined
              ? dto.code.trim()
              : undefined,

          name:
            dto.name !== undefined
              ? dto.name.trim()
              : undefined,

          status: dto.status,

          updated_at: new Date(),
        },

        include: {
          _count: {
            select: {
              courses: true,
              user_departments: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Department code or name already exists',
        );
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    const department = await this.findOne(id);

    if (department._count.courses > 0) {
      throw new ConflictException(
        'Department has courses and cannot be deleted',
      );
    }

    if (department._count.user_departments > 0) {
      throw new ConflictException(
        'Department has users and cannot be deleted',
      );
    }

    try {
      return await this.prisma.departments.delete({
        where: {
          id,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Department is currently in use and cannot be deleted',
        );
      }

      throw e;
    }
  }
}