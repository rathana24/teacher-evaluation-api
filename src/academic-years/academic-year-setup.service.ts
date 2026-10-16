import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import { OfferingCurriculumPolicy } from '../course-offerings/offering-curriculum.policy';
import {
  reviewFingerprint,
  reviewJson,
} from '../reviewed-workflows/reviewed-operation.store';
import {
  AcademicYearSetupDto,
  CompleteAcademicYearSetupDto,
} from './dto/academic-year-setup.dto';
import {
  YEAR_SETUP_KIND,
  YEAR_SETUP_RESOURCE,
  yearSetupInput,
  yearSetupKey,
  yearSetupSchemaReady,
} from './academic-year-setup.util';

@Injectable()
export class AcademicYearSetupService {
  constructor(private readonly prisma: PrismaService) {}

  private async original(
    db: PrismaService,
    key: string,
    actor: bigint,
    fingerprint?: string,
  ) {
    const receipt = await db.reviewed_operations.findUnique({
      where: { id: key },
    });
    if (!receipt) return null;
    if (receipt.actor_id !== actor)
      throw new NotFoundException('Setup receipt not found');
    if (
      receipt.operation_kind !== YEAR_SETUP_KIND ||
      receipt.resource_key !== YEAR_SETUP_RESOURCE
    )
      throw new ConflictException({
        code: 'IDEMPOTENCY_KEY_IN_USE',
        message: 'Key belongs to another operation. Retain its original input.',
      });
    if (
      fingerprint !== undefined &&
      receipt.request_fingerprint !== fingerprint
    )
      throw new ConflictException({
        code: 'YEAR_SETUP_INPUT_MISMATCH',
        message:
          'Retry this key with its original input. Use a different key only for a different intentional operation.',
      });
    if (!receipt.completed_at || !receipt.result_json)
      throw new ConflictException({
        code: 'YEAR_SETUP_NOT_COMMITTED',
        message:
          'No completed receipt is visible in this snapshot. Retry the same key and body; this does not prove another in-flight operation rolled back.',
      });
    return {
      ...(receipt.result_json as Record<string, unknown>),
      idempotency_key: key,
      already_applied: true,
    };
  }

  private async run<T>(actor: bigint, work: (db: PrismaService) => Promise<T>) {
    try {
      return await inSerializableTransaction(this.prisma, async (db) => {
        await new OfferingCurriculumPolicy(db).requireAdmin(actor);
        return work(db);
      });
    } catch (error: any) {
      if (
        error?.code === 'P2002' ||
        (error instanceof ConflictException &&
          typeof error.getResponse() === 'string')
      )
        throw new ConflictException({
          code: 'YEAR_SETUP_RETRY_OR_CONFLICT',
          message:
            'Year/semester identity or a concurrent write conflicted. Recover or retry the SAME key/body before starting a different setup.',
        });
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException({
        code: 'YEAR_SETUP_RESULT_UNCERTAIN',
        message:
          'Recover or retry the SAME key/body. Do not start a replacement setup after a lost or uncertain response.',
      });
    }
  }

  receipt(actor: bigint, rawKey: string) {
    const key = yearSetupKey(rawKey);
    return this.run(actor, async (db) => {
      const result = await this.original(db, key, actor);
      if (!result)
        throw new NotFoundException(
          'Setup receipt not found; an in-flight request may still complete. Retry the same key/body.',
        );
      return result;
    });
  }

  setup(
    dto: AcademicYearSetupDto | CompleteAcademicYearSetupDto,
    actor: bigint,
    rawKey: unknown,
    targetId?: string,
  ) {
    const key = yearSetupKey(rawKey),
      input = yearSetupInput(dto, targetId),
      fingerprint = reviewFingerprint(input);
    return this.run(actor, async (db) => {
      const original = await this.original(db, key, actor, fingerprint);
      if (original) return original;
      if (!(await yearSetupSchemaReady(db)))
        throw new ServiceUnavailableException({
          code: 'YEAR_SETUP_SCHEMA_NOT_READY',
          message:
            'Required setup receipt migration is unavailable. Retain this key and input.',
        });
      const now = new Date();
      let year;
      if (input.academic_year_id !== null) {
        year = await db.academic_years.findUnique({
          where: { id: BigInt(input.academic_year_id) },
        });
        if (!year) throw new NotFoundException('Academic year not found');
      } else {
        const data = input.academic_year!;
        if (data.is_active)
          await db.academic_years.updateMany({
            where: { is_active: true },
            data: { is_active: false, updated_at: now },
          });
        year = await db.academic_years.create({
          data: { ...data, created_at: now, updated_at: now },
        });
      }
      const existing = await db.semesters.findMany({
        where: { academic_year_id: year.id },
        orderBy: { semester_number: 'asc' },
      });
      const saved = [],
        created: string[] = [],
        preserved: string[] = [];
      for (const requested of input.semesters) {
        const current = existing.find(
          (semester) => semester.semester_number === requested.semester_number,
        );
        if (current) {
          saved.push(current);
          preserved.push(String(current.id));
        } else {
          const semester = await db.semesters.create({
            data: {
              ...requested,
              academic_year_id: year.id,
              created_at: now,
              updated_at: now,
            },
          });
          saved.push(semester);
          created.push(String(semester.id));
        }
      }
      const result = {
        status: 'COMPLETE',
        academic_year: year,
        semesters: saved,
        created_semester_count: created.length,
        preserved_semester_count: preserved.length,
        created_semester_ids: created,
        preserved_semester_ids: preserved,
      };
      await db.reviewed_operations.create({
        data: {
          id: key,
          operation_kind: YEAR_SETUP_KIND,
          resource_key: YEAR_SETUP_RESOURCE,
          actor_id: actor,
          request_json: reviewJson(input),
          request_fingerprint: fingerprint,
          snapshot_fingerprint: reviewFingerprint({
            year_id: year.id,
            created,
            preserved,
          }),
          expires_at: now,
          completed_at: now,
          result_json: reviewJson(result),
        },
      });
      return { ...result, idempotency_key: key, already_applied: false };
    });
  }
}
