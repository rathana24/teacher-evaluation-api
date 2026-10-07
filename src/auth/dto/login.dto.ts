import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description:
      'Email address for staff/admin/lecturer or student code for students',
    examples: ['admin@itc.edu.kh', 'e20221111'],
  })
  @IsString()
  identifier!: string;

  @ApiProperty({
    minLength: 6,
    example: 'Password123',
  })
  @IsString()
  @MinLength(6)
  password!: string;
}