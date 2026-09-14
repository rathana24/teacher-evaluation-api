import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.courses.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: bigint) {
    const course = await this.prisma.courses.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(dto: CreateCourseDto) {
    const now = new Date();
    try {
      return await this.prisma.courses.create({
        data: { ...dto, created_at: now, updated_at: now },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('course_code already exists');
      throw e;
    }
  }

  async update(id: bigint, dto: UpdateCourseDto) {
    await this.findOne(id);
    try {
      return await this.prisma.courses.update({
        where: { id },
        data: { ...dto, updated_at: new Date() },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('course_code already exists');
      throw e;
    }
  }

  async remove(id: bigint) {
    await this.findOne(id);
    await this.prisma.courses.delete({ where: { id } });
  }
}
