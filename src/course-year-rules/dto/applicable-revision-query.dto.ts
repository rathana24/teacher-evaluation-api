import { ApiProperty } from '@nestjs/swagger';
import { IsDatabaseId } from '../../common/validators/database-id.validator';

export class ApplicableRevisionQueryDto {
  @ApiProperty({
    example: '1',
    description: 'Academic year of the selected semester',
  })
  @IsDatabaseId()
  academic_year_id!: string;
}
