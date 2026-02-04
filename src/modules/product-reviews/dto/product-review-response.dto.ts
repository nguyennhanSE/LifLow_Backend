import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Basic user information included in product review response
 */
export class ReviewUserInfoDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name!: string;

  @ApiPropertyOptional({ description: 'User email', example: 'john.doe@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Membership level', example: 'GOLD' })
  membershipLevel?: string | null;
}

/**
 * Basic product information included in product review response
 */
export class ReviewProductInfoDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  id!: string;

  @ApiPropertyOptional({ description: 'Product name', example: 'Organic Apple' })
  productName?: string | null;

  @ApiPropertyOptional({ description: 'Product code', example: 'PROD001' })
  productCode?: string | null;

  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://example.com/image.jpg' })
  imageRegistrationThumbnail?: string | null;

  @ApiPropertyOptional({ description: 'Current sale price', example: 29000 })
  salePrice?: number | null;
}

/**
 * Product review response DTO with nested user and product information
 */
export class ProductReviewResponseDto {
  @ApiProperty({ description: 'Review ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  id!: string;

  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  productId!: string;

  @ApiProperty({ description: 'Author ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  authorId!: string;

  @ApiPropertyOptional({ description: 'Author display name (from user)', example: 'John Doe' })
  authorName?: string | null;

  @ApiPropertyOptional({ description: 'Image URL', example: 'https://example.com/image.jpg' })
  imageUrl?: string | null;

  @ApiProperty({ description: 'Review content text', example: 'This product is amazing!' })
  review!: string;

  @ApiProperty({ description: 'Rating value (1.0 to 5.0)', example: 4.5 })
  rating!: number;

  @ApiPropertyOptional({ description: 'Number of likes', example: 10 })
  likes?: number | null;

  @ApiPropertyOptional({ description: 'Whether the current user has liked this review', example: false })
  likedByMe?: boolean;

  @ApiPropertyOptional({ description: 'Created at timestamp', example: '2025-01-01T00:00:00.000Z' })
  createdAt?: Date | null;

  @ApiPropertyOptional({ description: 'Updated at timestamp', example: '2025-01-01T00:00:00.000Z' })
  updatedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User information (author of the review)',
    type: ReviewUserInfoDto,
  })
  user?: ReviewUserInfoDto | null;

  @ApiPropertyOptional({
    description: 'Product information',
    type: ReviewProductInfoDto,
  })
  product?: ReviewProductInfoDto | null;
}

