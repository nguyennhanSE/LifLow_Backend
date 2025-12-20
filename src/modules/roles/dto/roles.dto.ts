import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, IsOptional, IsArray, IsUUID, IsNumber, Min, Max, IsIn, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { trim } from '../../../utils/helper';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name (uppercase with underscores)',
    example: 'CUSTOM_MANAGER',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @trim()
  @MaxLength(100)
  @Matches(/^[A-Z_]+$/, { message: 'Role name must be uppercase with underscores only' })
  name!: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Custom manager role for specific department',
    maxLength: 500,
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class AssignRolesToUserDto {
  @ApiProperty({
    description: 'Array of user IDs to assign the role to',
    example: ['uuid-1', 'uuid-2'],
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  userIds!: string[];
}

export class AssignRolesToSingleUserDto {
  @ApiProperty({
    description: 'Array of role IDs to assign to user',
    example: ['role-uuid-1', 'role-uuid-2'],
    type: [String]
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  roleIds!: string[];
}

export class RoleQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: ['name', 'createdAt'] })
  @IsOptional()
  @IsIn(['name', 'createdAt'])
  sortBy?: 'name' | 'createdAt' = 'createdAt';

  @ApiProperty({ required: false, enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
