import {
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  Type,
} from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  user_role,
  user_status,
} from '@prisma/client';

const STAFF_ROLES: user_role[] = [
  user_role.ADMIN,
  user_role.LECTURER,
];

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    description:
      'Search staff by full name or email',
    example: 'sophal',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @ApiPropertyOptional({
    enum: [
      user_role.ADMIN,
      user_role.LECTURER,
    ],
    description:
      'Filter by staff role',
  })
  @IsOptional()
  @IsEnum(user_role)
  @IsIn(STAFF_ROLES)
  role?: user_role;

  @ApiPropertyOptional({
    enum: user_status,
    description:
      'Filter by account status',
  })
  @IsOptional()
  @IsEnum(user_status)
  status?: user_status;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    description:
      'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
    description:
      'Number of users per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}