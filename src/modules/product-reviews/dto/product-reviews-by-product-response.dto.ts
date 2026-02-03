import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductReviewResponseDto } from './product-review-response.dto';
import { ERecipeCategory } from '../../recipe/enums/recipe.enum';
import { PaginationMeta } from '../../../libs/models/response/paginated-response.dto';

/**
 * Recipe summary DTO for listing recipes linked to a product
 */
export class RecipeSummaryDto {
  @ApiProperty({ description: 'Recipe ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'Recipe title', example: 'Healthy smoothie bowl' })
  title!: string;

  @ApiProperty({ description: 'Recipe content', example: 'This is a recipe content' })
  content!: string;

  @ApiProperty({ description: 'Author display name', example: 'Chef Kim' })
  authorName!: string;

  @ApiProperty({
    description: 'Recipe category',
    enum: ERecipeCategory,
    example: ERecipeCategory.RECIPE,
  })
  category!: ERecipeCategory;

  @ApiProperty({ description: 'Date of writing', example: '2025-01-01T00:00:00.000Z' })
  dateOfWriting!: Date;

  @ApiProperty({ description: 'View count', example: 100 })
  views!: number;

  @ApiProperty({ description: 'Thumbnail URLs', type: [String], example: ['https://example.com/thumb.jpg'] })
  thumbnailUrl!: string[];

  @ApiProperty({ description: 'Recipe status', example: 'approved' })
  status!: string;
}

/**
 * Single item in the merged list: either a review or a recipe (sorted by createdAt)
 */
export class ProductReviewOrRecipeItemDto {
  @ApiProperty({ description: 'Discriminator: "review" or "recipe"', enum: ['review', 'recipe'] })
  type!: 'review' | 'recipe';

  @ApiProperty({ description: 'Created at (for sorting)', example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Present when type is "review"',
    type: ProductReviewResponseDto,
  })
  review?: ProductReviewResponseDto;

  @ApiPropertyOptional({
    description: 'Present when type is "recipe"',
    type: RecipeSummaryDto,
  })
  recipe?: RecipeSummaryDto;
}

/**
 * Response DTO for GET product reviews by product ID.
 * Single list of reviews and recipes merged and sorted by createdAt (newest first), with pagination.
 */
export class ProductReviewsByProductResponseDto {
  @ApiProperty({
    description: 'Merged list of product reviews and recipes, sorted by createdAt desc',
    type: [ProductReviewOrRecipeItemDto],
  })
  items!: ProductReviewOrRecipeItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;
}
