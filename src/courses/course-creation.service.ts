import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  reviewFingerprint,
  reviewJson,
} from '../reviewed-workflows/reviewed-operation.store';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  COURSE_CREATE_KIND,
  courseCodePrefix,
  courseCreationKey,
  courseCreationSchemaReady,
  nextCourseCode,
} from './course-code.util';

type Db = Prisma.TransactionClient;

/** One lock namespace for generated codes, explicit creates and code-changing edits. */
export async function lockCourseCodes(db: Db) {
  await db.$executeRaw`SET LOCAL lock_timeout = '5s'`;
  await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('course-code-allocation:v1',0))::text`;
}

export class CourseCreationService {
  constructor(private readonly prisma: PrismaService) {}

  private async admin(db: Db, actorId: bigint) {
    const [actor] = await db.$queryRaw<Array<{ role: string; status: string }>>`
      SELECT role,status FROM users WHERE id=${actorId} FOR SHARE
    `;
    if (!actor || actor.role !== 'ADMIN' || actor.status !== 'ACTIVE')
      throw new ForbiddenException('An ACTIVE administrator is required.');
  }

  private async replay(
    db: Db,
    key: string,
    actorId: bigint,
    fingerprint?: string,
  ) {
    const receipt = await db.reviewed_operations.findUnique({
      where: { id: key },
    });
    if (!receipt) return null;
    if (receipt.actor_id !== actorId)
      throw new NotFoundException('Course creation receipt not found');
    if (
      receipt.operation_kind !== COURSE_CREATE_KIND ||
      receipt.resource_key !== 'courses:create:v1'
    )
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_IN_USE',
        message:
          'This idempotency key belongs to another operation. Keep its original request; use a new key only for a different intentional creation.',
      });
    if (
      fingerprint !== undefined &&
      receipt.request_fingerprint !== fingerprint
    )
      throw new ConflictException({
        code: 'COURSE_CREATE_INPUT_MISMATCH',
        message:
          'This key was used with different course input. Retry the original input or use a new key for a different intentional course.',
      });
    if (!receipt.completed_at || !receipt.result_json)
      throw new ConflictException({
        code: 'COURSE_CREATE_INCOMPLETE',
        message:
          'No completed course receipt is visible. Recover or retry the original request with the same key.',
      });
    return receipt.result_json;
  }

  async receipt(actorId: bigint, rawKey: unknown) {
    const key = courseCreationKey(rawKey);
    if (!key) throw new BadRequestException('A receipt key is required');
    return this.prisma.$transaction(async (db) => {
      await this.admin(db, actorId);
      const course = await this.replay(db, key, actorId);
      if (!course)
        throw new NotFoundException('Course creation receipt not found');
      return { idempotency_key: key, course, already_applied: true };
    });
  }

  async create(
    dto: CreateCourseDto,
    actorId: bigint,
    rawKey?: unknown,
  ): Promise<any> {
    const key = courseCreationKey(rawKey);
    if (dto.course_code === undefined && !key)
      throw new BadRequestException({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message:
          'Automatic course codes require an Idempotency-Key UUID v4. Keep the same key and input until the creation result is known.',
      });
    const input = {
      course_code: dto.course_code ?? null,
      course_name: dto.course_name,
      department_id: String(dto.department_id),
      description: dto.description ?? null,
    };
    const fingerprint = reviewFingerprint(input);
    for (let attempt = 0; ; attempt++) {
      try {
        // READ COMMITTED intentionally sees the previous allocator's committed rows after waiting for the lock.
        return await this.prisma.$transaction(
          async (db) => {
            await lockCourseCodes(db);
            await this.admin(db, actorId);
            if (key) {
              const original = await this.replay(db, key, actorId, fingerprint);
              if (original) return original;
              if (!(await courseCreationSchemaReady(db)))
                throw new ServiceUnavailableException({
                  code: 'COURSE_CODE_SCHEMA_NOT_READY',
                  message:
                    'Atomic course-code allocation and receipts are unavailable in this schema. Ask the operator to verify the approved migration; do not retry without the original key.',
                });
            }
            const [department] = await db.$queryRaw<
              Array<{ id: bigint; code: string; status: string }>
            >`
            SELECT id,code,status FROM departments WHERE id=${BigInt(dto.department_id)} FOR SHARE
          `;
            if (!department)
              throw new BadRequestException('Department not found');
            if (department.status !== 'ACTIVE')
              throw new BadRequestException(
                'Cannot assign course to an inactive department',
              );
            let code = dto.course_code;
            if (code === undefined) {
              const prefix = courseCodePrefix(department.code);
              // Both live official codes and retained completed receipts reserve numeric suffixes.
              const occupied = await db.$queryRaw<Array<{ code: string }>>`
              SELECT course_code AS code FROM courses WHERE upper(course_code) LIKE ${`${prefix}-%`}
              UNION SELECT result_json->>'course_code' AS code FROM reviewed_operations
              WHERE operation_kind='CREATE_COURSE' AND completed_at IS NOT NULL
                AND upper(result_json->>'course_code') LIKE ${`${prefix}-%`}
            `;
              code = nextCourseCode(
                prefix,
                occupied.map((row) => row.code),
              );
            }
            const now = new Date();
            const course = await db.courses.create({
              data: {
                course_code: code,
                course_name: dto.course_name,
                description: dto.description,
                department_id: department.id,
                created_at: now,
                updated_at: now,
              },
              include: { departments: true },
            });
            if (key)
              await db.reviewed_operations.create({
                data: {
                  id: key,
                  operation_kind: COURSE_CREATE_KIND,
                  resource_key: 'courses:create:v1',
                  actor_id: actorId,
                  request_json: reviewJson(input),
                  request_fingerprint: fingerprint,
                  snapshot_fingerprint: reviewFingerprint({ department, code }),
                  expires_at: now,
                  completed_at: now,
                  result_json: reviewJson(course),
                },
              });
            return course;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
            maxWait: 5000,
            timeout: 20000,
          },
        );
      } catch (error: any) {
        if (error?.code === 'P2002' && key && attempt < 2) continue;
        if (error?.code === 'P2002')
          throw new ConflictException('course_code already exists');
        if (error?.code === 'P2003')
          throw new BadRequestException('Invalid department_id');
        if (
          ['P2028', 'P2034'].includes(error?.code) ||
          (error?.code === 'P2010' && error?.meta?.code === '55P03')
        )
          throw new ConflictException({
            code: 'COURSE_CREATE_RETRY_REQUIRED',
            message:
              'Course creation could not complete within its concurrency limits. Recover the receipt or retry the original request with the same key; do not allocate a new key after an uncertain response.',
          });
        if (error instanceof HttpException) throw error;
        throw new InternalServerErrorException({
          code: 'COURSE_CREATE_RESULT_UNCERTAIN',
          message:
            'The course creation result is uncertain. If a key was supplied, recover its receipt or retry the original request with the same key and input. For an unkeyed official-code request, reload the catalog before deciding whether to retry.',
        });
      }
    }
  }
}
