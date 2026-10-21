import { describe, expect, it } from '@jest/globals';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateCourseOfferingDto } from './update-course-offering.dto';

const errorsFor = async (body: Record<string, unknown>) =>
  (await validate(plainToInstance(UpdateCourseOfferingDto, body))).map(
    (error) => error.property,
  );

describe('UpdateCourseOfferingDto section_code', () => {
  it('accepts null as an explicit request to clear the label', async () => {
    expect(await errorsFor({ section_code: null })).toEqual([]);
  });

  it('accepts an omitted label and a normal label', async () => {
    expect(await errorsFor({})).toEqual([]);
    expect(await errorsFor({ section_code: 'I4-AMS-A' })).toEqual([]);
  });

  it.each([[''], [5], [true], [['A']], ['x'.repeat(51)]])(
    'still rejects an invalid label %p',
    async (section_code) => {
      expect(await errorsFor({ section_code })).toEqual(['section_code']);
    },
  );
});
