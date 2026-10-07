import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCourseDto {
  @ApiPropertyOptional({ maxLength: 30, example: 'CS101' })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  course_code?: string;

  @ApiPropertyOptional({
    maxLength: 150,
    example: 'Intro to Computer Science',
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  course_name?: string;

  @ApiPropertyOptional({
    example: 'Fundamentals of programming and computer science',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Owning department ID',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  department_id?: number;
}