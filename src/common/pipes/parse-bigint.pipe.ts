import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const MIN_BIGINT = -9223372036854775808n;
const MAX_BIGINT = 9223372036854775807n;

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string | bigint, _metadata: ArgumentMetadata): bigint {
    // Decimal digits only: BigInt() would also accept '', whitespace and hex.
    if (
      typeof value !== 'bigint' &&
      (typeof value !== 'string' || !/^-?\d+$/.test(value))
    ) {
      throw new BadRequestException('id must be a valid integer');
    }
    const id = BigInt(value);
    // Out-of-range values would otherwise fail inside PostgreSQL as a 500.
    if (id < MIN_BIGINT || id > MAX_BIGINT) {
      throw new BadRequestException(
        'id must be between -9223372036854775808 and 9223372036854775807',
      );
    }
    return id;
  }
}
