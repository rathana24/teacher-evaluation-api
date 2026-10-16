import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { department_status } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'AMS',
    minLength: 1,
    maxLength: 30,
    description:
      'Trimmed nonblank department code; internal spaces are preserved.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  code!: string;

  @ApiProperty({
    example: 'Applied Mathematics and Statistics',
    minLength: 1,
    maxLength: 150,
    description:
      'Trimmed nonblank department name; internal spaces are preserved.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    enum: department_status,
    example: department_status.ACTIVE,
    default: department_status.ACTIVE,
    nullable: true,
    description: 'Omitted or null status uses ACTIVE on creation.',
  })
  @IsOptional()
  @IsEnum(department_status)
  status?: department_status;
}
