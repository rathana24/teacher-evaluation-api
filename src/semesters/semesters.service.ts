import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSemesterDto } from './dto/create-semester.dto';
import { UpdateSemesterDto } from './dto/update-semester.dto';
import { inSerializableTransaction } from '../common/utils/serializable-transaction.util';
import { calendarDate } from '../common/utils/calendar-date.util';
import { throwKnownDatabaseConstraint } from '../common/utils/database-constraint.util';

@Injectable()
export class SemestersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.semesters.findMany({
      include: {
        academic_years: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: bigint) {
    const semester = await this.prisma.semesters.findUnique({
      where: { id },
      include: {
        academic_years: true,
      },
    });

    if (!semester) {
      throw new NotFoundException('Semester not found');
    }

    return semester;
  }

  async create(dto: CreateSemesterDto) {
    const startDate = calendarDate(dto.start_date);

    const endDate = calendarDate(dto.end_date);

    this.checkDateOrder(startDate, endDate);

    // Make sure academic year exists
    await this.checkAcademicYear(BigInt(dto.academic_year_id));

    const now = new Date();

    try {
      return await this.prisma.semesters.create({
        data: {
          semester_name: dto.semester_name,
          semester_number: dto.semester_number,
          academic_year_id: BigInt(dto.academic_year_id),
          start_date: startDate,
          end_date: endDate,
          created_at: now,
          updated_at: now,
        },
        include: {
          academic_years: true,
        },
      });
    } catch (e: any) {
      throwKnownDatabaseConstraint(e);
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Semester name or semester number already exists for this academic year',
        );
      }

      if (e.code === 'P2003') {
        throw new BadRequestException('Invalid academic_year_id');
      }

      throw e;
    }
  }

  async update(id: bigint, dto: UpdateSemesterDto) {
    return inSerializableTransaction(this.prisma, (db) =>
      new SemestersService(db).updateInTransaction(id, dto),
    );
  }

  private async updateInTransaction(id: bigint, dto: UpdateSemesterDto) {
    const existing = await this.findOne(id);

    if (
      dto.academic_year_id !== undefined &&
      BigInt(dto.academic_year_id) !== existing.academic_year_id
    ) {
      const evaluationCount = await this.prisma.evaluations.count({
        where: { course_offerings: { semester_id: id } },
      });
      if (evaluationCount > 0)
        throw new ConflictException({
          code: 'SEMESTER_HISTORY_PROTECTED',
          message:
            'A semester used by evaluated offerings keeps its original academic year. Create a new semester and offering for a changed teaching context.',
        });
    }

    const startDate =
      dto.start_date !== undefined
        ? calendarDate(dto.start_date)
        : existing.start_date;

    const endDate =
      dto.end_date !== undefined ? calendarDate(dto.end_date) : existing.end_date;

    this.checkDateOrder(startDate, endDate);

    if (dto.academic_year_id !== undefined) {
      await this.checkAcademicYear(BigInt(dto.academic_year_id));
    }

    try {
      return await this.prisma.semesters.update({
        where: { id },
        data: {
          semester_name: dto.semester_name,

          semester_number:
            dto.semester_number !== undefined ? dto.semester_number : undefined,

          academic_year_id:
            dto.academic_year_id !== undefined
              ? BigInt(dto.academic_year_id)
              : undefined,

          start_date: startDate,
          end_date: endDate,
          updated_at: new Date(),
        },
        include: {
          academic_years: true,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException(
          'Semester name or semester number already exists for this academic year',
        );
      }

      if (e.code === 'P2003') {
        throw new BadRequestException('Invalid academic_year_id');
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.semesters.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Semester is used by course offerings and cannot be deleted',
        );
      }

      throw e;
    }
  }

  private async checkAcademicYear(id: bigint) {
    const academicYear = await this.prisma.academic_years.findUnique({
      where: { id },
    });

    if (!academicYear) {
      throw new BadRequestException('Academic year not found');
    }
  }

  private checkDateOrder(start: Date | null, end: Date | null) {
    if (start && end && end <= start) {
      throw new BadRequestException('end_date must be after start_date');
    }
  }
}
