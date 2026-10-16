import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const COURSE_CREATE_KIND = 'CREATE_COURSE';

/** Preserve official codes. This normalization applies to new generated prefixes only. */
export function courseCodePrefix(code: string): string {
  const prefix = code
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
    .replace(/-+$/g, '');
  if (!prefix)
    throw new BadRequestException({
      code: 'COURSE_CODE_PREFIX_REQUIRED',
      message:
        'The selected department needs a code containing Latin letters or digits for automatic allocation. Supply an official course_code or ask an administrator to review the department code.',
    });
  return prefix;
}

/** Caller must hold the allocation transaction lock before collecting occupied codes. */
export function nextCourseCode(prefix: string, occupied: string[]): string {
  let largest = 0n;
  for (const code of occupied) {
    if (!code.toUpperCase().startsWith(`${prefix}-`)) continue;
    const suffix = code.slice(prefix.length + 1);
    if (!/^\d+$/.test(suffix)) continue;
    const number = BigInt(suffix);
    if (number > largest) largest = number;
  }
  const candidate = `${prefix}-${String(largest + 1n).padStart(3, '0')}`;
  if (candidate.length > 30)
    throw new ConflictException({
      code: 'COURSE_CODE_EXHAUSTED',
      message:
        'Automatic numbering for this department has reached the 30-character course-code limit. Supply a unique official code.',
    });
  return candidate;
}

export function courseCreationKey(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException({
      code: 'IDEMPOTENCY_KEY_INVALID',
      message:
        'Idempotency-Key must be a UUID v4 generated once for this course-creation attempt.',
    });
  return value.toLowerCase();
}

/** Actual installed schema, independent of catalog size or a client-supplied switch. */
export async function courseCreationSchemaReady(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
): Promise<boolean> {
  const [result] = await db.$queryRaw<Array<{ ready: boolean }>>`
    SELECT EXISTS (SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname=current_schema() AND t.relname='reviewed_operations'
        AND c.conname='reviewed_operations_kind_check' AND c.convalidated
        AND position('''CREATE_COURSE''' in pg_get_constraintdef(c.oid))>0)
    AND EXISTS (SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname=current_schema() AND t.relname='reviewed_operations'
        AND c.conname='reviewed_operations_completion_check' AND c.convalidated)
    AND EXISTS (SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a
        ON a.attrelid=t.oid AND a.attnum=ANY(i.indkey)
      WHERE n.nspname=current_schema() AND t.relname='courses' AND a.attname='course_code'
        AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts=1
        AND i.indpred IS NULL AND i.indexprs IS NULL) AS ready
  `;
  return result?.ready === true;
}
