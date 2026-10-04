import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    minLength: 6,
    maxLength: 72,
    example: 'CurrentPassword123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  current_password!: string;

  @ApiProperty({
    minLength: 6,
    maxLength: 72,
    example: 'NewPassword456',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  new_password!: string;
}