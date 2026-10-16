import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import { ReviewedOperationStore } from '../reviewed-workflows/reviewed-operation.store';
import { CohortMappingManifestDto } from './dto/cohort-mapping.dto';

type Principal = { id: string; auth_version: number };
type Inventory = {
  database: string;
  schema: string;
  source_fingerprint: string;
} & Record<string, unknown>;
type Adapter = {
  inspect(db: PrismaService, principal: Principal): Promise<Inventory>;
  preview(
    db: PrismaService,
    principal: Principal,
    manifest: CohortMappingManifestDto,
  ): Promise<Record<string, unknown>>;
  apply(
    db: PrismaService,
    principal: Principal,
    manifest: CohortMappingManifestDto,
  ): Promise<Record<string, unknown>>;
};
const localRequire = createRequire(`${process.cwd()}/package.json`);
const { isolatedHttpMappingAdapter } = localRequire(
  './scripts/lib/cohort-mapping.cjs',
) as {
  isolatedHttpMappingAdapter(): Adapter;
};
const uuid =
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const proposalKeys = [
  'source_fingerprint',
  'reason',
  'cohorts',
  'profiles',
  'records',
  'scopes',
  'frozen_targets',
];
const resource = 'isolated-school-cohorts';

function exactObject(
  value: unknown,
  keys: string[],
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join('|') !== [...keys].sort().join('|')
  )
    throw new BadRequestException({
      code: 'INVALID_MANIFEST',
      message: 'Supply exactly the documented mapping fields.',
    });
}

@Injectable()
export class CohortMappingService {
  private readonly jwt = new JwtService();
  private readonly adapter = isolatedHttpMappingAdapter();
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private enabled() {
    if (this.config.get<string>('COHORT_MAPPING_ENABLED') !== 'true')
      throw new ServiceUnavailableException({
        code: 'COHORT_MAPPING_DISABLED',
        message: 'Reviewed cohort mapping is disabled for this installation.',
      });
  }
  private async principal(
    actor: bigint,
    authorization?: string,
  ): Promise<Principal> {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? '')?.[1];
    if (!token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        auth_version: number;
        exp: number;
      }>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });
      if (
        payload.sub !== String(actor) ||
        !Number.isInteger(payload.auth_version) ||
        payload.auth_version < 0 ||
        !Number.isFinite(payload.exp) ||
        payload.exp * 1000 <= Date.now()
      )
        throw new Error();
      return { id: String(actor), auth_version: payload.auth_version };
    } catch {
      throw new UnauthorizedException();
    }
  }
  private async authenticate(
    db: PrismaService,
    actor: bigint,
    authorization?: string,
  ) {
    const principal = await this.principal(actor, authorization);
    const user = await db.users.findUnique({
      where: { id: actor },
      select: { role: true, status: true, auth_version: true },
    });
    if (
      !user ||
      user.role !== 'ADMIN' ||
      user.status !== 'ACTIVE' ||
      user.auth_version !== principal.auth_version
    )
      throw new ForbiddenException({
        code: 'COHORT_MAPPING_FORBIDDEN',
        message: 'A current authenticated ACTIVE administrator is required.',
      });
  }
  private async target(db: PrismaService, manifest?: CohortMappingManifestDto) {
    const [context] = await db.$queryRaw<
      Array<{ database: string; schema: string }>
    >`SELECT current_database() AS database,current_schema() AS schema`;
    if (
      context.database !== 'teacher_evaluation_test' ||
      !(
        context.schema === 'public' ||
        /^cohort_(?:import_)?test_[a-f0-9]{32}$/.test(context.schema)
      )
    )
      throw new ConflictException({
        code: 'MAPPING_TARGET_UNSUPPORTED',
        message: 'This rollout supports only the isolated test database.',
      });
    if (
      manifest &&
      (manifest.database !== context.database ||
        manifest.schema !== context.schema)
    )
      throw new ConflictException({
        code: 'TARGET_MISMATCH',
        message: 'The reviewed mapping belongs to another database context.',
      });
    return context;
  }
  private store(
    actor: bigint,
    authorization?: string,
    manifest?: CohortMappingManifestDto,
  ) {
    return new ReviewedOperationStore(this.prisma, async (db) => {
      await this.authenticate(db, actor, authorization);
      await this.target(db, manifest);
    });
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      this.enabled();
      return await work();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const failure = error as { code?: string; message?: string };
      const code = failure?.code;
      const message = failure?.message;
      if (code && message) {
        if (
          [
            'INVALID_MANIFEST',
            'INVALID_MAPPING',
            'INCOMPLETE_MAPPING',
          ].includes(code)
        )
          throw new BadRequestException({ code, message });
        if (code === 'FORBIDDEN')
          throw new ForbiddenException({ code, message });
        if (
          [
            'TARGET_MISMATCH',
            'ISOLATED_FIXTURE_REQUIRED',
            'MAPPING_SCHEMA_MISMATCH',
            'MAPPING_MIGRATION_REQUIRED',
            'MAPPING_STALE',
            'DESTINATION_CONFLICT',
            'OPERATION_REUSED',
            'REVIEW_EXPIRED',
            'MAPPING_BUSY',
          ].includes(code)
        )
          throw new ConflictException({ code, message });
        if (code === 'MAPPING_FAILED')
          throw new InternalServerErrorException({
            code,
            message:
              'The mapping response failed. Check the original receipt and retry the unchanged confirmation; do not assume the operation was uncommitted.',
          });
        if (code === 'PRESERVATION_FAILED')
          throw new InternalServerErrorException({ code, message });
      }
      throw new InternalServerErrorException({
        code: 'MAPPING_FAILED',
        message:
          'The mapping request failed; no success is claimed. Retry the unchanged reviewed confirmation after checking its receipt.',
      });
    }
  }
  inventory(actor: bigint, authorization?: string) {
    return this.run(async () => {
      const principal = await this.principal(actor, authorization);
      return this.adapter.inspect(this.prisma, principal);
    });
  }
  preview(actor: bigint, authorization: string | undefined, input: unknown) {
    return this.run(async () => {
      exactObject(input, proposalKeys);
      const principal = await this.principal(actor, authorization);
      return this.store(actor, authorization).preview(
        'COHORT_MAPPING',
        resource,
        actor,
        async (db) => {
          const context = await this.target(db);
          const manifest = {
            ...input,
            schema_version: 1,
            operation_id: randomUUID(),
            database: context.database,
            schema: context.schema,
            reviewer_id: String(actor),
            reviewed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
          } as CohortMappingManifestDto;
          const impact = await this.adapter.preview(db, principal, manifest);
          return {
            input: { manifest },
            snapshot: { source_fingerprint: impact.source_fingerprint },
            output: { manifest, impact },
          };
        },
      );
    });
  }
  confirm(actor: bigint, authorization: string | undefined, input: unknown) {
    return this.run(async () => {
      exactObject(input, ['review_id', 'manifest']);
      if (
        typeof input.review_id !== 'string' ||
        !uuid.test(input.review_id) ||
        !input.manifest ||
        typeof input.manifest !== 'object' ||
        Array.isArray(input.manifest)
      )
        throw new BadRequestException({
          code: 'INVALID_MANIFEST',
          message: 'Supply a UUID review_id and its unchanged manifest.',
        });
      const manifest = input.manifest as CohortMappingManifestDto;
      const principal = await this.principal(actor, authorization);
      return this.store(actor, authorization, manifest).confirm(
        'COHORT_MAPPING',
        resource,
        actor,
        input.review_id,
        { manifest },
        async (db) => {
          let impact: Record<string, unknown>;
          try {
            impact = await this.adapter.preview(db, principal, manifest);
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (
              [
                'INVALID_MANIFEST',
                'INVALID_MAPPING',
                'INCOMPLETE_MAPPING',
                'MAPPING_STALE',
                'DESTINATION_CONFLICT',
              ].includes(code ?? '')
            )
              throw new ConflictException(
                'The reviewed mapping state changed.',
              );
            throw error;
          }
          return {
            input: { manifest },
            snapshot: { source_fingerprint: impact.source_fingerprint },
            output: { manifest, impact },
          };
        },
        (db) => this.adapter.apply(db, principal, manifest),
      );
    });
  }
  receipt(actor: bigint, authorization: string | undefined, reviewId: string) {
    return this.run(async () => {
      if (!uuid.test(reviewId))
        throw new BadRequestException('review_id must be a UUID v4');
      return inSerializableTransaction(this.prisma, async (db) => {
        await this.authenticate(db, actor, authorization);
        await this.target(db);
        const review = await db.reviewed_operations.findUnique({
          where: { id: reviewId },
        });
        if (
          !review ||
          review.actor_id !== actor ||
          review.operation_kind !== 'COHORT_MAPPING' ||
          review.resource_key !== resource
        )
          throw new NotFoundException('Review not found');
        if (!review.completed_at)
          throw new ConflictException({
            code: 'MAPPING_NOT_COMMITTED',
            message:
              'No committed receipt is visible. Retry the unchanged confirmation; do not create a replacement operation after an uncertain response.',
          });
        const request = review.request_json as unknown as {
          manifest: { operation_id: string };
        };
        const receipt = await db.cohort_mapping_receipts.findUnique({
          where: { operation_id: request.manifest.operation_id },
        });
        if (!receipt || receipt.actor_id !== actor)
          throw new ConflictException({
            code: 'MAPPING_RECEIPT_UNAVAILABLE',
            message:
              'The immutable mapping receipt is unavailable; operator review is required.',
          });
        return {
          ...(receipt.receipt_json as Record<string, unknown>),
          review_id: review.id,
          already_applied: true,
        };
      });
    });
  }
}
