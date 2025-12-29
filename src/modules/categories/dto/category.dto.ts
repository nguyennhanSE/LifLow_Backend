import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryEntity } from '../entities/category.entity';

// ============================================
// FILTER DTO
// ============================================
export class CategoryFilterDto {
  @ApiPropertyOptional({
    description: 'Search term (searches name and description)',
    example: 'Oils',
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'createdAt',
    enum: ['productCategoryNumber', 'name', 'createdAt', 'updatedAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// RESPONSE DTO
// ============================================
export class CategoryResponseDto {
  @ApiProperty({
    description: 'Product category number (unique identifier)',
    example: 'CAT001',
  })
  productCategoryNumber!: string;

  @ApiProperty({
    description: 'Category name',
    example: 'Oils & Condiments',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Premium oils, vinegars, and condiments for your kitchen',
  })
  description?: string | null;

  @ApiProperty({
    description: 'Creation date',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt!: Date | null;

  @ApiProperty({
    description: 'Last update date',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt!: Date | null;
}

// ============================================
// PAGINATION & LIST RESPONSE INTERFACES
// ============================================
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CategoryListResponse {
  categories: CategoryResponseDto[];
  pagination: PaginationMeta;
}

