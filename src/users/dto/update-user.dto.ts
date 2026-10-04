import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { gender, user_status } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({
    maxLength: 255,
    example: 'newlecturer@itc.edu.kh',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    minLength: 6,
    maxLength: 72,
    example: 'NewPassword456',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    example: 'Keo Sophal',
  })
  @IsOptional()
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
  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;
}