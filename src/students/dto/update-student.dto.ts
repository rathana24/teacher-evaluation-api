import { ApiPropertyOptional } from '@nestjs/swagger';
import { gender, user_status } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    example: 'e20221111',
    description: 'Unique student code',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  student_code?: string;

  @ApiPropertyOptional({
    example: 'DIN Reaksa',
    description: 'Student full name',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  full_name?: string;

  @ApiPropertyOptional({
    example: 'student@itc.edu.kh',
    description:
      'Optional student email. Send null to clear the existing email.',
    maxLength: 255,
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({
    enum: gender,
    example: 'MALE',
    description:
      'Student gender. Send null to clear the existing gender.',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(gender)
  gender?: gender | null;

  @ApiPropertyOptional({
    example: '1',
    description: 'Student generation ID',
    type: String,
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d*$/, {
    message: 'generation_id must be a positive integer',
  })
  generation_id?: string;

  @ApiPropertyOptional({
    example: 'Updated administrative note',
    description:
      'Optional administrative notes. Send null to clear the existing notes.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiPropertyOptional({
    enum: user_status,
    example: 'ACTIVE',
    description: 'Student account status',
  })
  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;
}