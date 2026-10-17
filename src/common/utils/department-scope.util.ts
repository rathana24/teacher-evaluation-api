import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** ADMIN authority is installation-wide; department membership is staff metadata. */
export async function assertDepartmentScope(
  db: PrismaService,
  actorId: bigint,
  _departmentId?: bigint,
): Promise<bigint[]> {
  const actor = await db.users.findUnique({
    where: { id: actorId },
    select: { role: true, status: true },
  });
  if (!actor || actor.status !== 'ACTIVE') throw new UnauthorizedException();
  if (actor.role !== 'ADMIN')
    throw new ForbiddenException('Administrator access is required');
  return [];
}
