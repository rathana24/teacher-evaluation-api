import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ParseBigIntPipe } from '../../common/pipes/parse-bigint.pipe';

@Injectable()
export class ParseDepartmentIdPipe extends ParseBigIntPipe {
  transform(value: string, metadata: ArgumentMetadata): bigint {
    const id = super.transform(value, metadata);
    if (id < -9223372036854775808n || id > 9223372036854775807n) {
      throw new BadRequestException(
        'id must be between -9223372036854775808 and 9223372036854775807',
      );
    }
    return id;
  }
}
