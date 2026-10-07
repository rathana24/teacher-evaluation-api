import {
  IsBoolean,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class AssignUserDepartmentDto {
  @ApiProperty({
    example: 1,
    description: 'Department ID to assign to the user',
  })
  @IsInt()
  @Min(1)
  department_id!: number;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description:
      'Whether this should be the user primary department',
  })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}