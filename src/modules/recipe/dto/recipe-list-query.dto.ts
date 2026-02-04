import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ERecipeCategory } from '../enums/recipe.enum';

export class RecipeListQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by recipe category',
    example: 'Italian',
  })
  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  category?: ERecipeCategory;

  @ApiPropertyOptional({
    description: 'Filter by recipe status',
    example: 'approved',
    enum: ['approved', 'pending', 'rejected'],
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  @IsIn(['approved', 'pending', 'rejected'], { message: 'Status must be either "approved", "pending" or "rejected"' })
  status?: 'approved' | 'rejected' | 'pending';

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'IsActive must be a boolean' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by author user ID',
    example: 'user000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Author ID must be a valid UUID' })
  authorId?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'createdAt',
      'views',
      'alphabetical',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @IsIn(
    [
      'createdAt',
      'views',
      'alphabetical',
    ],
    { message: 'Invalid sort field' },
  )
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['asc', 'desc'], { message: 'Sort order must be either "asc" or "desc"' })
  order?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'Search term (searches by title, author or content)',
    example: 'bowl',
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  q: string;
}

