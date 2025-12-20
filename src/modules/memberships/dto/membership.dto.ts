import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsUUID, 
  IsDateString, 
  IsEnum, 
  MaxLength,
  IsInt,
  Min
} from 'class-validator';
import { Transform } from 'class-transformer';
import { trim } from '../../../utils/helper';

// ============= CREATE MEMBERSHIP DTO =============
export class CreateMembershipDto {
  @ApiProperty({
    description: 'Unique membership name',
    example: 'VIP',
    maxLength: 100
  })
  @IsString()
  @IsNotEmpty()
  @trim()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Membership description',
    example: 'Very Important Person - Premium membership with special privileges',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Minimum purchase amount (in Korean Won) required for this membership tier',
    example: 500000,
    minimum: 0
  })
  @IsInt()
  @Min(0)
  minPrice!: number;
}

// ============= UPDATE MEMBERSHIP DTO =============
export class UpdateMembershipDto {
  @ApiPropertyOptional({
    description: 'Unique membership name',
    example: 'VIP',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @trim()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Membership description',
    example: 'Very Important Person - Premium membership with special privileges',
    maxLength: 500
  })
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Minimum purchase amount (in Korean Won) required for this membership tier',
    example: 500000,
    minimum: 0
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPrice?: number;
}

// ============= ASSIGN MEMBERSHIP TO USER DTO =============
export enum MembershipStatus {
  NORMAL = 'normal',
  SUSPENDED = 'suspended',
  EXPIRED = 'expired',
}

export class AssignMembershipDto {
  @ApiProperty({
    description: 'User ID to assign membership to',
    example: 'user001'
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Membership ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsUUID()
  @IsNotEmpty()
  membershipId!: string;

  @ApiProperty({
    description: 'Membership start date (ISO format)',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({
    description: 'Membership end date (ISO format)',
    example: '2025-01-01T00:00:00.000Z'
  })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @ApiPropertyOptional({
    description: 'Membership status',
    enum: MembershipStatus,
    example: MembershipStatus.NORMAL,
    default: MembershipStatus.NORMAL
  })
  @IsOptional()
  @IsEnum(MembershipStatus, {
    message: 'Status must be one of: normal, suspended, expired'
  })
  status?: MembershipStatus;
}

// ============= UPDATE USER MEMBERSHIP DTO =============
export class UpdateUserMembershipDto {
  @ApiPropertyOptional({
    description: 'Membership start date (ISO format)',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Membership end date (ISO format)',
    example: '2025-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Membership status',
    enum: MembershipStatus,
    example: MembershipStatus.NORMAL
  })
  @IsOptional()
  @IsEnum(MembershipStatus, {
    message: 'Status must be one of: normal, suspended, expired'
  })
  status?: MembershipStatus;
}

// ============= QUERY/FILTER MEMBERSHIP DTO =============
export class QueryMembershipDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (starts at 1)',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'name',
    enum: ['name', 'createdAt', 'updatedAt']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Search query (searches in name and description)',
    example: 'VIP',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by membership name',
    example: 'VIP',
    maxLength: 100
  })
  @IsOptional()
  @IsString()
  @trim()
  @MaxLength(100)
  name?: string;
}

// ============= QUERY USER MEMBERSHIPS DTO =============
export class QueryUserMembershipsDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination (starts at 1)',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['createdAt', 'startDate', 'endDate', 'status']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Filter by membership status',
    enum: MembershipStatus,
    example: MembershipStatus.NORMAL
  })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;

  @ApiPropertyOptional({
    description: 'Filter by membership ID',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @IsOptional()
  @IsUUID()
  membershipId?: string;
}

