import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Prisma } from '@prisma/client';
import { calendarDate } from '../common/utils/calendar-date.util';
import {
  AcademicYearSetupDto,
  CompleteAcademicYearSetupDto,
} from './dto/academic-year-setup.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';

export const YEAR_SETUP_KIND = 'SETUP_ACADEMIC_YEAR';
export const YEAR_SETUP_RESOURCE = 'academic-years:setup:v1';

export function yearSetupKey(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      message:
        'Supply an Idempotency-Key UUID v4 once per intentional setup and retain the same key and input across retries.',
    });
  return value.toLowerCase();
}

export function yearSetupId(value: string): bigint {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(value) ||
    BigInt(value) > 9223372036854775807n
  )
    throw new BadRequestException(
      'academic_year_id must be a positive PostgreSQL bigint string',
    );
  return BigInt(value);
}

function dates(value: {
  start_date?: string | null;
  end_date?: string | null;
}) {
  const start_date = calendarDate(value.start_date),
    end_date = calendarDate(value.end_date);
  if (start_date && end_date && end_date <= start_date)
    throw new BadRequestException('end_date must be after start_date');
  return { start_date, end_date };
}

export function yearSetupInput(
  raw: AcademicYearSetupDto | CompleteAcademicYearSetupDto,
  targetId?: string,
) {
  const dto =
    targetId === undefined
      ? plainToInstance(AcademicYearSetupDto, raw)
      : plainToInstance(CompleteAcademicYearSetupDto, raw);
  if (
    validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }).length
  )
    throw new BadRequestException(
      'Invalid year setup input; supply a year for creation and exactly two valid numbered semesters',
    );
  const semesters = dto.semesters
    .map((semester) => ({
      semester_number: semester.semester_number,
      semester_name: semester.semester_name,
      ...dates(semester),
    }))
    .sort((a, b) => a.semester_number - b.semester_number);
  if (
    semesters[0].semester_number !== 1 ||
    semesters[1].semester_number !== 2 ||
    semesters[0].semester_name === semesters[1].semester_name
  )
    throw new BadRequestException(
      'Supply distinct names and exactly semester numbers 1 and 2',
    );
  const year =
    targetId === undefined
      ? ((dto as AcademicYearSetupDto).academic_year as CreateAcademicYearDto)
      : null;
  return {
    mode: targetId === undefined ? 'CREATE' : 'COMPLETE_MISSING',
    academic_year_id:
      targetId === undefined ? null : String(yearSetupId(targetId)),
    academic_year: year
      ? {
          name: year.name,
          start_year: year.start_year ?? null,
          is_active: year.is_active ?? false,
          ...dates(year),
        }
      : null,
    semesters,
  };
}

/** Feature gate checks the connected namespace, including an empty installation. */
export async function yearSetupSchemaReady(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
): Promise<boolean> {
  const [result] = await db.$queryRaw<Array<{ ready: boolean }>>`
    SELECT EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=current_schema()
      AND t.relname='reviewed_operations' AND c.conname='reviewed_operations_kind_check'
      AND c.convalidated AND position('''SETUP_ACADEMIC_YEAR''' in pg_get_constraintdef(c.oid))>0)
    AND EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=current_schema()
      AND t.relname='reviewed_operations' AND c.conname='reviewed_operations_completion_check' AND c.convalidated)
    AS ready
  `;
  return result?.ready === true;
}
