import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsNumber, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for querying/filtering product reviews with pagination
 */
export class QueryProductReviewsDto {
  @ApiPropertyOptional({
    description: 'Filter by product ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter by author ID (user who wrote the review)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Author ID must be a valid UUID' })
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Minimum rating filter (1.0 to 5.0)',
    example: 3.0,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Minimum rating must be a number' })
  @Min(1, { message: 'Minimum rating must be at least 1.0' })
  @Max(5, { message: 'Minimum rating cannot exceed 5.0' })
  minRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum rating filter (1.0 to 5.0)',
    example: 5.0,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Maximum rating must be a number' })
  @Min(1, { message: 'Maximum rating must be at least 1.0' })
  @Max(5, { message: 'Maximum rating cannot exceed 5.0' })
  maxRating?: number;

  @ApiPropertyOptional({
    description: 'Search in review content (case-insensitive)',
    example: 'amazing',
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

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
    default: 'createdAt',
    enum: ['id', 'productId', 'authorId', 'rating', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  sortBy?: string = 'createdAt';

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

