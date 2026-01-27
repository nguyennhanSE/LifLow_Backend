import { Banner, Prisma, ProductReviews } from '@prisma/client';
import { BannerEntity } from '../entities/banner.entity';
import { EBannerType, EBannerStatus } from '../enums/banner.enum';
import { toProductEntity, toProductEntityWithRelations, toProductReviewsEntityList } from '../../product/mapper/product.mapper';

type BannerWithRelations = Prisma.BannerGetPayload<{
  include: {
    product: true;
  };
}>;

type BannerWithProductAndReviews = Prisma.BannerGetPayload<{
  include: {
    product: {
      include: {
        productReviews: true;
      };
    };
  };
}>;

/**
 * BannerMapper utility class for converting between Prisma models and entities/DTOs
 */
export class BannerMapper {
  /**
   * Converts Prisma Banner model to BannerEntity
   * @param prismaBanner - Prisma Banner model from database
   * @returns BannerEntity instance
   */
  static toEntity(prismaBanner: Banner): BannerEntity {
    const entity = new BannerEntity();
    entity.id = prismaBanner.id;
    entity.type = prismaBanner.type as EBannerType;
    entity.status = prismaBanner.status as EBannerStatus;
    entity.productId = prismaBanner.productId;
    entity.category = prismaBanner.category;
    entity.title = prismaBanner.title;
    entity.badgeText = prismaBanner.badgeText;
    entity.mainText = prismaBanner.mainText;
    entity.ctaButtonText = prismaBanner.ctaButtonText;
    entity.ctaButtonUrl = prismaBanner.ctaButtonUrl;
    entity.imageUrl = prismaBanner.imageUrl;
    entity.mobileImageUrl = prismaBanner.mobileImageUrl;
    entity.displayOrder = prismaBanner.displayOrder;
    entity.startDate = prismaBanner.startDate;
    entity.endDate = prismaBanner.endDate;
    entity.createdAt = prismaBanner.createdAt;
    entity.updatedAt = prismaBanner.updatedAt;
    
    return entity;
  }

  /**
   * Converts Prisma Banner model with Product relation to BannerEntity
   * @param prismaBanner - Prisma Banner model with optional Product relation
   * @returns BannerEntity instance with nested product
   */
  static toEntityWithProduct(prismaBanner: BannerWithRelations | BannerWithProductAndReviews): BannerEntity {
    const entity = this.toEntity(prismaBanner);
    
    // Map product if included
    if (prismaBanner.product) {
      // Map base product
      entity.product = toProductEntity(prismaBanner.product);
      
      // Check if product has productReviews and add them
      const productAny = prismaBanner.product as any;
      const productReviews: ProductReviews[] | undefined | null = productAny.productReviews;
      
      if (productReviews !== undefined && productReviews !== null && Array.isArray(productReviews)) {
        entity.product.productReviews = toProductReviewsEntityList(productReviews);
      }
    } else {
      entity.product = null;
    }

    return entity;
  }

  /**
   * Converts Prisma Banner to BannerEntity (direct conversion)
   * @param prismaBanner - Prisma Banner or BannerWithRelations
   * @returns BannerEntity for API responses
   */
  static toResponse(prismaBanner: Banner | BannerWithRelations): BannerEntity {
    if ('product' in prismaBanner && prismaBanner.product) {
      return this.toEntityWithProduct(prismaBanner);
    }
    return this.toEntity(prismaBanner);
  }

  /**
   * Converts array of Prisma Banner models to BannerEntity array
   * @param prismaBanners - Array of Prisma Banner models
   * @returns Array of BannerEntity instances
   */
  static toEntityList(prismaBanners: Banner[]): BannerEntity[] {
    return prismaBanners.map((banner) => this.toEntity(banner));
  }

  /**
   * Converts array of Prisma Banner models with Product relations to BannerEntity array
   * @param prismaBanners - Array of Prisma Banner models with optional Product relations
   * @returns Array of BannerEntity instances with nested products
   */
  static toEntityListWithProduct(prismaBanners: BannerWithRelations[]): BannerEntity[] {
    return prismaBanners.map((banner) => this.toEntityWithProduct(banner));
  }

  /**
   * Converts array of BannerEntity to BannerResponseDto array
   * @param entities - Array of BannerEntity instances
   * @returns Array of BannerEntity for API responses
   */
  static toResponseList(entities: BannerEntity[]): BannerEntity[] {
    return entities;
  }

  /**
   * Converts Prisma Banner model directly to BannerResponseDto
   * @param prismaBanner - Prisma Banner model
   * @returns BannerEntity for API responses
   */
  static prismaToResponse(prismaBanner: Banner): BannerEntity {
    return this.toEntity(prismaBanner);
  }

  /**
   * Converts Prisma Banner model with Product relation directly to BannerResponseDto
   * @param prismaBanner - Prisma Banner model with optional Product relation
   * @returns BannerEntity for API responses
   */
  static prismaToResponseWithProduct(prismaBanner: BannerWithRelations): BannerEntity {
    return this.toEntityWithProduct(prismaBanner);
  }

  /**
   * Converts array of Prisma Banner models directly to BannerResponseDto array
   * @param prismaBanners - Array of Prisma Banner models
   * @returns Array of BannerEntity for API responses
   */
  static prismaToResponseList(prismaBanners: Banner[]): BannerEntity[] {
    const entities = this.toEntityList(prismaBanners);
    return this.toResponseList(entities);
  }

  /**
   * Converts array of Prisma Banner models with Product relations directly to BannerResponseDto array
   * @param prismaBanners - Array of Prisma Banner models with optional Product relations
   * @returns Array of BannerResponseDto for API responses
   */
  static prismaToResponseListWithProduct(prismaBanners: BannerWithRelations[]): BannerEntity[] {
    const entities = this.toEntityListWithProduct(prismaBanners);
    return this.toResponseList(entities);
  }
}

