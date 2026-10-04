import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { class_type } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseOfferingDto {
  @ApiProperty({
    example: '1',
    description: 'ID of an existing course',
  })
  @IsNumberString({ no_symbols: true })
  course_id!: string;

  @ApiProperty({
    example: '2',
    description: 'ID of a user with role LECTURER',
  })
  @IsNumberString({ no_symbols: true })
  lecturer_id!: string;

  @ApiProperty({
    example: '1',
    description: 'ID of an existing semester',
  })
  @IsNumberString({ no_symbols: true })
  semester_id!: string;

  @ApiPropertyOptional({
    example: 4,
    minimum: 1,
    maximum: 5,
    description:
      'Student year level intended for this course offering',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  year_level?: number;

  @ApiPropertyOptional({
    example: class_type.COURSE,
    enum: class_type,
    description: 'Class type for this course offering',
  })
  @IsOptional()
  @IsEnum(class_type)
  class_type?: class_type;

  @ApiPropertyOptional({
    maxLength: 50,
    example: 'A',
    description: 'Optional section or class code',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  section_code?: string;
}