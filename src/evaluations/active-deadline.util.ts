import { BadRequestException, ConflictException } from '@nestjs/common';
import { isISO8601 } from 'class-validator';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

/** Call inside the schedule's serializable transaction using one server-time sample. */
export function activeDeadlineExtension(
  evaluation: { status: string; start_at: Date | null; end_at: Date | null },
  dto: UpdateScheduleDto,
  now = new Date(),
): Date {
  if (
    evaluation.status !== 'OPEN' ||
    !evaluation.start_at ||
    !evaluation.end_at ||
    now < evaluation.start_at ||
    now >= evaluation.end_at
  )
    throw new ConflictException({
      code: 'EVALUATION_NOT_ACTIVE',
      message:
        'Only DRAFT schedules or currently active OPEN deadlines can be changed. Upcoming, expired and CLOSED evaluations cannot be extended.',
    });
  // Transformed DTO instances initialize omitted optional fields to undefined.
  // JSON cannot transmit undefined; explicit null and every supplied value reject.
  if (dto.start_at !== undefined)
    throw new BadRequestException({
      code: 'ACTIVE_DEADLINE_START_IMMUTABLE',
      message:
        'An active deadline extension accepts end_at only. Do not supply start_at, even unchanged or null.',
    });
  const deadline = new Date(dto.end_at ?? '');
  if (
    typeof dto.end_at !== 'string' ||
    !isISO8601(dto.end_at, { strict: true, strictSeparator: true }) ||
    !Number.isFinite(deadline.getTime()) ||
    deadline <= evaluation.end_at
  )
    throw new BadRequestException({
      code: 'ACTIVE_DEADLINE_MUST_INCREASE',
      message:
        'Supply a valid ISO end_at strictly later than the current deadline.',
    });
  return deadline;
}
