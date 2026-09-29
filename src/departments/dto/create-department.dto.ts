import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { department_status } from '@prisma/client';

export class CreateDepartmentDto {
  @ApiProperty({
    example: 'AMS',
    maxLength: 30,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  code!: string;

  @ApiProperty({
    example: 'Applied Mathematics and Statistics',
    maxLength: 150,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    enum: department_status,
    example: department_status.ACTIVE,
    default: department_status.ACTIVE,
  })
  @IsOptional()
  @IsEnum(department_status)
  status?: department_status;
}