import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  gender,
  user_role,
} from '@prisma/client';

const STAFF_ROLES: user_role[] = [
  user_role.ADMIN,
  user_role.LECTURER,
];

export class CreateUserDto {
  @ApiProperty({
    maxLength: 255,
    example: 'newlecturer@itc.edu.kh',
    description:
      'Email address is required for lecturer and admin accounts',
  })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    minLength: 6,
    maxLength: 72,
    example: 'Password123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({
    maxLength: 150,
    example: 'Keo Sophal',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  full_name!: string;

  @ApiPropertyOptional({
    enum: gender,
    example: 'MALE',
    nullable: true,
  })
  @IsOptional()
  @IsEnum(gender)
  gender?: gender;

  @ApiProperty({
    enum: [
      user_role.ADMIN,
      user_role.LECTURER,
    ],
    example: user_role.LECTURER,
    description:
      'Only ADMIN and LECTURER accounts can be created through /users. Student accounts must use the student creation API.',
  })
  @IsEnum(user_role)
  @IsIn(STAFF_ROLES)
  role!: user_role;
}