import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizeClassGroups } from '../common/utils/class-group.util';
import {
  AssignmentCreationPreviewDto,
  AssignmentRosterConfirmationDto,
} from './dto/reviewed-assignment.dto';

export const ASSIGNMENT_CREATE_KIND = 'CREATE_ASSIGNMENTS' as const;
export const ASSIGNMENT_CREATE_RESOURCE =
  'course-offerings:create-with-enrollments:v1';

export function assignmentId(value: string): string {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d{0,18}$/.test(value) ||
    BigInt(value) > 9223372036854775807n
  )
    throw new BadRequestException({
      code: 'ASSIGNMENT_ID_INVALID',
      message: 'IDs must be positive PostgreSQL bigint decimal strings.',
    });
  return BigInt(value).toString();
}

/** Canonical form binds all intentional input; it never supplies an omitted audience. */
export function assignmentInput(dto: AssignmentCreationPreviewDto) {
  const identities = new Set<string>(),
    keys = new Set<string>();
  if (
    !Array.isArray(dto.assignments) ||
    !dto.assignments.length ||
    dto.assignments.length > 50
  )
    throw new BadRequestException('Select 1–50 assignment rows.');
  const rows = dto.assignments
    .map((row) => {
      if (keys.has(row.row_key))
        throw new BadRequestException({
          code: 'ASSIGNMENT_ROW_DUPLICATE',
          message: 'Each row_key must be unique.',
        });
      keys.add(row.row_key);
      const identity = [
        assignmentId(row.lecturer_id),
        assignmentId(row.semester_id),
        row.class_type,
      ].join(':');
      if (identities.has(identity))
        throw new BadRequestException({
          code: 'ASSIGNMENT_IDENTITY_DUPLICATE',
          message:
            'Rows with the same lecturer, semester and class type have one identity regardless of labels/groups.',
        });
      identities.add(identity);
      if (
        !Array.isArray(row.group_scopes) ||
        !row.group_scopes.length ||
        row.group_scopes.length > 50
      )
        throw new BadRequestException({
          code: 'ASSIGNMENT_AUDIENCE_REQUIRED',
          message:
            'Every row needs explicit group scopes; an empty selection never means all students.',
        });
      const group_scopes = row.group_scopes
        .map((scope) => {
          if (
            !Array.isArray(scope.class_groups) ||
            !scope.class_groups.length ||
            scope.class_groups.length > 50
          )
            throw new BadRequestException(
              'Each scope requires 1–50 explicit class groups.',
            );
          return {
            academic_year_id: assignmentId(scope.academic_year_id),
            generation_id: assignmentId(scope.generation_id),
            major_id: assignmentId(scope.major_id),
            year_level: scope.year_level,
            class_groups: normalizeClassGroups(scope.class_groups).sort(),
            ...(scope.curriculum_revision_id !== undefined
              ? {
                  curriculum_revision_id: assignmentId(
                    scope.curriculum_revision_id,
                  ),
                }
              : {}),
          };
        })
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
      return {
        row_key: row.row_key,
        lecturer_id: assignmentId(row.lecturer_id),
        semester_id: assignmentId(row.semester_id),
        class_type: row.class_type,
        ...(row.section_code !== undefined
          ? { section_code: row.section_code.trim() }
          : {}),
        group_scopes,
      };
    })
    .sort((a, b) => a.row_key.localeCompare(b.row_key));
  return {
    course_id: assignmentId(dto.course_id),
    academic_year_id: assignmentId(dto.academic_year_id),
    year_level: dto.year_level,
    assignments: rows,
  };
}

export function assignmentConfirmations(
  rows: AssignmentRosterConfirmationDto[],
) {
  const keys = new Set<string>();
  let total = 0;
  if (!Array.isArray(rows) || !rows.length || rows.length > 50)
    throw new BadRequestException('Exact row confirmations are required.');
  return rows
    .map((row) => {
      if (keys.has(row.row_key))
        throw new BadRequestException('Duplicate confirmation row_key.');
      keys.add(row.row_key);
      if (
        !Array.isArray(row.confirmed_student_ids) ||
        !row.confirmed_student_ids.length
      )
        throw new BadRequestException(
          'Every row requires its exact nonempty reviewed roster.',
        );
      const ids = row.confirmed_student_ids.map(assignmentId);
      if (new Set(ids).size !== ids.length)
        throw new BadRequestException(
          'Duplicate confirmed student IDs are invalid.',
        );
      total += ids.length;
      if (total > 10000)
        throw new BadRequestException(
          'At most 10,000 student-to-assignment memberships are supported per operation.',
        );
      return { row_key: row.row_key, confirmed_student_ids: ids.sort() };
    })
    .sort((a, b) => a.row_key.localeCompare(b.row_key));
}

/** Inspect the actual connected namespace, including an empty installation. */
export async function assignmentCreationSchemaReady(
  db: Pick<Prisma.TransactionClient, '$queryRaw'>,
): Promise<boolean> {
  const [row] = await db.$queryRaw<Array<{ ready: boolean }>>`
    SELECT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=current_schema()
      AND t.relname='reviewed_operations' AND c.conname='reviewed_operations_kind_check'
      AND c.convalidated AND position('''CREATE_ASSIGNMENTS''' in pg_get_constraintdef(c.oid))>0)
    AND EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=current_schema()
      AND t.relname='reviewed_operations' AND c.conname='reviewed_operations_completion_check' AND c.convalidated)
    AND EXISTS(SELECT 1 FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
      JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname=current_schema() AND t.relname='course_offerings'
      AND x.relname='course_offerings_complete_identity_idx' AND i.indisunique AND i.indisvalid AND i.indisready
      AND i.indnkeyatts=5 AND i.indexprs IS NULL
      AND (SELECT array_agg(a.attname::text ORDER BY k.ordinality) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ordinality)
        JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum)
        = ARRAY['course_id','lecturer_id','semester_id','year_level','class_type']
      AND regexp_replace(pg_get_expr(i.indpred,i.indrelid),'[()[:space:]]','','g')='year_levelISNOTNULLANDclass_typeISNOTNULL') AS ready
  `;
  return row?.ready === true;
}
