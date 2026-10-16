import { BadRequestException } from '@nestjs/common';
import { registerDecorator } from 'class-validator';

export function IsCohortDatabaseId(): PropertyDecorator {
  return (target, property) =>
    registerDecorator({
      name: 'isCohortDatabaseId',
      target: target.constructor,
      propertyName: String(property),
      options: {
        message: `${String(property)} must be a positive decimal string up to 9223372036854775807`,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          /^[1-9]\d{0,18}$/.test(value) &&
          (value.length < 19 || value <= '9223372036854775807'),
      },
    });
}

export function cohortNumber(number: unknown, label?: unknown): number {
  let alias: number | undefined;
  if (label !== undefined) {
    const match =
      typeof label === 'string'
        ? /^(?:Gen\s+)?([0-9]{1,100})$/i.exec(label.trim())
        : null;
    if (!match || BigInt(match[1]) < 1n || BigInt(match[1]) > 2147483647n)
      throw new BadRequestException(
        'name compatibility alias must be an integer or Gen N between 1 and 2147483647',
      );
    alias = Number(BigInt(match[1]));
  }
  if (
    number !== undefined &&
    (typeof number !== 'number' ||
      !Number.isInteger(number) ||
      number < 1 ||
      number > 2147483647)
  )
    throw new BadRequestException(
      'generation_number must be an integer between 1 and 2147483647',
    );
  if (number === undefined && alias === undefined)
    throw new BadRequestException('generation_number is required');
  if (number !== undefined && alias !== undefined && number !== alias)
    throw new BadRequestException(
      'name alias and generation_number must agree',
    );
  return (number ?? alias) as number;
}
