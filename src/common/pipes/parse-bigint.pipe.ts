import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string, _metadata: ArgumentMetadata): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('id must be a valid integer');
    }
  }
}
