import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentGenerationDto } from './dto/create-student-generation.dto';
import { UpdateStudentGenerationDto } from './dto/update-student-generation.dto';
import { cohortNumber } from './validation/cohort-fields';
import { requireCohortWriteSchema } from '../common/utils/cohort-write-policy';

const catalogSelect = {
  id: true,
  name: true,
  entry_academic_year_id: true,
  starting_year_level: true,
  ownership_state: true,
  major_id: true,
  generation_number: true,
  created_at: true,
  updated_at: true,
  entry_academic_year: true,
  majors: { select: { id: true, code: true, name: true, department_id: true } },
  _count: { select: { students: true, evaluation_targets: true } },
} satisfies Prisma.student_generationsSelect;

@Injectable()
export class StudentGenerationsService {
  constructor(private prisma: PrismaService) {}
  findAll(majorId?: bigint) {
    return this.prisma.student_generations.findMany({
      where: majorId === undefined ? undefined : { major_id: majorId },
      select: catalogSelect,
      orderBy: [
        { major_id: { sort: 'asc', nulls: 'last' } },
        { generation_number: { sort: 'asc', nulls: 'last' } },
        { name: 'asc' },
        { id: 'asc' },
      ],
    });
  }
  async findOne(id: bigint) {
    const row = await this.prisma.student_generations.findUnique({
      where: { id },
      select: catalogSelect,
    });
    if (!row) throw new NotFoundException('Student generation not found');
    return row;
  }
  private level(value: unknown) {
    if (
      value !== undefined &&
      (typeof value !== 'number' ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > 5)
    )
      throw new BadRequestException(
        'Starting year level must be between 1 and 5',
      );
  }
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
  private mapError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002')
        throw new ConflictException({
          code: 'COHORT_EXISTS',
          message: 'This major already has that generation number',
        });
      if (error.code === 'P2003')
        throw new ConflictException(
          'Student generation is referenced by academic history and cannot be removed',
        );
    }
    throw error;
  }
  async create(dto: CreateStudentGenerationDto) {
    const majorId = this.id(dto.major_id, 'major_id');
    const yearId = this.id(
      dto.entry_academic_year_id,
      'entry_academic_year_id',
    );
    const number = cohortNumber(dto.generation_number, dto.name);
    this.level(dto.starting_year_level);
    return inSerializableTransaction(
      this.prisma,
      async (db) => {
        await requireCohortWriteSchema(db);
        const major = await db.majors.findUnique({
          where: { id: majorId },
          select: { id: true, departments: { select: { status: true } } },
        });
        if (!major) throw new NotFoundException('Major not found');
        if (major.departments.status !== 'ACTIVE')
          throw new BadRequestException(
            'New cohorts require an active major department',
          );
        const year = await db.academic_years.findUnique({
          where: { id: yearId },
          select: { id: true, start_year: true },
        });
        if (!year) throw new NotFoundException('Academic year not found');
        if (year.start_year == null)
          throw new BadRequestException(
            'Entry academic year needs a structured start_year',
          );
        return db.student_generations.create({
          data: {
            name: `Gen ${number}`,
            ownership_state: 'MAJOR_SCOPED',
            major_id: majorId,
            generation_number: number,
            entry_academic_year_id: yearId,
            starting_year_level: dto.starting_year_level ?? 1,
          },
          select: catalogSelect,
        });
      },
      (error: unknown) => this.mapError(error),
    );
  }
  async update(id: bigint, dto: UpdateStudentGenerationDto) {
    this.level(dto.starting_year_level);
    return inSerializableTransaction(
      this.prisma,
      async (db) => {
        const current = await new StudentGenerationsService(db).findOne(id);
        if (current.ownership_state === 'MAJOR_SCOPED') {
          const number =
            dto.generation_number !== undefined || dto.name !== undefined
              ? cohortNumber(dto.generation_number, dto.name)
              : current.generation_number;
          if (
            (dto.major_id !== undefined &&
              this.id(dto.major_id, 'major_id') !== current.major_id) ||
            number !== current.generation_number ||
            (dto.entry_academic_year_id !== undefined &&
              this.id(dto.entry_academic_year_id, 'entry_academic_year_id') !==
                current.entry_academic_year_id) ||
            (dto.starting_year_level !== undefined &&
              dto.starting_year_level !== current.starting_year_level)
          )
            throw new ConflictException({
              code: 'COHORT_IDENTITY_IMMUTABLE',
              message:
                'Major, cohort number and entry metadata require a reviewed migration, not a catalog edit',
            });
          return current;
        }
        if (dto.major_id !== undefined || dto.generation_number !== undefined)
          throw new ConflictException({
            code: 'COHORT_MAPPING_REQUIRED',
            message: 'Legacy ownership requires an explicit reviewed mapping',
          });
        const yearId =
          dto.entry_academic_year_id !== undefined
            ? this.id(dto.entry_academic_year_id, 'entry_academic_year_id')
            : undefined;
        if (
          yearId !== undefined &&
          !(await db.academic_years.findUnique({
            where: { id: yearId },
            select: { id: true },
          }))
        )
          throw new NotFoundException('Academic year not found');
        const name = dto.name?.trim().replace(/\s+/g, ' ');
        if (name !== undefined && (!name || Array.from(name).length > 100))
          throw new BadRequestException(
            'Legacy display label must contain 1 to 100 characters',
          );
        return db.student_generations.update({
          where: { id },
          data: {
            name,
            entry_academic_year_id: yearId,
            starting_year_level: dto.starting_year_level,
          },
          select: catalogSelect,
        });
      },
      (error: unknown) => this.mapError(error),
    );
  }
  async remove(id: bigint) {
    return inSerializableTransaction(
      this.prisma,
      async (db) => {
        const row = await new StudentGenerationsService(db).findOne(id);
        const provenance = await db.student_generations.findUniqueOrThrow({
          where: { id },
          select: { mapping_operation_id: true },
        });
        if (
          row._count.students ||
          row._count.evaluation_targets ||
          provenance.mapping_operation_id
        )
          throw new ConflictException(
            'Student generation is referenced by students, evaluations or mapping history and cannot be deleted',
          );
        await db.student_generations.delete({ where: { id } });
        return row;
      },
      (error: unknown) => this.mapError(error),
    );
  }
}
