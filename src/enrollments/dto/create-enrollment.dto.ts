import { ApiProperty } from '@nestjs/swagger';
import { IsDatabaseId } from '../../common/validators/database-id.validator';

export class CreateEnrollmentDto {
  @ApiProperty({ example: '5', description: 'id of a user with role STUDENT' })
  @IsDatabaseId()
  student_id!: string;
}
