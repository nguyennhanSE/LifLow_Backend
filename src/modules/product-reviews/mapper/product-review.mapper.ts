import { ProductReviews, Prisma } from '@prisma/client';
import { ProductReviewEntity } from '../entities/product-review.entity';
import {
  ProductReviewResponseDto,
  ReviewUserInfoDto,
  ReviewProductInfoDto,
} from '../dto/product-review-response.dto';
import { createPaginatedResponse, PaginatedResponseDto } from '../../../libs/models/response/paginated-response.dto';

/**
 * Base ProductReview type matching Prisma ProductReviews model structure
 */
type ProductReviewBase = {
  id: string;
  productId: string;
  authorId: string;
  review: string;
  rating: number;
  imageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

/**
 * Type for ProductReview with User relation (compatible with Prisma User)
 */
type ProductReviewWithUser = ProductReviewBase & {
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    membershipLevel: string | null;
  } | null;
};

/**
 * Type for ProductReview with Product relation
 */
type ProductReviewWithProduct = ProductReviewBase & {
  product?: {
    id: string;
    productName: string | null;
    productCode: string | null;
    imageRegistrationThumbnail: string | null;
    salePrice: number | null;
  } | null;
};

/**
 * Type for ProductReview with all relations (User and Product)
 */
type ProductReviewWithRelations = Prisma.ProductReviewsGetPayload<{
  include: {
    user: true;
    product: true;
  };
}>;

/**
 * ProductReviewMapper utility class for converting between Prisma models, DTOs, and entities
 */
export class ProductReviewMapper {
  /**
   * Converts Prisma ProductReviews model to ProductReviewEntity
   * @param prismaReview - Prisma ProductReviews model from database
   * @param likedByMe - Optional flag indicating if current user liked this review
   * @returns ProductReviewEntity instance
   */
  static toEntity(prismaReview: ProductReviews, likedByMe?: boolean): ProductReviewEntity {
    const entity = new ProductReviewEntity();
    entity.id = prismaReview.id;
    entity.productId = prismaReview.productId;
    entity.authorId = prismaReview.authorId;
    entity.imageUrl = prismaReview.imageUrl ?? null;
    entity.review = prismaReview.review;
    entity.rating = prismaReview.rating;
    entity.likes = prismaReview.likes ?? 0;
    entity.likedByMe = likedByMe;
    entity.createdAt = prismaReview.createdAt;
    entity.updatedAt = prismaReview.updatedAt;
    return entity;
  }

  /**
   * Converts Prisma ProductReviews model with User relation to ProductReviewEntity
   * @param prismaReview - Prisma ProductReviews model with optional User relation
   * @returns ProductReviewEntity instance with nested user
   */
  static toEntityWithUser(prismaReview: ProductReviewWithUser): ProductReviewEntity {
    const entity = this.toEntity(prismaReview as ProductReviews);
    
    entity.authorName = prismaReview.user?.name ?? null;
    entity.user = null;

    return entity;
  }

  /**
   * Converts Prisma ProductReviews model with Product relation to ProductReviewEntity
   * @param prismaReview - Prisma ProductReviews model with optional Product relation
   * @returns ProductReviewEntity instance with nested product
   */
  static toEntityWithProduct(prismaReview: ProductReviewWithProduct): ProductReviewEntity {
    const entity = this.toEntity(prismaReview as ProductReviews);
    
    // Map product if included
    if (prismaReview.product) {
      entity.product = {
        id: prismaReview.product.id,
        productName: prismaReview.product.productName ?? null,
        productCode: prismaReview.product.productCode ?? null,
        imageRegistrationThumbnail: prismaReview.product.imageRegistrationThumbnail ?? null,
        salePrice: prismaReview.product.salePrice ?? null,
      } as any;
    } else {
      entity.product = null;
    }
    
    return entity;
  }

  /**
   * Converts Prisma ProductReviews model with all relations to ProductReviewEntity
   * @param prismaReview - Prisma ProductReviews model with User and Product relations
   * @returns ProductReviewEntity instance with all nested relations
   */
  static toEntityWithRelations(prismaReview: ProductReviewWithRelations): ProductReviewEntity {
    const entity = this.toEntity({
      id: prismaReview.id,
      productId: prismaReview.productId,
      authorId: prismaReview.authorId,
      imageUrl: prismaReview.imageUrl ?? null,
      review: prismaReview.review,
      rating: prismaReview.rating,
      likes: prismaReview.likes ?? null,
      createdAt: prismaReview.createdAt,
      updatedAt: prismaReview.updatedAt,
    });
    
    // Map user if included
    if (prismaReview.user) {
      entity.user = {
        id: prismaReview.user.id,
        name: prismaReview.user.name,
        email: prismaReview.user.email ?? null,
        membershipLevel: prismaReview.user.membershipLevel ?? null,
      } as any;
    } else {
      entity.user = null;
    }
    
    // Map product if included
    if (prismaReview.product) {
      entity.product = {
        id: prismaReview.product.id,
        productName: prismaReview.product.productName ?? null,
        productCode: prismaReview.product.productCode ?? null,
        imageRegistrationThumbnail: prismaReview.product.imageRegistrationThumbnail ?? null,
        salePrice: prismaReview.product.salePrice ?? null,
      } as any;
    } else {
      entity.product = null;
    }
    
    return entity;
  }

  /**
   * Converts ProductReviewEntity to ProductReviewResponseDto
   * @param entity - ProductReviewEntity instance
   * @returns ProductReviewResponseDto for API response
   */
  static toResponseDto(entity: ProductReviewEntity): ProductReviewResponseDto {
    const dto = new ProductReviewResponseDto();
    dto.id = entity.id;
    dto.productId = entity.productId;
    dto.authorId = entity.authorId;
    dto.authorName = entity.authorName ?? null;
    dto.imageUrl = entity.imageUrl ?? null;
    dto.review = entity.review;
    dto.rating = entity.rating;
    dto.likes = entity.likes ?? 0;
    dto.likedByMe = entity.likedByMe;
    dto.createdAt = entity.createdAt ?? null;
    dto.updatedAt = entity.updatedAt ?? null;
    
    // Map user if present (other code paths may still set entity.user)
    if (entity.user) {
      const userInfo = new ReviewUserInfoDto();
      userInfo.id = entity.user.id;
      userInfo.name = entity.user.name ?? '';
      userInfo.email = entity.user.email ?? null;
      userInfo.membershipLevel = entity.user.membershipLevel ?? null;
      dto.user = userInfo;
    } else {
      dto.user = null;
    }
    
    // Map product if present
    if (entity.product) {
      const productInfo = new ReviewProductInfoDto();
      productInfo.id = entity.product.id;
      productInfo.productName = entity.product.productName ?? null;
      productInfo.productCode = entity.product.productCode ?? null;
      productInfo.imageRegistrationThumbnail = entity.product.imageRegistrationThumbnail ?? null;
      productInfo.salePrice = entity.product.salePrice ?? null;
      dto.product = productInfo;
    } else {
      dto.product = null;
    }
    
    return dto;
  }

  /**
   * Converts array of ProductReviewEntity instances to ProductReviewResponseDto array
   * @param entities - Array of ProductReviewEntity instances
   * @returns Array of ProductReviewResponseDto for API response
   */
  static toResponseDtoList(entities: ProductReviewEntity[]): ProductReviewResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }

  /**
   * Converts Prisma ProductReviews model directly to ProductReviewResponseDto
   * @param prismaReview - Prisma ProductReviews model
   * @returns ProductReviewResponseDto for API response
   */
  static prismaToResponseDto(prismaReview: ProductReviews): ProductReviewResponseDto {
    const entity = this.toEntity(prismaReview);
    return this.toResponseDto(entity);
  }

  /**
   * Converts Prisma ProductReviews model with relations directly to ProductReviewResponseDto
   * @param prismaReview - Prisma ProductReviews model with optional relations
   * @returns ProductReviewResponseDto for API response
   */
  static prismaToResponseDtoWithRelations(prismaReview: ProductReviewWithRelations): ProductReviewResponseDto {
    const entity = this.toEntityWithRelations(prismaReview);
    return this.toResponseDto(entity);
  }

  /**
   * Converts array of Prisma ProductReviews models directly to ProductReviewResponseDto array
   * @param prismaReviews - Array of Prisma ProductReviews models
   * @returns Array of ProductReviewResponseDto for API response
   */
  static prismaToResponseDtoList(prismaReviews: ProductReviews[]): ProductReviewResponseDto[] {
    return prismaReviews.map((review) => this.prismaToResponseDto(review));
  }

  /**
   * Converts array of Prisma ProductReviews models with relations directly to ProductReviewResponseDto array
   * @param prismaReviews - Array of Prisma ProductReviews models with optional relations
   * @returns Array of ProductReviewResponseDto for API response
   */
  static prismaToResponseDtoListWithRelations(prismaReviews: ProductReviewWithRelations[]): ProductReviewResponseDto[] {
    return prismaReviews.map((review) => this.prismaToResponseDtoWithRelations(review));
  }

  /**
   * Converts array of ProductReviewEntity to paginated response
   * @param entities - Array of ProductReviewEntity instances
   * @param total - Total number of reviews
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns PaginatedResponseDto with ProductReviewResponseDto items
   */
  static toListResponseDto(
    entities: ProductReviewEntity[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<ProductReviewResponseDto> {
    const dtos = this.toResponseDtoList(entities);
    return createPaginatedResponse(dtos, total, page, limit);
  }

  /**
   * Converts array of Prisma ProductReviews models to paginated response
   * @param prismaReviews - Array of Prisma ProductReviews models
   * @param total - Total number of reviews
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns PaginatedResponseDto with ProductReviewResponseDto items
   */
  static prismaToListResponseDto(
    prismaReviews: ProductReviews[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<ProductReviewResponseDto> {
    const entities = prismaReviews.map((review) => this.toEntity(review));
    return this.toListResponseDto(entities, total, page, limit);
  }

  /**
   * Converts array of Prisma ProductReviews models with relations to paginated response
   * @param prismaReviews - Array of Prisma ProductReviews models with optional relations
   * @param total - Total number of reviews
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns PaginatedResponseDto with ProductReviewResponseDto items
   */
  static prismaToListResponseDtoWithRelations(
    prismaReviews: ProductReviewWithRelations[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<ProductReviewResponseDto> {
    const entities = prismaReviews.map((review) => this.toEntityWithRelations(review));
    return this.toListResponseDto(entities, total, page, limit);
  }
}

