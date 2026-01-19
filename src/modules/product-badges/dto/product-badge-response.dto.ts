import { ApiProperty } from '@nestjs/swagger';
import { productBadges } from '@prisma/client';

export class ProductBadgeResponseDto {
  @ApiProperty({ description: 'Product badge ID (UUID)' })
  id!: string;

  @ApiProperty({ description: 'Product ID (UUID)' })
  productId!: string;

  @ApiProperty({ description: 'Whether the product is a hot deal', example: false })
  isHotDeal!: boolean;

  @ApiProperty({ description: 'Whether the product is a new product', example: false })
  isNewProduct!: boolean;

  @ApiProperty({ description: 'Whether the product is a best seller', example: false })
  isBestSeller!: boolean;
}

export function toProductBadgeResponseDto(productBadge: productBadges): ProductBadgeResponseDto {
  return {
    id: productBadge.id,
    productId: productBadge.productId,
    isHotDeal: productBadge.isHotDeal,
    isNewProduct: productBadge.isNewProduct,
    isBestSeller: productBadge.isBestSeller,
  };
}
