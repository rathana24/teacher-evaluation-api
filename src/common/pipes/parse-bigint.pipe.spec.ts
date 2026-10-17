import { BadRequestException } from '@nestjs/common';
import { ParseBigIntPipe } from './parse-bigint.pipe';

describe('ParseBigIntPipe', () => {
  const pipe = new ParseBigIntPipe();
  const parse = (value: unknown) => pipe.transform(value as string, { type: 'param' });

  it.each([
    ['1', 1n],
    ['0', 0n],
    ['-5', -5n],
    ['9223372036854775807', 9223372036854775807n],
    ['-9223372036854775808', -9223372036854775808n],
  ])('parses %s', (value, expected) => {
    expect(parse(value)).toBe(expected);
  });

  it.each([undefined, '', '  ', 'abc', '1.5', '1e3', '0x10', ' 1'])(
    'rejects malformed value %p',
    (value) => {
      expect(() => parse(value)).toThrow(BadRequestException);
    },
  );

  it.each(['9223372036854775808', '-9223372036854775809', '9'.repeat(1000)])(
    'rejects out-of-range value %s instead of failing in the database',
    (value) => {
      expect(() => parse(value)).toThrow(
        'id must be between -9223372036854775808 and 9223372036854775807',
      );
    },
  );
});
