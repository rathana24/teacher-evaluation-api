import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { rejectUnscopedCohortWrite } from '../common/utils/cohort-write-policy';
import { normalizeClassGroup } from '../common/utils/class-group.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentAcademicRecordDto } from './dto/create-student-academic-record.dto';
import { UpdateStudentAcademicRecordDto } from './dto/update-student-academic-record.dto';

const timelineSelect = {
  id: true,
  generation_id: true,
  student_generations: { select: { ownership_state: true } },
  student_academic_records: {
    select: {
      id: true,
      academic_year_id: true,
      major_id: true,
      generation_id: true,
      academic_years: { select: { start_year: true } },
      student_generations: {
        select: { ownership_state: true, major_id: true },
      },
    },
  },
} satisfies Prisma.studentsSelect;
type Timeline = Prisma.studentsGetPayload<{ select: typeof timelineSelect }>;
type ExistingRecord = {
  id: bigint;
  student_id: bigint;
  academic_year_id: bigint;
  major_id: bigint;
  generation_id: bigint | null;
  cohort_assignment_event: { action: string } | null;
};

/** All calls run inside the caller's serializable academic-record transaction. */
export class StudentCohortPlacementService {
  constructor(private readonly prisma: PrismaService) {}
  async context(studentId: bigint) {
    const student = await this.prisma.students.findUnique({
      where: { id: studentId },
      select: timelineSelect,
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }
  tracked(student: Timeline) {
    return (
      student.student_generations.ownership_state === 'MAJOR_SCOPED' ||
      student.student_academic_records.some(
        (record) => record.generation_id !== null,
      )
    );
  }
  private review(code: string, message: string): never {
    throw new ConflictException({ code, message });
  }

  async create(
    dto: CreateStudentAcademicRecordDto,
    student: Timeline,
    validateProgression: () => Promise<void>,
  ) {
    if (dto.generation_id === undefined)
      throw new BadRequestException(
        'generation_id is required for a major-owned yearly placement',
      );
    const generationId = BigInt(dto.generation_id),
      yearId = BigInt(dto.academic_year_id),
      majorId = BigInt(dto.major_id);
    const [cohort, year, major] = await Promise.all([
      this.prisma.student_generations.findUnique({
        where: { id: generationId },
        select: {
          id: true,
          major_id: true,
          ownership_state: true,
          entry_academic_year: { select: { start_year: true } },
        },
      }),
      this.prisma.academic_years.findUnique({
        where: { id: yearId },
        select: { id: true, start_year: true },
      }),
      this.prisma.majors.findUnique({
        where: { id: majorId },
        select: { id: true, departments: { select: { status: true } } },
      }),
    ]);
    if (!cohort) throw new NotFoundException('Student generation not found');
    if (!year || !major)
      throw new NotFoundException('Academic year or major not found');
    if (cohort.ownership_state !== 'MAJOR_SCOPED')
      this.review(
        'COHORT_MAPPING_REQUIRED',
        'Unresolved legacy cohorts require reviewed mapping before explicit yearly assignment',
      );
    if (cohort.major_id !== majorId)
      throw new BadRequestException(
        'Destination cohort must belong to the selected major',
      );
    if (major.departments.status !== 'ACTIVE')
      throw new BadRequestException(
        'New yearly assignments require an active major department',
      );
    if (
      year.start_year == null ||
      cohort.entry_academic_year.start_year == null ||
      cohort.entry_academic_year.start_year > year.start_year
    )
      throw new BadRequestException(
        'Cohort entry year must be structured and no later than the placement year',
      );
    const history = student.student_academic_records;
    if (history.some((record) => record.academic_year_id === yearId))
      this.review(
        'ACADEMIC_RECORD_EXISTS',
        'An academic record already exists for this student and academic year',
      );
    const dates = history.map((record) => record.academic_years.start_year);
    if (
      dates.some((start) => start == null) ||
      new Set(dates).size !== dates.length
    )
      this.review(
        'COHORT_CHRONOLOGY_REVIEW_REQUIRED',
        'Existing yearly chronology is unresolved or ambiguous; review it before adding an assignment',
      );
    const ordered = history
      .slice()
      .sort(
        (a, b) => a.academic_years.start_year! - b.academic_years.start_year!,
      );
    const previous = ordered.at(-1);
    if (
      !previous ||
      previous.generation_id === null ||
      previous.student_generations?.ownership_state !== 'MAJOR_SCOPED'
    )
      this.review(
        'COHORT_MAPPING_REQUIRED',
        'A latest resolved yearly cohort is required; review legacy history before continuing or transferring',
      );
    if (year.start_year <= previous.academic_years.start_year!)
      this.review(
        'COHORT_CHRONOLOGY_REVIEW_REQUIRED',
        'New cohort assignments must follow the latest recorded year; backdated corrections require review',
      );
    if (
      student.generation_id !== previous.generation_id ||
      previous.student_generations!.major_id !== previous.major_id
    )
      this.review(
        'COHORT_CONTEXT_STALE',
        'Current profile and latest yearly cohort disagree; review the stored context before assigning',
      );
    const action = dto.progression_action ?? 'NORMAL';
    const changed = generationId !== previous.generation_id;
    if (changed !== (action === 'TRANSFER'))
      throw new BadRequestException(
        changed
          ? 'A cohort change requires explicit progression_action=TRANSFER'
          : 'TRANSFER requires an explicit different destination cohort',
      );
    await validateProgression();
    const placement = await this.prisma.student_academic_records.create({
      data: {
        student_id: student.id,
        academic_year_id: yearId,
        major_id: majorId,
        generation_id: generationId,
        year_level: dto.year_level,
        class_group: normalizeClassGroup(dto.class_group),
        progression_action: action,
      },
      select: { id: true },
    });
    await this.prisma.student_cohort_assignment_events.create({
      data: {
        academic_record_id: placement.id,
        student_id: student.id,
        academic_year_id: yearId,
        major_id: majorId,
        generation_id: generationId,
        action: changed ? 'TRANSFER' : 'INITIAL',
        ...(changed && { previous_generation_id: previous.generation_id }),
      },
    });
    // Only the latest append can advance this compatibility pointer; older links remain untouched.
    if (changed)
      await this.prisma.students.update({
        where: { id: student.id },
        data: { generation_id: generationId },
      });
    return placement.id;
  }

  async validateUpdate(
    record: ExistingRecord,
    dto: UpdateStudentAcademicRecordDto,
  ) {
    const same = (value: string | undefined, current: bigint) =>
      value === undefined || BigInt(value) === current;
    const identityChanged =
      !same(dto.student_id, record.student_id) ||
      !same(dto.academic_year_id, record.academic_year_id) ||
      !same(dto.major_id, record.major_id);
    if (record.generation_id !== null) {
      if (identityChanged || !same(dto.generation_id, record.generation_id))
        this.review(
          'COHORT_ASSIGNMENT_IMMUTABLE',
          'Resolved student/year/major/cohort identity cannot be relabeled; use a new yearly transfer or reviewed correction',
        );
      if (
        dto.progression_action === 'TRANSFER' &&
        record.cohort_assignment_event?.action !== 'TRANSFER'
      )
        this.review(
          'COHORT_TRANSFER_REQUIRES_NEW_PLACEMENT',
          'A transfer requires a new yearly placement and destination cohort, not a changed progression label',
        );
      return;
    }
    if (dto.generation_id !== undefined)
      this.review(
        'COHORT_MAPPING_REQUIRED',
        'Unresolved yearly cohort history requires a reviewed mapping, not a record edit',
      );
    if (identityChanged || dto.progression_action === 'TRANSFER') {
      rejectUnscopedCohortWrite();
      const original = await this.context(record.student_id);
      const target =
        dto.student_id !== undefined &&
        BigInt(dto.student_id) !== record.student_id
          ? await this.context(BigInt(dto.student_id))
          : original;
      if (this.tracked(original) || this.tracked(target))
        this.review(
          'COHORT_MAPPING_REQUIRED',
          'Legacy identity changes in a cohort-tracked history require review',
        );
    }
  }
  async protectRemoval(record: {
    student_id: bigint;
    generation_id: bigint | null;
  }) {
    if (
      record.generation_id !== null ||
      this.tracked(await this.context(record.student_id))
    )
      this.review(
        'COHORT_ASSIGNMENT_PROTECTED',
        'Yearly cohort history and its immutable assignment evidence must be retained',
      );
  }
}
