import { PartialType } from '@nestjs/swagger';
import { CreateStudentGenerationDto } from './create-student-generation.dto';

export class UpdateStudentGenerationDto extends PartialType(
  CreateStudentGenerationDto,
) {}