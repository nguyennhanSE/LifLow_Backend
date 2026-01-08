import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CartItemResponseDto } from '../dto/cart-response.dto';
import { CartItemMapper } from '../mapper/cart-item.mapper';
import { CartItemEntity } from '../entities/cart-item.entity';
import { ECartStatus, ECartItemStatus } from '../enums/cart.enum';
import { CartItemRepository } from '../repositories/cart-item.repository';
import { CartRepository } from '../repositories/cart.repository';

/**
 * Service for managing cart items
 */
@Injectable()
export class CartItemService {
  private readonly logger = new Logger(CartItemService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartItemRepository: CartItemRepository,
    private readonly cartRepository: CartRepository,
  ) {}

  /**
   * Add item to cart
   * @param createDto - Cart item creation data
   * @returns Created cart item
   */
  async addItem(cartId: string, createDto: CreateCartItemDto): Promise<CartItemResponseDto> {
    try {
      this.logger.log(`Adding item to cart: ${cartId}, product: ${createDto.productId}`);
      const cart = await this.cartRepository.findById(cartId);
      if (!cart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found`);
      }

      if (cart.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot add items to checked out cart');
      }

      // Validate product exists and is available
      const product = await this.prisma.product.findUnique({
        where: { id: createDto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${createDto.productId} not found`);
      }

      // Check product availability
      if (product.displayStatus !== 'ACTIVE') {
        throw new BadRequestException('Product is not available for purchase');
      }

      // Use transaction to add item and update cart total
      const cartItem = await this.prisma.$transaction(async (tx) => {
        // Check if item already exists in cart
        const existingItem = await tx.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId,
              productId: createDto.productId,
            },
          },
        });

        if (existingItem) {
          // Check if existing item is already checked out
          if (existingItem.status === ECartItemStatus.CHECKED_OUT) {
            throw new BadRequestException('Cannot update checked out cart item');
          }

          // Update quantity if item already exists
          const updatedItem = await tx.cartItem.update({
            where: { id: existingItem.id },
            data: {
              quantity: existingItem.quantity + createDto.quantity,
              salePrice: createDto.salePrice, // Update to latest price
            },
            include: {
              product: true,
            },
          });

          // Recalculate cart total
          await this.recalculateCartTotal(tx, cartId);

          return updatedItem;
        } else {
          // Create new cart item with ACTIVE status
          const newItem = await tx.cartItem.create({
            data: {
              cartId,
              productId: createDto.productId,
              quantity: createDto.quantity,
              salePrice: createDto.salePrice,
              status: ECartItemStatus.ACTIVE,
            },
            include: {
              product: true,
            },
          });

          // Recalculate cart total
          await this.recalculateCartTotal(tx, cartId);

          return newItem;
        }
      });

      this.logger.log(`Item added successfully to cart: ${cartId}`);
      return CartItemMapper.prismaToDtoWithProduct(cartItem);
    } catch (error: any) {
      this.logger.error(
        `Failed to add item to cart ${cartId}: ${error.message}`,
      );
      this.handleError(error, 'Failed to add item to cart');
    }
  }

  /**
   * Update cart item
   * @param id - Cart item ID
   * @param updateDto - Update data
   * @returns Updated cart item
   */
  async updateItem(
    id: string,
    updateDto: UpdateCartItemDto,
  ): Promise<CartItemResponseDto> {
    try {
      this.logger.log(`Updating cart item: ${id}`);

      const cartItem = await this.cartItemRepository.findById(id);

      if (!cartItem) {
        throw new NotFoundException(`Cart item with ID ${id} not found`);
      }

      // Validate cart is not checked out
      if (cartItem.cart?.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot update items in checked out cart');
      }

      // Validate cart item is not checked out
      if (cartItem.status === ECartItemStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot update checked out cart item');
      }

      // Validate quantity if provided
      if (updateDto.quantity !== undefined && updateDto.quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      // Use transaction to update item and cart total
      const updatedItem = await this.prisma.$transaction(async (tx) => {
        const item = await tx.cartItem.update({
          where: { id },
          data: CartItemMapper.toEntityPartial(updateDto) as any,
          include: {
            product: true,
          },
        });

        // Recalculate cart total
        await this.recalculateCartTotal(tx, cartItem.cartId);

        return item;
      });

      this.logger.log(`Cart item updated successfully: ${id}`);
      return CartItemMapper.prismaToDtoWithProduct(updatedItem);
    } catch (error: any) {
      this.logger.error(`Failed to update cart item ${id}: ${error.message}`);
      this.handleError(error, `Failed to update cart item ${id}`);
    }
  }

  /**
   * Remove item from cart
   * @param id - Cart item ID
   */
  async removeItem(id: string): Promise<void> {
    try {
      this.logger.log(`Removing cart item: ${id}`);

      const cartItem = await this.cartItemRepository.findById(id);

      if (!cartItem) {
        throw new NotFoundException(`Cart item with ID ${id} not found`);
      }

      // Validate cart is not checked out
      if (cartItem.cart?.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot remove items from checked out cart');
      }

      // Validate cart item is not checked out
      if (cartItem.status === ECartItemStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot remove checked out cart item');
      }

      // Use transaction to remove item and update cart total
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.delete({
          where: { id },
        });

        // Recalculate cart total
        await this.recalculateCartTotal(tx, cartItem.cartId);
      });

      this.logger.log(`Cart item removed successfully: ${id}`);
    } catch (error: any) {
      this.logger.error(`Failed to remove cart item ${id}: ${error.message}`);
      this.handleError(error, `Failed to remove cart item ${id}`);
    }
  }

  /**
   * Get cart item by ID
   * @param id - Cart item ID
   * @returns Cart item with product info
   */
  async getItemById(id: string): Promise<CartItemResponseDto> {
    try {
      this.logger.log(`Fetching cart item by ID: ${id}`);

      const cartItem = await this.cartItemRepository.findById(id);

      if (!cartItem) {
        throw new NotFoundException(`Cart item with ID ${id} not found`);
      }

      return CartItemMapper.prismaToDtoWithProduct(cartItem);
    } catch (error: any) {
      this.logger.error(`Failed to fetch cart item ${id}: ${error.message}`);
      this.handleError(error, `Failed to fetch cart item ${id}`);
    }
  }

  /**
   * Get all items in a cart
   * @param cartId - Cart ID
   * @returns Array of cart items
   */
  async getItemsByCartId(cartId: string): Promise<CartItemResponseDto[]> {
    try {
      this.logger.log(`Fetching items for cart: ${cartId}`);

      // Validate cart exists
      const cart = await this.cartRepository.findById(cartId, false, false);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found`);
      }

      const cartItems = await this.cartItemRepository.findByCartId(cartId);

      return CartItemMapper.prismaToDtoListWithProduct(cartItems);
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch items for cart ${cartId}: ${error.message}`,
      );
      this.handleError(error, `Failed to fetch items for cart ${cartId}`);
    }
  }

  /**
   * Update cart item quantity
   * @param id - Cart item ID
   * @param quantity - New quantity
   * @returns Updated cart item
   */
  async updateItemQuantity(
    id: string,
    quantity: number,
  ): Promise<CartItemResponseDto> {
    try {
      this.logger.log(`Updating quantity for cart item: ${id} to ${quantity}`);

      if (quantity < 1) {
        throw new BadRequestException('Quantity must be at least 1');
      }

      const cartItem = await this.cartItemRepository.findById(id);

      if (!cartItem) {
        throw new NotFoundException(`Cart item with ID ${id} not found`);
      }

      // Validate cart is not checked out
      if (cartItem.cart?.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot update items in checked out cart');
      }

      // Validate cart item is not checked out
      if (cartItem.status === ECartItemStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot update checked out cart item');
      }

      // Use transaction to update quantity and cart total
      const updatedItem = await this.prisma.$transaction(async (tx) => {
        const item = await tx.cartItem.update({
          where: { id },
          data: { quantity },
          include: {
            product: true,
          },
        });

        // Recalculate cart total
        await this.recalculateCartTotal(tx, cartItem.cartId);

        return item;
      });

      this.logger.log(`Cart item quantity updated successfully: ${id}`);
      return CartItemMapper.prismaToDtoWithProduct(updatedItem);
    } catch (error: any) {
      this.logger.error(
        `Failed to update quantity for cart item ${id}: ${error.message}`,
      );
      this.handleError(error, `Failed to update quantity for cart item ${id}`);
    }
  }

  /**
   * Remove all items from a cart
   * @param cartId - Cart ID
   */
  async clearItemsByCartId(cartId: string): Promise<void> {
    try {
      this.logger.log(`Clearing all items from cart: ${cartId}`);

      const cart = await this.cartRepository.findById(cartId);

      if (!cart) {
        throw new NotFoundException(`Cart with ID ${cartId} not found`);
      }

      if (cart.status === ECartStatus.CHECKED_OUT) {
        throw new BadRequestException('Cannot clear checked out cart');
      }

      // Check if any cart items are checked out
      const checkedOutItems = await this.prisma.cartItem.count({
        where: {
          cartId,
          status: ECartItemStatus.CHECKED_OUT,
        },
      });

      if (checkedOutItems > 0) {
        throw new BadRequestException('Cannot clear cart with checked out items');
      }

      // Use transaction to remove all items and update cart total
      await this.prisma.$transaction(async (tx) => {
        await tx.cartItem.deleteMany({
          where: { cartId },
        });

        await tx.cart.update({
          where: { id: cartId },
          data: { totalAmount: 0 },
        });
      });

      this.logger.log(`All items cleared from cart: ${cartId}`);
    } catch (error: any) {
      this.logger.error(
        `Failed to clear items from cart ${cartId}: ${error.message}`,
      );
      this.handleError(error, `Failed to clear items from cart ${cartId}`);
    }
  }

  /**
   * Recalculate cart total amount (only counts ACTIVE items)
   * @param tx - Prisma transaction client
   * @param cartId - Cart ID
   */
  private async recalculateCartTotal(
    tx: Prisma.TransactionClient,
    cartId: string,
  ): Promise<void> {
    const cartItems = await tx.cartItem.findMany({
      where: { 
        cartId,
        status: ECartItemStatus.ACTIVE, // Only count active items
      },
    });

    const total = cartItems.reduce((sum, item) => {
      return sum + item.quantity * item.salePrice;
    }, 0);

    await tx.cart.update({
      where: { id: cartId },
      data: { totalAmount: total },
    });
  }

  /**
   * Handle errors and throw appropriate HTTP exceptions
   */
  private handleError(error: any, defaultMessage: string): never {
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(
            'Cart item with this configuration already exists',
          );
        case 'P2025':
          throw new NotFoundException('Cart item not found');
        case 'P2003':
          throw new BadRequestException('Invalid cart item data');
        default:
          throw new BadRequestException(defaultMessage);
      }
    }

    throw new BadRequestException(defaultMessage);
  }
}

