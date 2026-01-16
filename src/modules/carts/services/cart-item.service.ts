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
import { BulkUpdateCartItemsDto } from '../dto/bulk-update-cart-item.dto';
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
      this.logger.debug(`Product displayStatus: "${product.displayStatus}" (type: ${typeof product.displayStatus})`);
      const trimmedDisplayStatus = product.displayStatus?.trim();
      if (trimmedDisplayStatus !== 'Y') {
        this.logger.warn(`Product ${createDto.productId} has displayStatus: "${product.displayStatus}", trimmed: "${trimmedDisplayStatus}"`);
        throw new BadRequestException('Product is not available for purchase');
      }

      // Get salePrice from product
      if (!product.salePrice) {
        throw new BadRequestException('Product does not have a sale price');
      }
      const salePrice = product.salePrice;

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
              salePrice: salePrice, // Update to latest price from product
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
              salePrice: salePrice, // Get from product
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
   * Bulk update cart items
   * @param bulkUpdateDto - Bulk update data containing array of items to update
   * @returns Array of updated cart items
   */
  async bulkUpdateItems(
    bulkUpdateDto: BulkUpdateCartItemsDto,
  ): Promise<CartItemResponseDto[]> {
    try {
      this.logger.log(`Bulk updating ${bulkUpdateDto.items.length} cart items`);

      if (bulkUpdateDto.items.length === 0) {
        throw new BadRequestException('Items array cannot be empty');
      }

      // Get all cart items first to validate they exist and check their status
      const cartItemIds = bulkUpdateDto.items.map((item) => item.id);
      const existingItems = await this.prisma.cartItem.findMany({
        where: {
          id: { in: cartItemIds },
        },
        include: {
          cart: true,
          product: true,
        },
      });

      // Check if all items exist
      if (existingItems.length !== cartItemIds.length) {
        const foundIds = new Set(existingItems.map((item) => item.id));
        const missingIds = cartItemIds.filter((id) => !foundIds.has(id));
        throw new NotFoundException(
          `Cart items not found: ${missingIds.join(', ')}`,
        );
      }

      // Validate all carts are not checked out
      const checkedOutCarts = existingItems.filter(
        (item) => item.cart?.checkedOutAt !== null,
      );
      if (checkedOutCarts.length > 0) {
        throw new BadRequestException(
          'Cannot update items in checked out cart',
        );
      }

      // Validate all cart items are not checked out
      const checkedOutItems = existingItems.filter(
        (item) => item.status === ECartItemStatus.CHECKED_OUT,
      );
      if (checkedOutItems.length > 0) {
        throw new BadRequestException('Cannot update checked out cart items');
      }

      // Validate quantities if provided
      for (const item of bulkUpdateDto.items) {
        if (item.data.quantity !== undefined && item.data.quantity < 1) {
          throw new BadRequestException(
            `Quantity must be at least 1 for cart item ${item.id}`,
          );
        }
      }

      // Get unique cart IDs to recalculate totals
      const uniqueCartIds = [...new Set(existingItems.map((item) => item.cartId))];

      // Use transaction to update all items and recalculate cart totals
      const updatedItems = await this.prisma.$transaction(async (tx) => {
        const updated: any[] = [];

        // Update each item
        for (const itemUpdate of bulkUpdateDto.items) {
          const item = await tx.cartItem.update({
            where: { id: itemUpdate.id },
            data: CartItemMapper.toEntityPartial(itemUpdate.data) as any,
            include: {
              product: true,
            },
          });
          updated.push(item);
        }

        // Recalculate totals for all affected carts
        for (const cartId of uniqueCartIds) {
          await this.recalculateCartTotal(tx, cartId);
        }

        return updated;
      });

      this.logger.log(
        `Successfully bulk updated ${updatedItems.length} cart items`,
      );
      return CartItemMapper.prismaToDtoListWithProduct(updatedItems);
    } catch (error: any) {
      this.logger.error(
        `Failed to bulk update cart items: ${error.message}`,
      );
      this.handleError(error, 'Failed to bulk update cart items');
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

