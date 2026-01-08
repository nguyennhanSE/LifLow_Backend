import { Prisma } from '@prisma/client';
import { CartEntity } from '../entities/cart.entity';
import { CartResponseDto, CartUserInfoDto } from '../dto/cart-response.dto';
import { CreateCartDto } from '../dto/create-cart.dto';
import { UpdateCartDto } from '../dto/update-cart.dto';
import { ECartStatus, ECartItemStatus } from '../enums/cart.enum';
import { CartItemMapper } from './cart-item.mapper';
import { CartItemEntity } from '../entities/cart-item.entity';
import { UserEntity } from '../../user/entities/user.entity';

/**
 * Base Cart type matching Prisma Cart model structure
 */
type CartBase = {
  id: string;
  userId: string;
  totalAmount: number;
  checkedOutAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type for Cart with User relation
 */
type CartWithUser = CartBase & {
  user?: {
    id: string;
    name: string;
    email: string | null;
    phoneNumber: string | null;
  } | null;
};

/**
 * Type for Cart with CartItems relation
 */
type CartWithItems = {
  id: string;
  userId: string;
  totalAmount: number;
  checkedOutAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  cartItems?: any[] | null;
};

/**
 * Type for Cart with all relations (User and CartItems)
 */
type CartWithRelations = Prisma.CartGetPayload<{
  include: {
    user: true;
    cartItems: {
      include: {
        product: true;
      };
    };
  };
}>;

/**
 * CartMapper utility class for converting between Prisma models, DTOs, and entities
 */
export class CartMapper {
  /**
   * Converts CreateCartDto to CartEntity
   * @param dto - CreateCartDto from API request
   * @returns CartEntity instance (without id, timestamps, and relations)
   */
  static toEntity(dto: CreateCartDto): Partial<CartEntity> {
    const entity = new CartEntity();
    entity.userId = dto.userId;
    // Status and totalAmount will be set by the service/repository
    return entity;
  }

  /**
   * Converts Prisma Cart model to CartEntity
   * @param cart - Prisma Cart model from database
   * @returns CartEntity instance
   */
  static fromPrisma(cart: CartBase): CartEntity {
    const entity = new CartEntity();
    entity.id = cart.id;
    entity.userId = cart.userId;
    entity.totalAmount = cart.totalAmount;
    entity.checkedOutAt = cart.checkedOutAt;
    entity.createdAt = cart.createdAt;
    entity.updatedAt = cart.updatedAt;
    return entity;
  }

  /**
   * Converts Prisma Cart model with User relation to CartEntity
   * @param cart - Prisma Cart model with optional User relation
   * @returns CartEntity instance with nested user
   */
  static fromPrismaWithUser(cart: CartWithUser): CartEntity {
    const entity = this.fromPrisma(cart);
    
    // Map user if included
    if (cart.user) {
      entity.user = {
        id: cart.user.id,
        name: cart.user.name,
        email: cart.user.email ?? null,
        phoneNumber: cart.user.phoneNumber ?? null,
      } as UserEntity;
    } else {
      entity.user = null;
    }
    
    return entity;
  }

  /**
   * Converts Prisma Cart model with CartItems relation to CartEntity
   * @param cart - Prisma Cart model with optional CartItems relation
   * @returns CartEntity instance with nested cart items
   */
  static fromPrismaWithItems(cart: CartWithItems): CartEntity {
    const entity = this.fromPrisma(cart);
    
    // Map cart items if included
    if (cart.cartItems && Array.isArray(cart.cartItems)) {
      entity.cartItems = cart.cartItems.map((item) => {
        if (item instanceof CartItemEntity) {
          return item;
        }
        // Assume it's a Prisma CartItem if not already an entity
        return CartItemMapper.fromPrisma({
          id: item.id,
          cartId: item.cartId,
          productId: item.productId,
          quantity: item.quantity,
          salePrice: item.salePrice,
          status: item.status || ECartItemStatus.ACTIVE,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
      });
    } else {
      entity.cartItems = null;
    }
    
    return entity;
  }

  /**
   * Converts Prisma Cart model with all relations to CartEntity
   * @param cart - Prisma Cart model with User and CartItems relations
   * @returns CartEntity instance with all nested relations
   */
  static fromPrismaWithRelations(cart: CartWithRelations): CartEntity {
    const entity = this.fromPrisma({
      id: cart.id,
      userId: cart.userId,
      totalAmount: cart.totalAmount,
      checkedOutAt: cart.checkedOutAt,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    });
    
    // Map user if included
    if (cart.user) {
      entity.user = {
        id: cart.user.id,
        name: cart.user.name,
        email: cart.user.email ?? null,
        phoneNumber: cart.user.phoneNumber ?? null,
      } as UserEntity;
    } else {
      entity.user = null;
    }
    
    // Map cart items if included
    if (cart.cartItems && Array.isArray(cart.cartItems)) {
      entity.cartItems = cart.cartItems.map((item) => 
        CartItemMapper.fromPrismaWithProduct(item)
      );
    } else {
      entity.cartItems = null;
    }
    
    return entity;
  }

  /**
   * Converts CartEntity to CartResponseDto
   * @param entity - CartEntity instance
   * @returns CartResponseDto for API response
   */
  static toDto(entity: CartEntity): CartResponseDto {
    const dto = new CartResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.totalAmount = entity.totalAmount;
    dto.checkedOutAt = entity.checkedOutAt ?? null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    
    // Map user if present
    if (entity.user) {
      const userInfo = new CartUserInfoDto();
      userInfo.id = entity.user.id;
      userInfo.name = entity.user.name;
      userInfo.email = entity.user.email ?? null;
      userInfo.phoneNumber = entity.user.phoneNumber ?? null;
      dto.user = userInfo;
    } else {
      dto.user = null;
    }
    
    // Map cart items if present
    if (entity.cartItems && Array.isArray(entity.cartItems)) {
      dto.cartItems = entity.cartItems.map((item) => CartItemMapper.toDto(item));
    } else {
      dto.cartItems = null;
    }
    
    return dto;
  }

  /**
   * Converts array of CartEntity instances to CartResponseDto array
   * @param entities - Array of CartEntity instances
   * @returns Array of CartResponseDto for API response
   */
  static toDtoList(entities: CartEntity[]): CartResponseDto[] {
    return entities.map((entity) => this.toDto(entity));
  }

  /**
   * Converts UpdateCartDto to partial CartEntity
   * @param dto - UpdateCartDto from API request
   * @returns Partial CartEntity with only updated fields
   */
  static toEntityPartial(dto: UpdateCartDto): Partial<CartEntity> {
    const partial: Partial<CartEntity> = {};
    
    if (dto.userId !== undefined) {
      partial.userId = dto.userId;
    }
    
    return partial;
  }

  /**
   * Converts Prisma Cart model directly to CartResponseDto
   * @param cart - Prisma Cart model
   * @returns CartResponseDto for API response
   */
  static prismaToDto(cart: CartBase): CartResponseDto {
    const entity = this.fromPrisma(cart);
    return this.toDto(entity);
  }

  /**
   * Converts Prisma Cart model with relations directly to CartResponseDto
   * @param cart - Prisma Cart model with optional relations
   * @returns CartResponseDto for API response
   */
  static prismaToDtoWithRelations(cart: CartWithRelations): CartResponseDto {
    const entity = this.fromPrismaWithRelations(cart);
    return this.toDto(entity);
  }

  /**
   * Converts array of Prisma Cart models directly to CartResponseDto array
   * @param carts - Array of Prisma Cart models
   * @returns Array of CartResponseDto for API response
   */
  static prismaToDtoList(carts: CartBase[]): CartResponseDto[] {
    return carts.map((cart) => this.prismaToDto(cart));
  }

  /**
   * Converts array of Prisma Cart models with relations directly to CartResponseDto array
   * @param carts - Array of Prisma Cart models with optional relations
   * @returns Array of CartResponseDto for API response
   */
  static prismaToDtoListWithRelations(carts: CartWithRelations[]): CartResponseDto[] {
    return carts.map((cart) => this.prismaToDtoWithRelations(cart));
  }
}

