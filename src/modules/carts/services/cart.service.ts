import { CartItemService } from './cart-item.service';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCartDto } from '../dto/create-cart.dto';
import { UpdateCartDto } from '../dto/update-cart.dto';
import { QueryCartDto } from '../dto/query-cart.dto';
import { CartResponseDto } from '../dto/cart-response.dto';
import { CartMapper } from '../mapper/cart.mapper';
import { CartEntity } from '../entities/cart.entity';
import { ECartStatus } from '../enums/cart.enum';
import { CartRepository } from '../repositories/cart.repository';
import { CartItemRepository } from '../repositories/cart-item.repository';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';

/**
 * Service for managing shopping carts
 */
@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartRepository: CartRepository,
    private readonly cartItemService: CartItemService,
    private readonly cartItemRepository: CartItemRepository,
  ) {}

  /**
   * Create a new cart for a user
   * @param userId - User ID to create cart for
   * @returns Created cart with items
   */
  async createCart(userId: string): Promise<CartResponseDto> {
    try {
      this.logger.log(`Creating cart for user: ${userId}`);

      // Check if user already has an active cart
      const existingCart = await this.cartRepository.findActiveCartByUserId(userId);

      if (existingCart) {
        this.logger.warn(`User ${userId} already has an active cart`);
        return CartMapper.prismaToDtoWithRelations(existingCart);
      }

      // Check if user exists
      // const userExists = await this.cartRepository.userExists(userId);
      // if (!userExists) {
      //   throw new NotFoundException(`User with ID ${userId} not found`);
      // }

      // Create new cart
      const cart = await this.cartRepository.create({
        user: {
          connect: { id: userId },
        },
        status: ECartStatus.ACTIVE,
        totalAmount: 0,
      });

      this.logger.log(`Cart created successfully: ${cart.id}`);
      return CartMapper.prismaToDtoWithRelations(cart);
    } catch (error: any) {
      this.logger.error(`Failed to create cart for user ${userId}: ${error.message}`);
      this.handleError(error, 'Failed to create cart');
    }
  }
  async addItemToCart(userId: string, addItemDto: CreateCartItemDto): Promise<CartResponseDto> {
    try {
      this.logger.log(`Adding item to cart for user: ${userId}`);

      // Find or create active cart for user
      let cart = await this.cartRepository.findActiveCartByUserId(userId);

      if (!cart) {
        // Create a new cart if user doesn't have an active one
        this.logger.log(`No active cart found for user ${userId}, creating new cart`);
        cart = await this.cartRepository.create({
          user: {
            connect: { id: userId },
          },
          status: ECartStatus.ACTIVE,
          totalAmount: 0,
        });
      }

      // TypeScript type guard
      if (!cart || !cart.id) {
        throw new Error('Failed to get or create cart');
      }

      const cartId = cart.id as string;
      
      await this.cartItemService.addItem(cartId, addItemDto);
      
      // Recalculate cart total
      await this.calculateCartTotal(cartId);
      
      // Get updated cart with all items
      const updatedCart = await this.cartRepository.findById(cartId);
      
      if (!updatedCart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found after update`);
      }
      
      return CartMapper.prismaToDtoWithRelations(updatedCart);
    } catch (error: any) {
      this.logger.error(`Failed to add item to cart for user ${userId}: ${error.message}`);
      this.handleError(error, 'Failed to add item to cart');
    }
  }
  /**
   * Get cart by ID with items
   * @param id - Cart ID
   * @returns Cart with items and user info
   */
  async getCartById(id: string): Promise<CartResponseDto> {
    try {
      this.logger.log(`Fetching cart by ID: ${id}`);

      const cart = await this.cartRepository.findById(id);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      return CartMapper.prismaToDtoWithRelations(cart);
    } catch (error: any) {
      this.logger.error(`Failed to fetch cart ${id}: ${error.message}`);
      this.handleError(error, `Failed to fetch cart ${id}`);
    }
  }

  /**
   * Get active cart for a user
   * @param userId - User ID
   * @returns Active cart with items, or null if not found
   */
  async getCartByUserId(userId: string): Promise<CartResponseDto | null> {
    try {
      this.logger.log(`Fetching active cart for user: ${userId}`);

      const cart = await this.cartRepository.findActiveCartByUserId(userId);

      if (!cart) {
        this.logger.log(`No active cart found for user: ${userId}`);
        return null;
      }

      return CartMapper.prismaToDtoWithRelations(cart);
    } catch (error: any) {
      this.logger.error(`Failed to fetch cart for user ${userId}: ${error.message}`);
      this.handleError(error, `Failed to fetch cart for user ${userId}`);
    }
  }

  /**
   * Update cart
   * @param id - Cart ID
   * @param updateDto - Update data
   * @returns Updated cart
   */
  async updateCart(id: string, updateDto: UpdateCartDto): Promise<CartResponseDto> {
    try {
      this.logger.log(`Updating cart: ${id}`);

      // Check if cart exists
      const existingCart = await this.cartRepository.findById(id, false, false);

      if (!existingCart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      // Validate business rules
      if (updateDto.status === ECartStatus.CHECKED_OUT && existingCart.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cart is already checked out');
      }

      // Prepare update data
      const updateData: Prisma.CartUpdateInput = CartMapper.toEntityPartial(updateDto) as any;

      // If checking out, set checkedOutAt timestamp
      if (updateDto.status === ECartStatus.CHECKED_OUT) {
        updateData.checkedOutAt = new Date();
      }

      const updatedCart = await this.cartRepository.update(id, updateData);

      this.logger.log(`Cart updated successfully: ${id}`);
      return CartMapper.prismaToDtoWithRelations(updatedCart);
    } catch (error: any) {
      this.logger.error(`Failed to update cart ${id}: ${error.message}`);
      this.handleError(error, `Failed to update cart ${id}`);
    }
  }

  /**
   * Delete cart
   * @param id - Cart ID
   */
  async deleteCart(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting cart: ${id}`);

      // Check if cart exists
      const cart = await this.cartRepository.findById(id, false, false);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      // Cart items will be deleted automatically due to onDelete: Cascade
      await this.cartRepository.delete(id);

      this.logger.log(`Cart deleted successfully: ${id}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete cart ${id}: ${error.message}`);
      this.handleError(error, `Failed to delete cart ${id}`);
    }
  }

  /**
   * Checkout cart (change status to CHECKED_OUT)
   * @param id - Cart ID
   * @returns Checked out cart
   */
  async checkoutCart(id: string): Promise<CartResponseDto> {
    try {
      this.logger.log(`Checking out cart: ${id}`);

      const cart = await this.cartRepository.findById(id, false, true);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      if (cart.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cart is already checked out');
      }

      if (!cart.cartItems || cart.cartItems.length === 0) {
        throw new BadRequestException('Cannot checkout empty cart');
      }

      const updatedCart = await this.cartRepository.checkout(id);

      this.logger.log(`Cart checked out successfully: ${id}`);
      return CartMapper.prismaToDtoWithRelations(updatedCart);
    } catch (error: any) {
      this.logger.error(`Failed to checkout cart ${id}: ${error.message}`);
      this.handleError(error, `Failed to checkout cart ${id}`);
    }
  }

  /**
   * Clear cart (remove all items)
   * @param id - Cart ID
   * @returns Updated cart
   */
  async clearCart(id: string): Promise<CartResponseDto> {
    try {
      this.logger.log(`Clearing cart: ${id}`);

      const cart = await this.cartRepository.findById(id, false, false);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${id} not found`);
      }

      if (cart.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot clear checked out cart');
      }

      // Use transaction to remove all items and update total
      const updatedCart = await this.prisma.$transaction(async (tx) => {
        // Delete all cart items
        await tx.cartItem.deleteMany({
          where: { cartId: id },
        });

        // Update cart total to 0
        return tx.cart.update({
          where: { id },
          data: {
            totalAmount: 0,
          },
          include: {
            user: true,
            cartItems: {
              include: {
                product: true,
              },
            },
          },
        });
      });

      this.logger.log(`Cart cleared successfully: ${id}`);
      return CartMapper.prismaToDtoWithRelations(updatedCart);
    } catch (error: any) {
      this.logger.error(`Failed to clear cart ${id}: ${error.message}`);
      this.handleError(error, `Failed to clear cart ${id}`);
    }
  }

  /**
   * Calculate and update cart total amount
   * @param cartId - Cart ID
   * @returns Updated total amount
   */
  async calculateCartTotal(cartId: string): Promise<number> {
    try {
      this.logger.log(`Calculating total for cart: ${cartId}`);

      const total = await this.cartItemRepository.calculateCartTotal(cartId);

      // Update cart total
      await this.cartRepository.updateTotalAmount(cartId, total);

      this.logger.log(`Cart total calculated: ${total} for cart ${cartId}`);
      return total;
    } catch (error: any) {
      this.logger.error(`Failed to calculate cart total for ${cartId}: ${error.message}`);
      this.handleError(error, `Failed to calculate cart total for ${cartId}`);
    }
  }

  /**
   * List carts with pagination and filters
   * @param queryDto - Query parameters
   * @returns Paginated list of carts
   */
  async listCarts(queryDto: QueryCartDto): Promise<{
    data: CartResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      this.logger.log(`Listing carts with filters: ${JSON.stringify(queryDto)}`);

      const {
        userId,
        status,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = queryDto;

      // Build where clause
      const where: Prisma.CartWhereInput = {};
      if (userId) {
        where.userId = userId;
      }
      if (status) {
        where.status = status;
      }

      // Build order by
      const orderBy: Prisma.CartOrderByWithRelationInput = {};
      if (sortBy) {
        orderBy[sortBy as keyof Prisma.CartOrderByWithRelationInput] = sortOrder;
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute queries in parallel
      const [carts, total] = await Promise.all([
        this.cartRepository.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.cartRepository.count(where),
      ]);

      return {
        data: CartMapper.prismaToDtoListWithRelations(carts),
        total,
        page,
        limit,
      };
    } catch (error: any) {
      this.logger.error(`Failed to list carts: ${error.message}`);
      this.handleError(error, 'Failed to list carts');
    }
  }

  /**
   * Handle errors and throw appropriate HTTP exceptions
   */
  private handleError(error: any, defaultMessage: string): never {
    if (error instanceof NotFoundException || error instanceof BadRequestException) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException('Cart with this configuration already exists');
        case 'P2025':
          throw new NotFoundException('Cart not found');
        case 'P2003':
          throw new BadRequestException('Invalid cart data');
        default:
          throw new BadRequestException(defaultMessage);
      }
    }

    throw new BadRequestException(defaultMessage);
  }
}

