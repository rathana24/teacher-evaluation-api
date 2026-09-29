import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AssignUserDepartmentDto } from './dto/assign-user-department.dto';

// Same cost factor the seed script uses
const BCRYPT_ROUNDS = 10;

// Every safe user field plus department memberships.
// password_hash is NEVER returned.
const safeUserSelect = {
  id: true,
  email: true,
  full_name: true,
  role: true,
  status: true,
  created_at: true,
  updated_at: true,

  user_departments: {
    select: {
      department_id: true,
      is_primary: true,

      departments: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      },
    },

    orderBy: {
      is_primary: 'desc',
    },
  },
} satisfies Prisma.usersSelect;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // =========================================================
  // USERS
  // =========================================================

  findAll(query: ListUsersQueryDto) {
    return this.prisma.users.findMany({
      where: {
        role: query.role,
        status: query.status,
      },

      select: safeUserSelect,

      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: bigint) {
    const user = await this.prisma.users.findUnique({
      where: {
        id,
      },

      select: safeUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(
      dto.password,
      BCRYPT_ROUNDS,
    );

    const now = new Date();

    try {
      return await this.prisma.users.create({
        data: {
          email: normalizeEmail(dto.email),
          password_hash: passwordHash,
          full_name: dto.full_name,
          role: dto.role,
          created_at: now,
          updated_at: now,
        },

        select: safeUserSelect,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Email is already in use',
        );
      }

      throw e;
    }
  }

  async update(
    id: bigint,
    dto: UpdateUserDto,
    currentUserId: bigint,
  ) {
    await this.findOne(id);

    // Safety rule:
    // An admin must not lock themselves out.
    if (
      dto.status === 'INACTIVE' &&
      id === currentUserId
    ) {
      throw new BadRequestException(
        'You cannot deactivate your own account',
      );
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(
          dto.password,
          BCRYPT_ROUNDS,
        )
      : undefined;

    try {
      return await this.prisma.users.update({
        where: {
          id,
        },

        data: {
          email:
            dto.email !== undefined
              ? normalizeEmail(dto.email)
              : undefined,

          full_name: dto.full_name,
          status: dto.status,
          password_hash: passwordHash,
          updated_at: new Date(),
        },

        select: safeUserSelect,
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Email is already in use',
        );
      }

      throw e;
    }
  }

  // =========================================================
  // USER DEPARTMENTS
  // =========================================================

  async getDepartments(userId: bigint) {
    // Make sure the user exists
    await this.findOne(userId);

    return this.prisma.user_departments.findMany({
      where: {
        user_id: userId,
      },

      select: {
        department_id: true,
        is_primary: true,
        created_at: true,

        departments: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
        },
      },

      orderBy: {
        is_primary: 'desc',
      },
    });
  }

  async assignDepartment(
    userId: bigint,
    dto: AssignUserDepartmentDto,
  ) {
    // Make sure the user exists
    await this.findOne(userId);

    const departmentId = BigInt(dto.department_id);

    // Make sure the department exists
    const department =
      await this.prisma.departments.findUnique({
        where: {
          id: departmentId,
        },
      });

    if (!department) {
      throw new BadRequestException(
        'Department not found',
      );
    }

    if (department.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot assign an inactive department',
      );
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // If the new assignment is primary,
          // clear any existing primary department first.
          if (dto.is_primary === true) {
            await tx.user_departments.updateMany({
              where: {
                user_id: userId,
                is_primary: true,
              },

              data: {
                is_primary: false,
              },
            });
          }

          // Create the assignment if it does not exist,
          // otherwise update its primary status.
          const assignment =
            await tx.user_departments.upsert({
              where: {
                user_id_department_id: {
                  user_id: userId,
                  department_id: departmentId,
                },
              },

              update: {
                is_primary: dto.is_primary ?? false,
              },

              create: {
                user_id: userId,
                department_id: departmentId,
                is_primary: dto.is_primary ?? false,
                created_at: new Date(),
              },

              select: {
                department_id: true,
                is_primary: true,
                created_at: true,

                departments: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    status: true,
                  },
                },
              },
            });

          return assignment;
        },
      );
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException(
          'Invalid user or department',
        );
      }

      throw e;
    }
  }

  async removeDepartment(
    userId: bigint,
    departmentId: bigint,
  ) {
    // Make sure the user exists
    await this.findOne(userId);

    const assignment =
      await this.prisma.user_departments.findUnique({
        where: {
          user_id_department_id: {
            user_id: userId,
            department_id: departmentId,
          },
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Department assignment not found',
      );
    }

    await this.prisma.user_departments.delete({
      where: {
        user_id_department_id: {
          user_id: userId,
          department_id: departmentId,
        },
      },
    });

    return {
      message: 'Department removed from user',
    };
  }
}