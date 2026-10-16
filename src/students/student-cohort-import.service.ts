import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizeClassGroup } from '../common/utils/class-group.util';
import { PrismaService } from '../prisma/prisma.service';
import { cohortNumber } from '../student-generations/validation/cohort-fields';
import { ImportStudentsDto } from './dto/import-students.dto';
import { requireCohortWriteSchema } from '../common/utils/cohort-write-policy';

const cohortSelect = {
  id: true,
  name: true,
  major_id: true,
  generation_number: true,
  ownership_state: true,
  entry_academic_year_id: true,
  starting_year_level: true,
  entry_academic_year: { select: { id: true, start_year: true } },
  majors: { select: { id: true, code: true, name: true, department_id: true } },
} satisfies Prisma.student_generationsSelect;
type Cohort = Prisma.student_generationsGetPayload<{
  select: typeof cohortSelect;
}>;
type Db = Prisma.TransactionClient;
type Result = {
  row: number;
  student_code: string;
  status: 'CREATED' | 'SKIPPED' | 'FAILED';
  message: string;
  student_id?: string;
};

/** Additive major-aware path. Unscoped legacy import stays in StudentImportService. */
export class StudentCohortImportService {
  constructor(private readonly prisma: PrismaService) {}

  private id(value: unknown, field: string): bigint {
    if (
      typeof value !== 'string' ||
      !/^[1-9]\d{0,18}$/.test(value) ||
      (value.length === 19 && value > '9223372036854775807')
    )
      throw new BadRequestException(
        `${field} must be a positive decimal string up to 9223372036854775807`,
      );
    return BigInt(value);
  }
  private level(value: unknown, field: string) {
    if (
      typeof value !== 'number' ||
      !Number.isInteger(value) ||
      value < 1 ||
      value > 5
    )
      throw new BadRequestException(`${field} must be between 1 and 5`);
  }
  private async major(db: Db, id: bigint) {
    const major = await db.majors.findUnique({
      where: { id },
      select: { id: true, departments: { select: { status: true } } },
    });
    if (!major) throw new NotFoundException('Major not found');
    if (major.departments.status !== 'ACTIVE')
      throw new BadRequestException(
        'Major-aware imports require an active major department',
      );
  }
  private async rowMajor(db: Db, input: string, id: bigint) {
    const value = input.trim().replace(/\s+/g, ' ');
    const matches = await db.majors.findMany({
      where: {
        OR: [
          { code: { equals: value, mode: 'insensitive' } },
          { name: { equals: value, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    if (matches.length > 1)
      throw new ConflictException(
        'A spreadsheet major is ambiguous; use its unique major code',
      );
    if (matches.length !== 1 || matches[0].id !== id)
      throw new BadRequestException(
        'Every spreadsheet major must resolve to the requested major_id',
      );
  }
  private async placementYear(db: Db, id: bigint, cohort?: Cohort) {
    const year = await db.academic_years.findUnique({
      where: { id },
      select: { id: true, name: true, start_year: true },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    if (year.start_year === null)
      throw new BadRequestException(
        'Placement academic year needs a structured start_year',
      );
    if (
      cohort &&
      (cohort.entry_academic_year.start_year === null ||
        cohort.entry_academic_year.start_year > year.start_year)
    )
      throw new BadRequestException(
        'Cohort entry year must be structured and no later than the placement year',
      );
    return year;
  }
  private codeConflict(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      Array.isArray(error.meta?.target) &&
      error.meta.target.some((field) => String(field).includes('student_code'))
    );
  }
  private retryable(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }
  private async prepare(
    dto: ImportStudentsDto,
    majorId: bigint,
    number: number,
    yearId: bigint,
  ) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (db) => {
            // Pair lock serializes major-aware imports; the unique key also arbitrates catalog creation.
            await db.$executeRaw`SET LOCAL lock_timeout = '5s'`;
            await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`cohort-import:${majorId}:${number}`}, 0))::text`;
            await this.major(db, majorId);
            for (const input of new Set(
              dto.students.map((row) =>
                row.major.trim().replace(/\s+/g, ' ').toLowerCase(),
              ),
            ))
              await this.rowMajor(db, input, majorId);
            const year = await this.placementYear(db, yearId);
            let cohort = await db.student_generations.findUnique({
              where: {
                major_id_generation_number: {
                  major_id: majorId,
                  generation_number: number,
                },
              },
              select: cohortSelect,
            });
            if (!cohort) {
              if (dto.entry_academic_year_id === undefined)
                throw new BadRequestException(
                  'entry_academic_year_id is required for a new major-owned cohort',
                );
              const entryId = this.id(
                dto.entry_academic_year_id,
                'entry_academic_year_id',
              );
              const entry = await db.academic_years.findUnique({
                where: { id: entryId },
                select: { id: true, start_year: true },
              });
              if (!entry)
                throw new NotFoundException('Entry academic year not found');
              if (
                entry.start_year === null ||
                entry.start_year > year.start_year!
              )
                throw new BadRequestException(
                  'Cohort entry year must be structured and no later than the placement year',
                );
              cohort = await db.student_generations.create({
                data: {
                  name: `Gen ${number}`,
                  major_id: majorId,
                  generation_number: number,
                  ownership_state: 'MAJOR_SCOPED',
                  entry_academic_year_id: entry.id,
                  starting_year_level: dto.starting_year_level ?? 1,
                },
                select: cohortSelect,
              });
            }
            await this.placementYear(db, yearId, cohort);
            return { cohort, year };
          },
          { maxWait: 5000, timeout: 20000 },
        );
      } catch (error) {
        if (
          attempt < 2 &&
          (this.retryable(error) ||
            (error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'))
        )
          continue;
        if (
          this.retryable(error) ||
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            (['P2002', 'P2028'].includes(error.code) ||
              (error.code === 'P2010' &&
                ['55P03', '40P01'].includes(String(error.meta?.code)))))
        )
          throw new ConflictException(
            'Cohort import conflicted; review and retry',
          );
        throw error;
      }
    }
  }
  async importStudents(dto: ImportStudentsDto) {
    await requireCohortWriteSchema(this.prisma);
    const majorId = this.id(dto.major_id, 'major_id');
    const number = cohortNumber(dto.generation_number, dto.generation);
    const yearId = this.id(dto.academic_year_id, 'academic_year_id');
    if (dto.entry_academic_year_id !== undefined)
      this.id(dto.entry_academic_year_id, 'entry_academic_year_id');
    this.level(dto.year_level, 'year_level');
    if (dto.starting_year_level !== undefined)
      this.level(dto.starting_year_level, 'starting_year_level');
    const group = normalizeClassGroup(dto.class_group);
    if (
      dto.initial_password !== undefined &&
      typeof dto.initial_password !== 'string'
    )
      throw new BadRequestException('Initial password must be a string');
    const password =
      dto.initial_password === undefined || dto.initial_password.trim() === ''
        ? 'password@1235'
        : dto.initial_password;
    if (
      password.length < 6 ||
      password.length > 72 ||
      Buffer.byteLength(password, 'utf8') > 72
    )
      throw new BadRequestException(
        'Initial password must be 6 to 72 characters and at most 72 UTF-8 bytes',
      );
    const codes = dto.students.map((row) =>
      row.student_code.trim().toLowerCase(),
    );
    if (codes.some((code) => !code) || new Set(codes).size !== codes.length)
      throw new BadRequestException(
        'Student codes must be nonblank and unique within the import',
      );
    const { cohort, year } = await this.prepare(dto, majorId, number, yearId);
    const existing = await this.prisma.students.findMany({
      where: { student_code: { in: codes } },
      select: { student_code: true },
    });
    const known = new Set(existing.map((row) => row.student_code));
    const results: Result[] = [];
    for (const [index, row] of dto.students.entries()) {
      const result = { row: index + 1, student_code: codes[index] };
      if (known.has(codes[index])) {
        results.push({
          ...result,
          status: 'SKIPPED',
          message: 'Student code already exists',
        });
        continue;
      }
      try {
        const passwordHash = await bcrypt.hash(password, 10);
        let student: { id: bigint };
        for (let attempt = 0; ; attempt++) {
          try {
            student = await this.prisma.$transaction(
              async (db) => {
                await this.major(db, majorId);
                await this.rowMajor(db, row.major, majorId);
                const current = await db.student_generations.findUnique({
                  where: { id: cohort.id },
                  select: cohortSelect,
                });
                if (
                  !current ||
                  current.ownership_state !== 'MAJOR_SCOPED' ||
                  current.major_id !== majorId ||
                  current.generation_number !== number
                )
                  throw new ConflictException(
                    'Cohort context changed; review and retry',
                  );
                await this.placementYear(db, yearId, current);
                const user = await db.users.create({
                  data: {
                    email: null,
                    password_hash: passwordHash,
                    full_name: row.full_name?.trim() || codes[index],
                    gender: row.gender ?? null,
                    role: 'STUDENT',
                    status: 'ACTIVE',
                    created_at: new Date(),
                    updated_at: new Date(),
                  },
                  select: { id: true },
                });
                const profile = await db.students.create({
                  data: {
                    user_id: user.id,
                    student_code: codes[index],
                    generation_id: current.id,
                    notes: row.notes?.trim() || null,
                  },
                  select: { id: true },
                });
                const placement = await db.student_academic_records.create({
                  data: {
                    student_id: profile.id,
                    academic_year_id: yearId,
                    major_id: majorId,
                    generation_id: current.id,
                    year_level: dto.year_level,
                    class_group: group,
                  },
                  select: { id: true },
                });
                await db.student_cohort_assignment_events.create({
                  data: {
                    academic_record_id: placement.id,
                    student_id: profile.id,
                    academic_year_id: yearId,
                    major_id: majorId,
                    generation_id: current.id,
                    action: 'INITIAL',
                  },
                });
                return profile;
              },
              {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                maxWait: 5000,
                timeout: 20000,
              },
            );
            break;
          } catch (error) {
            if (attempt < 2 && this.retryable(error)) continue;
            throw error;
          }
        }
        known.add(codes[index]);
        results.push({
          ...result,
          status: 'CREATED',
          message: 'Student created successfully',
          student_id: student.id.toString(),
        });
      } catch (error) {
        if (this.codeConflict(error)) {
          known.add(codes[index]);
          results.push({
            ...result,
            status: 'SKIPPED',
            message: 'Student code already exists',
          });
        } else
          results.push({
            ...result,
            status: 'FAILED',
            message: 'Student could not be imported',
          });
      }
    }
    return {
      generation: {
        id: cohort.id.toString(),
        name: cohort.name,
        ownership_state: cohort.ownership_state,
        major_id: cohort.major_id!.toString(),
        generation_number: cohort.generation_number,
        majors: {
          ...cohort.majors!,
          id: cohort.majors!.id.toString(),
          department_id: cohort.majors!.department_id.toString(),
        },
        entry_academic_year_id: cohort.entry_academic_year_id.toString(),
        starting_year_level: cohort.starting_year_level,
      },
      academic_year: { ...year, id: year.id.toString() },
      summary: {
        total: results.length,
        created: results.filter((row) => row.status === 'CREATED').length,
        skipped: results.filter((row) => row.status === 'SKIPPED').length,
        failed: results.filter((row) => row.status === 'FAILED').length,
      },
      results,
    };
  }
}
