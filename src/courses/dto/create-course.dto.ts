import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateCourseDto {
  @ApiPropertyOptional({
    minLength: 1,
    maxLength: 30,
    nullable: false,
    example: 'CS101',
    description:
      'Omit for atomic server allocation from the selected department prefix; automatic allocation requires an Idempotency-Key UUID v4 header. If supplied, trimmed nonblank official code, at most 30 characters; case/internal characters preserved. Null and blank are invalid.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  course_code?: string;

  @ApiProperty({
    minLength: 1,
    maxLength: 150,
    nullable: false,
    example: 'Intro to Computer Science',
    description: 'Trimmed nonblank course name.',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  course_name!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Fundamentals of programming and computer science',
    description:
      'Optional description; null and empty text are supported. Text spaces are preserved.',
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    type: 'integer',
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
    nullable: false,
    example: 1,
    description:
      'Numeric owning department ID; must be a safe integer from 1 to 9007199254740991.',
  })
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  department_id!: number;
}
