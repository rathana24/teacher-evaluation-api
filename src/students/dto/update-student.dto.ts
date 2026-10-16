import { ApiPropertyOptional } from '@nestjs/swagger';
import { gender, user_status } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsCohortDatabaseId } from '../../student-generations/validation/cohort-fields';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    example: 'e20221111',
    description: 'Unique student code',
    maxLength: 50,
  })
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  student_code?: string;

  @ApiPropertyOptional({
    example: 'DIN Reaksa',
    description: 'Student full name',
    maxLength: 150,
  })
  @ValidateIf((_row, value: unknown) => value !== undefined)
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
    description: 'Student gender. Send null to clear the existing gender.',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(gender)
  gender?: gender | null;

  @ApiPropertyOptional({
    example: '1',
    description:
      'Existing cohort ID may be repeated unchanged. Cohort changes require an explicit academic transfer or reviewed mapping, not a personal edit.',
    type: String,
  })
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsCohortDatabaseId()
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
  @ValidateIf((_row, value: unknown) => value !== undefined)
  @IsEnum(user_status)
  status?: user_status;
}
