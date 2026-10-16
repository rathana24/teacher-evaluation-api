import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { department_status } from '@prisma/client';
import { IsEnum, ValidateIf } from 'class-validator';
import { CreateDepartmentDto } from './create-department.dto';

export class UpdateDepartmentDto extends PartialType(
  OmitType(CreateDepartmentDto, ['status'] as const),
  { skipNullProperties: false },
) {
  // Create permits null as a default-status alias; updates must distinguish
  // omission (retain status) from an invalid explicit null.
  @ApiPropertyOptional({
    enum: department_status,
    example: department_status.ACTIVE,
    nullable: false,
    description: 'Omit to retain the current status. Explicit null is invalid.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(department_status)
  status?: department_status;
}
