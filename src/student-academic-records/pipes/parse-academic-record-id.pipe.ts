import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@Injectable()
export class ParseAcademicRecordIdPipe extends ParseBigIntPipe {
  transform(value: string, metadata: ArgumentMetadata): bigint {
    if (
      !/^[1-9]\d{0,18}$/.test(value) ||
      (value.length === 19 && value > '9223372036854775807')
    )
      throw new BadRequestException(
        'id must be a positive decimal string up to 9223372036854775807',
      );
    return super.transform(value, metadata);
  }
}
