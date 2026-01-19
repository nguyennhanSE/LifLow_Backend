import { productBadges } from '@prisma/client';
import { ProductBadgeResponseDto } from '../dto/product-badge-response.dto';

/**
 * ProductBadgeMapper utility class for converting between Prisma models and DTOs
 */
export class ProductBadgeMapper {
  /**
   * Converts Prisma productBadges model to ProductBadgeResponseDto
   * @param entity - Prisma productBadges model from database
   * @returns ProductBadgeResponseDto instance
   */
  static toResponseDto(entity: productBadges): ProductBadgeResponseDto {
    const dto = new ProductBadgeResponseDto();
    dto.id = entity.id;
    dto.productId = entity.productId;
    dto.isHotDeal = entity.isHotDeal;
    dto.isNewProduct = entity.isNewProduct;
    dto.isBestSeller = entity.isBestSeller;
    return dto;
  }

  /**
   * Converts array of Prisma productBadges models to ProductBadgeResponseDto array
   * @param entities - Array of Prisma productBadges models
   * @returns Array of ProductBadgeResponseDto instances
   */
  static toResponseDtoArray(entities: productBadges[]): ProductBadgeResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }
}
