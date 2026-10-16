import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  ValidateNested,
} from 'class-validator';
import { CreateAcademicYearDto } from './create-academic-year.dto';
import { CreateSemesterDto } from '../../semesters/dto/create-semester.dto';

export class SetupSemesterDto extends OmitType(CreateSemesterDto, [
  'academic_year_id',
] as const) {}

export class CompleteAcademicYearSetupDto {
  @ApiProperty({
    type: [SetupSemesterDto],
    minItems: 2,
    maxItems: 2,
    description:
      'Exactly Semester 1 and Semester 2, each once. Existing semester numbers retain their saved name and dates; supplied values apply only to missing numbers.',
  })
  @IsDefined()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @Type(() => SetupSemesterDto)
  @ValidateNested({ each: true })
  semesters!: SetupSemesterDto[];
}

export class AcademicYearSetupDto extends CompleteAcademicYearSetupDto {
  @ApiProperty({
    type: CreateAcademicYearDto,
    description:
      'Create one new academic year. Activation and both semesters commit together. This first setup contract does not yet perform B/F/I rollover.',
  })
  @IsDefined()
  @Type(() => CreateAcademicYearDto)
  @ValidateNested()
  academic_year!: CreateAcademicYearDto;
}
