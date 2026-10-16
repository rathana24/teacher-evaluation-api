import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class UpdateCourseDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 30,
    nullable: false,
    example: 'CS101',
    description:
      'Trimmed nonblank course code. Case and internal characters are preserved. Omit to retain; null is invalid.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  course_code?: string;

  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 150,
    nullable: false,
    example: 'Intro to Computer Science',
    description:
      'Trimmed nonblank course name. Omit to retain; null is invalid.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  course_name?: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Fundamentals of programming and computer science',
    description:
      'Omit to retain; null clears the description. Empty text and text spaces are preserved.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    nullable: false,
    example: 1,
    description:
      'Numeric owning department ID; safe integer from 1 to 9007199254740991. Omit to retain; null is invalid.',
  })
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  department_id?: number;
}
