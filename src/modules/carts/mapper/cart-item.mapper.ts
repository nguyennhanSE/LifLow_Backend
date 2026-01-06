import { CartItem, Prisma, Product } from '@prisma/client';
import { CartItemEntity } from '../entities/cart-item.entity';
import { CartItemResponseDto, CartItemProductInfoDto } from '../dto/cart-response.dto';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';

/**
 * Type for CartItem with Product relation
 */
/**
 * Type for CartItem with all relations
 */
type CartItemWithRelations = Prisma.CartItemGetPayload<{
  include: {
    product: true;
  };
}>;

/**
 * CartItemMapper utility class for converting between Prisma models, DTOs, and entities
 */
export class CartItemMapper {
  /**
   * Converts CreateCartItemDto to CartItemEntity
   * @param dto - CreateCartItemDto from API request
   * @returns CartItemEntity instance (without id and timestamps)
   */
  static toEntity(dto: CreateCartItemDto): Partial<CartItemEntity> {
    const entity = new CartItemEntity();
    entity.productId = dto.productId;
    entity.quantity = dto.quantity;
    entity.salePrice = dto.salePrice;
    return entity;
  }

  /**
   * Converts Prisma CartItem model to CartItemEntity
   * @param cartItem - Prisma CartItem model from database
   * @returns CartItemEntity instance
   */
  static fromPrisma(cartItem: CartItem): CartItemEntity {
    const entity = new CartItemEntity();
    entity.id = cartItem.id;
    entity.productId = cartItem.productId;
    entity.quantity = cartItem.quantity;
    entity.salePrice = cartItem.salePrice;
    entity.createdAt = cartItem.createdAt;
    entity.updatedAt = cartItem.updatedAt;
    return entity;
  }

  /**
   * Converts Prisma CartItem model with Product relation to CartItemEntity
   * @param cartItem - Prisma CartItem model with optional Product relation
   * @returns CartItemEntity instance with nested product
   */
  static fromPrismaWithProduct(cartItem: CartItemWithRelations): CartItemEntity {
    const entity = this.fromPrisma(cartItem);
    entity.product = {
      id: cartItem.product.id,
      productName: cartItem.product.productName ?? null,
      productCode: cartItem.product.productCode ?? null,
      salePrice: cartItem.product.salePrice ?? null,
      imageRegistrationThumbnail: cartItem.product.imageRegistrationThumbnail ?? null,
    } as any; // Using any to match ProductEntity structure
    entity.product = {
      id: cartItem.product.id,
      productName: cartItem.product.productName ?? null,
      productCode: cartItem.product.productCode ?? null,
      salePrice: cartItem.product.salePrice ?? null,
      imageRegistrationThumbnail: cartItem.product.imageRegistrationThumbnail ?? null,
    } as any; // Using any to match ProductEntity structure
    entity.product = {
      id: cartItem.product.id,
      productName: cartItem.product.productName ?? null,
      productCode: cartItem.product.productCode ?? null,
      salePrice: cartItem.product.salePrice ?? null,
      imageRegistrationThumbnail: cartItem.product.imageRegistrationThumbnail ?? null,
    } as any; // Using any to match ProductEntity structure
    return entity;
  }

  /**
   * Converts CartItemEntity to CartItemResponseDto
   * @param entity - CartItemEntity instance
   * @returns CartItemResponseDto for API response
   */
  static toDto(entity: CartItemEntity): CartItemResponseDto {
    const dto = new CartItemResponseDto();
    dto.id = entity.id;
    dto.productId = entity.productId;
    dto.quantity = entity.quantity;
    dto.salePrice = entity.salePrice;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    
    // Map product if present
    if (entity.product) {
      dto.product = {
        id: entity.product.id,
        productName: entity.product.productName ?? null,
        productCode: entity.product.productCode ?? null,
        salePrice: entity.product.salePrice ?? null,
        imageRegistrationThumbnail: entity.product.imageRegistrationThumbnail ?? null,
      } as CartItemProductInfoDto;
    } else {
      dto.product = null;
    }
    
    return dto;
  }

  /**
   * Converts array of CartItemEntity instances to CartItemResponseDto array
   * @param entities - Array of CartItemEntity instances
   * @returns Array of CartItemResponseDto for API response
   */
  static toDtoList(entities: CartItemEntity[]): CartItemResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * Converts UpdateCartItemDto to partial CartItemEntity
   * @param dto - UpdateCartItemDto from API request
   * @returns Partial CartItemEntity with only updated fields
   */
  static toEntityPartial(dto: UpdateCartItemDto): Partial<CartItemEntity> {
    const partial: Partial<CartItemEntity> = {};
    
    partial.productId = dto.productId;
    partial.quantity = dto.quantity;
    partial.salePrice = dto.salePrice;
    
    return partial;
  }

  /**
   * Converts Prisma CartItem model directly to CartItemResponseDto
   * @param cartItem - Prisma CartItem model
   * @returns CartItemResponseDto for API response
   */
  static prismaToDto(cartItem: CartItem): CartItemResponseDto {
    const entity = this.fromPrisma(cartItem);
    return this.toDto(entity);
  }

  /**
   * Converts Prisma CartItem model with Product relation directly to CartItemResponseDto
   * @param cartItem - Prisma CartItem model with optional Product relation
   * @returns CartItemResponseDto for API response
   */
  static prismaToDtoWithProduct(cartItem: CartItemWithRelations): CartItemResponseDto {
    const entity = this.fromPrismaWithProduct(cartItem);
    return this.toDto(entity);
  }

  /**
   * Converts array of Prisma CartItem models directly to CartItemResponseDto array
   * @param cartItems - Array of Prisma CartItem models
   * @returns Array of CartItemResponseDto for API response
   */
  static prismaToDtoList(cartItems: CartItem[]): CartItemResponseDto[] {
    return cartItems.map((cartItem) => this.prismaToDto(cartItem));
  }

  /**
   * Converts array of Prisma CartItem models with Product relations directly to CartItemResponseDto array
   * @param cartItems - Array of Prisma CartItem models with optional Product relations
   * @returns Array of CartItemResponseDto for API response
   */
  static prismaToDtoListWithProduct(cartItems: CartItemWithRelations[]): CartItemResponseDto[] {
    return cartItems.map((cartItem) => this.prismaToDtoWithProduct(cartItem));
  }
}

