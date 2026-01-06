import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ECartStatus } from '../enums/cart.enum';

/**
 * DTO for querying/filtering carts with pagination
 */
export class QueryCartDto {
  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by cart status',
    enum: ECartStatus,
    example: ECartStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(ECartStatus, { message: 'Status must be either ACTIVE or CHECKED_OUT' })
  status?: ECartStatus;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['id', 'userId', 'status', 'totalAmount', 'createdAt', 'updatedAt', 'checkedOutAt'],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order: asc or desc',
    example: 'desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'Sort order must be either "asc" or "desc"' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}

