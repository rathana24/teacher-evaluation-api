import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.academic_years.findMany({
      orderBy: { name: 'desc' },
    });
  }

  async findOne(id: bigint) {
    const academicYear = await this.prisma.academic_years.findUnique({
      where: { id },
    });

    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }

    return academicYear;
  }

  async create(dto: CreateAcademicYearDto) {
    const startDate = dto.start_date ? new Date(dto.start_date) : null;
    const endDate = dto.end_date ? new Date(dto.end_date) : null;

    this.checkDateOrder(startDate, endDate);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Only one academic year should be active at a time
        if (dto.is_active === true) {
          await tx.academic_years.updateMany({
            where: { is_active: true },
            data: {
              is_active: false,
              updated_at: new Date(),
            },
          });
        }

        return tx.academic_years.create({
          data: {
            name: dto.name,
            start_year: dto.start_year ?? null,
            start_date: startDate,
            end_date: endDate,
            is_active: dto.is_active ?? false,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Academic year already exists');
      }

      throw e;
    }
  }

  async update(id: bigint, dto: UpdateAcademicYearDto) {
    const existing = await this.findOne(id);

    const startDate =
      dto.start_date !== undefined
        ? new Date(dto.start_date)
        : existing.start_date;

    const endDate =
      dto.end_date !== undefined
        ? new Date(dto.end_date)
        : existing.end_date;

    this.checkDateOrder(startDate, endDate);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // If this year becomes active, deactivate every other year
        if (dto.is_active === true) {
          await tx.academic_years.updateMany({
            where: {
              is_active: true,
              id: { not: id },
            },
            data: {
              is_active: false,
              updated_at: new Date(),
            },
          });
        }

        return tx.academic_years.update({
          where: { id },
          data: {
            name: dto.name,
            start_year: dto.start_year,
            start_date: startDate,
            end_date: endDate,
            is_active: dto.is_active,
            updated_at: new Date(),
          },
        });
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new ConflictException('Academic year already exists');
      }

      throw e;
    }
  }

  async remove(id: bigint) {
    await this.findOne(id);

    try {
      await this.prisma.academic_years.delete({
        where: { id },
      });
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new ConflictException(
          'Academic year is used by semesters and cannot be deleted',
        );
      }

      throw e;
    }
  }

  private checkDateOrder(start: Date | null, end: Date | null) {
    if (start && end && end <= start) {
      throw new BadRequestException(
        'end_date must be after start_date',
      );
    }
  }
}