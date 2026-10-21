import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCourseOfferingDto } from './create-course-offering.dto';
import { AssignmentRowDto } from './reviewed-assignment.dto';

const sectionErrors = async (
  dto: typeof CreateCourseOfferingDto | typeof AssignmentRowDto,
  section_code: unknown,
) =>
  (await validate(plainToInstance(dto, { section_code })))
    .filter((error) => error.property === 'section_code')
    .flatMap((error) => Object.keys(error.constraints ?? {}));

describe.each([
  ['CreateCourseOfferingDto', CreateCourseOfferingDto],
  ['AssignmentRowDto', AssignmentRowDto],
] as const)('%s section_code', (_name, dto) => {
  it('accepts an omitted label and a normal label', async () => {
    expect(await sectionErrors(dto, undefined)).toEqual([]);
    expect(await sectionErrors(dto, 'I4-AMS-A')).toEqual([]);
    expect(await sectionErrors(dto, '  A  ')).toEqual([]);
  });

  it.each([['   '], ['\t\n']])(
    'rejects a whitespace-only label %p',
    async (section_code) => {
      expect(await sectionErrors(dto, section_code)).toEqual(['matches']);
    },
  );

  it.each([[''], [null], [5], ['x'.repeat(51)]])(
    'still rejects an invalid label %p',
    async (section_code) => {
      expect(await sectionErrors(dto, section_code)).not.toEqual([]);
    },
  );
});
