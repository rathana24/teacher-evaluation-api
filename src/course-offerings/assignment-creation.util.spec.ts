import { BadRequestException } from '@nestjs/common';
import {
  assignmentId,
  assignmentInput,
  assignmentConfirmations,
  assignmentCreationSchemaReady,
} from './assignment-creation.util';
import { AssignmentCreationPreviewDto } from './dto/reviewed-assignment.dto';

const body = (): AssignmentCreationPreviewDto => ({
  course_id: '1',
  academic_year_id: '2',
  year_level: 3,
  assignments: [
    {
      row_key: 'course',
      lecturer_id: '3',
      semester_id: '4',
      class_type: 'COURSE',
      group_scopes: [
        {
          academic_year_id: '2',
          generation_id: '5',
          major_id: '6',
          year_level: 3,
          class_groups: [' b ', 'A'],
        },
      ],
    },
  ],
});
describe('Reviewed assignment input and deployment boundaries', () => {
  it.each(['1', '9007199254740993', '9223372036854775807'])(
    'retains exact bigint ID %s',
    (id) => {
      expect(assignmentId(id)).toBe(id);
    },
  );
  it.each(['0', '-1', '01', '9223372036854775808', '1.2', '1e3', '', null, 1])(
    'rejects unsafe/malformed ID %j',
    (id) => {
      expect(() => assignmentId(id as string)).toThrow(BadRequestException);
    },
  );
  it('canonicalizes only intentional ordering and group normalization without widening audiences', () => {
    const input = body(),
      other = body();
    other.assignments[0].group_scopes[0].class_groups = ['A', 'B'];
    expect(assignmentInput(input)).toEqual(assignmentInput(other));
  });
  it.each([undefined, null, []])(
    'rejects omitted/empty assignment rows %j',
    (assignments) => {
      expect(() =>
        assignmentInput({
          ...body(),
          assignments,
        } as AssignmentCreationPreviewDto),
      ).toThrow(BadRequestException);
    },
  );
  it.each([undefined, null, []])(
    'never supplies a missing audience %j',
    (group_scopes) => {
      const dto = body();
      dto.assignments[0].group_scopes = group_scopes as any;
      expect(() => assignmentInput(dto)).toThrow(BadRequestException);
    },
  );
  it('rejects an entire request containing a duplicate identity with another label', () => {
    const dto = body();
    dto.assignments.push({
      ...dto.assignments[0],
      row_key: 'another',
      section_code: 'Another label',
    });
    expect(() => assignmentInput(dto)).toThrow('one identity');
  });
  it('binds class labels and explicit revision expectations to confirmation input', () => {
    const first = body(),
      second = body();
    second.assignments[0].section_code = 'Changed';
    expect(assignmentInput(first)).not.toEqual(assignmentInput(second));
    second.assignments[0].section_code = undefined;
    second.assignments[0].group_scopes[0].curriculum_revision_id = '8';
    expect(assignmentInput(first)).not.toEqual(assignmentInput(second));
  });
  it('rejects 51 rows before any database operation', () => {
    const dto = body();
    dto.assignments = Array.from({ length: 51 }, (_, i) => ({
      ...dto.assignments[0],
      row_key: String(i),
    }));
    expect(() => assignmentInput(dto)).toThrow('1–50');
  });
  it('rejects repeated confirmation rows and duplicate numeric student identities', () => {
    const row = { row_key: 'a', confirmed_student_ids: ['1'] };
    expect(() => assignmentConfirmations([row, row])).toThrow(
      'Duplicate confirmation',
    );
    expect(() =>
      assignmentConfirmations([
        { row_key: 'a', confirmed_student_ids: ['1', '1'] },
      ]),
    ).toThrow('Duplicate confirmed');
  });
  it('retains exact unique user IDs and stable ordering in confirmation', () => {
    expect(
      assignmentConfirmations([
        { row_key: 'b', confirmed_student_ids: ['9', '2'] },
        { row_key: 'a', confirmed_student_ids: ['3'] },
      ]),
    ).toEqual([
      { row_key: 'a', confirmed_student_ids: ['3'] },
      { row_key: 'b', confirmed_student_ids: ['2', '9'] },
    ]);
  });
  it('accepts exactly 10,000 memberships and rejects 10,001', () => {
    const confirmed_student_ids = Array.from({ length: 10000 }, (_, i) =>
      String(i + 1),
    );
    expect(
      assignmentConfirmations([{ row_key: 'a', confirmed_student_ids }])[0]
        .confirmed_student_ids,
    ).toHaveLength(10000);
    expect(() =>
      assignmentConfirmations([
        { row_key: 'a', confirmed_student_ids },
        { row_key: 'b', confirmed_student_ids: ['1'] },
      ]),
    ).toThrow('10,000');
  });
  it.each([true, false, undefined, 'true'])(
    'advertises only literal catalog readiness %j',
    async (ready) => {
      const db = { $queryRaw: async () => [{ ready }] };
      expect(await assignmentCreationSchemaReady(db as any)).toBe(
        ready === true,
      );
    },
  );
});
