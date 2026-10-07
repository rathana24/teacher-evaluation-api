import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  user_role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { AssignUserDepartmentDto } from './dto/assign-user-department.dto';

const BCRYPT_ROUNDS = 10;

const safeUserSelect = {
  id: true,
  email: true,
  full_name: true,
  gender: true,
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

function validateBcryptPasswordBytes(
  password: string,
) {
  if (
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new BadRequestException(
      'Password must not exceed 72 UTF-8 bytes',
    );
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================================
  // USERS
  // =========================================================

  async findAll(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const search =
      query.search?.trim() || undefined;

    /*
     * /users is the staff-management endpoint.
     *
     * Students are managed through /students,
     * so when no specific role is supplied this
     * endpoint returns only ADMIN and LECTURER.
     */
    const where: Prisma.usersWhereInput = {
      role:
        query.role !== undefined
          ? query.role
          : {
              in: [
                user_role.ADMIN,
                user_role.LECTURER,
              ],
            },

      status: query.status,

      ...(search
        ? {
            OR: [
              {
                full_name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.users.findMany({
          where,

          select: safeUserSelect,

          orderBy: {
            id: 'asc',
          },

          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.users.count({
          where,
        }),
      ]);

    return {
      data,

      pagination: {
        page,
        limit,
        total,
        total_pages:
          total === 0
            ? 0
            : Math.ceil(total / limit),
      },

      filters: {
        search: search ?? null,
        role: query.role ?? null,
        status: query.status ?? null,
      },
    };
  }

  async findOne(id: bigint) {
    const user =
      await this.prisma.users.findUnique({
        where: {
          id,
        },

        select: safeUserSelect,
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return user;
  }

  async create(dto: CreateUserDto) {
    validateBcryptPasswordBytes(
      dto.password,
    );

    const passwordHash =
      await bcrypt.hash(
        dto.password,
        BCRYPT_ROUNDS,
      );

    const now = new Date();

    try {
      return await this.prisma.users.create({
        data: {
          email: normalizeEmail(dto.email),
          password_hash: passwordHash,
          full_name: dto.full_name.trim(),
          gender: dto.gender ?? null,
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
    const existingUser =
      await this.findOne(id);

    /*
     * The current admin must never be able
     * to deactivate their own account.
     */
    if (
      dto.status === 'INACTIVE' &&
      id === currentUserId
    ) {
      throw new BadRequestException(
        'You cannot deactivate your own account',
      );
    }

    /*
     * Prevent the final active ADMIN account
     * from being deactivated.
     */
    if (
      existingUser.role === 'ADMIN' &&
      existingUser.status === 'ACTIVE' &&
      dto.status === 'INACTIVE'
    ) {
      const activeAdminCount =
        await this.prisma.users.count({
          where: {
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        });

      if (activeAdminCount <= 1) {
        throw new ConflictException(
          'Cannot deactivate the last active admin',
        );
      }
    }

    if (dto.password !== undefined) {
      validateBcryptPasswordBytes(
        dto.password,
      );
    }

    const passwordHash =
      dto.password !== undefined
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

          full_name:
            dto.full_name !== undefined
              ? dto.full_name.trim()
              : undefined,

          gender: dto.gender,

          status: dto.status,

          /*
           * A password reset increments
           * auth_version so previously issued
           * JWTs are immediately invalidated.
           */
          password_hash: passwordHash,

          auth_version:
            passwordHash !== undefined
              ? {
                  increment: 1,
                }
              : undefined,

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
  // PERMANENT USER DELETION
  // =========================================================

  async remove(
    id: bigint,
    currentUserId: bigint,
  ) {
    /*
     * The caller must never permanently
     * delete their own account.
     */
    if (id === currentUserId) {
      throw new BadRequestException(
        'You cannot delete your own account',
      );
    }

    const user =
      await this.prisma.users.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          role: true,

          student: {
            select: {
              id: true,
            },
          },

          _count: {
            select: {
              course_offerings: true,
              enrollments: true,
              evaluation_participants: true,
              evaluations: true,
              surveys: true,
              survey_versions: true,
            },
          },
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    /*
     * ADMIN accounts are intentionally
     * excluded from permanent deletion.
     */
    if (user.role === user_role.ADMIN) {
      throw new BadRequestException(
        'Admin accounts cannot be permanently deleted',
      );
    }

    if (
      user.role !== user_role.STUDENT &&
      user.role !== user_role.LECTURER
    ) {
      throw new BadRequestException(
        'Only student and lecturer accounts can be permanently deleted',
      );
    }

    /*
     * Historical records are preserved.
     *
     * Any user referenced by academic,
     * enrollment, evaluation, survey, or
     * lecturer history must be deactivated
     * instead of deleted.
     */
    const hasHistoricalReferences =
      user._count.course_offerings > 0 ||
      user._count.enrollments > 0 ||
      user._count
        .evaluation_participants > 0 ||
      user._count.evaluations > 0 ||
      user._count.surveys > 0 ||
      user._count.survey_versions > 0;

    if (hasHistoricalReferences) {
      throw new ConflictException(
        'User has historical references and cannot be permanently deleted. Deactivate the account instead.',
      );
    }

    try {
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Department assignments are
           * non-historical account configuration.
           */
          await tx.user_departments.deleteMany({
            where: {
              user_id: id,
            },
          });

          /*
           * A STUDENT account may own a student
           * profile and academic placement records.
           *
           * Academic records depend on students.id,
           * so remove them before the profile.
           */
          if (
            user.role === user_role.STUDENT &&
            user.student
          ) {
            await tx.student_academic_records
              .deleteMany({
                where: {
                  student_id:
                    user.student.id,
                },
              });

            await tx.students.delete({
              where: {
                id: user.student.id,
              },
            });
          }

          await tx.users.delete({
            where: {
              id,
            },
          });
        },
      );
    } catch (e: any) {
      /*
       * A reference may theoretically appear
       * between the initial check and DELETE.
       *
       * PostgreSQL/Prisma will reject it through
       * the foreign key, which we expose as 409.
       */
      if (e.code === 'P2003') {
        throw new ConflictException(
          'User is still referenced by existing records and cannot be permanently deleted. Deactivate the account instead.',
        );
      }

      throw e;
    }

    return {
      message: 'User deleted successfully',
    };
  }

  // =========================================================
  // USER DEPARTMENTS
  // =========================================================

  async getDepartments(userId: bigint) {
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
    await this.findOne(userId);

    const departmentId = BigInt(
      dto.department_id,
    );

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
          if (dto.is_primary === true) {
            await tx.user_departments
              .updateMany({
                where: {
                  user_id: userId,
                  is_primary: true,
                },

                data: {
                  is_primary: false,
                },
              });
          }

          const assignment =
            await tx.user_departments.upsert({
              where: {
                user_id_department_id: {
                  user_id: userId,
                  department_id:
                    departmentId,
                },
              },

              update: {
                is_primary:
                  dto.is_primary ?? false,
              },

              create: {
                user_id: userId,
                department_id:
                  departmentId,
                is_primary:
                  dto.is_primary ?? false,
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
    await this.findOne(userId);

    const assignment =
      await this.prisma.user_departments
        .findUnique({
          where: {
            user_id_department_id: {
              user_id: userId,
              department_id:
                departmentId,
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
          department_id:
            departmentId,
        },
      },
    });

    return {
      message:
        'Department removed from user',
    };
  }
}