import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { gender, user_status } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({
    maxLength: 255,
    example: 'newlecturer@itc.edu.kh',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    minLength: 6,
    maxLength: 72,
    example: 'NewPassword456',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    example: 'Keo Sophal',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  full_name?: string;

  @ApiPropertyOptional({
    enum: gender,
    example: 'MALE',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(gender)
  gender?: gender;

  @ApiPropertyOptional({
    enum: user_status,
    example: 'INACTIVE',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(user_status)
  status?: user_status;
}