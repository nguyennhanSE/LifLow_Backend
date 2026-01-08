import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ECartItemStatus } from '../enums/cart.enum';

// Using any due to Prisma type generation issues
export type CartItemWithRelations = any;

export interface CartItemFindManyParams {
  where?: Prisma.CartItemWhereInput;
  orderBy?: Prisma.CartItemOrderByWithRelationInput;
  skip?: number;
  take?: number;
  includeProduct?: boolean;
  includeCart?: boolean;
}

@Injectable()
export class CartItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new cart item with ACTIVE status by default
   */
  async create(
    cartId: string,
    productId: string,
    quantity: number,
    salePrice: number,
  ): Promise<CartItemWithRelations> {
    return await this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        quantity,
        salePrice,
        status: ECartItemStatus.ACTIVE,
      },
      include: {
        product: true,
        cart: true,
      },
    }) as any;
  }

  /**
   * Find cart item by ID
   */
  async findById(
    id: string,
  ): Promise<CartItemWithRelations> {
    return await this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        product: true,
        cart: true,
      },
    }) as any;
  }

  /**
   * Find cart item by cart ID and product ID (unique constraint)
   */
  async findByCartIdAndProductId(
    cartId: string,
    productId: string,
    includeProduct = true,
    includeCart = false,
  ): Promise<CartItemWithRelations> {
    return await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
      include: {
        product: includeProduct,
        cart: includeCart,
      },
    }) as any;
  }

  /**
   * Find all cart items by cart ID
   */
  async findByCartId(
    cartId: string,
    includeProduct = true,
    includeCart = false,
    orderBy?: Prisma.CartItemOrderByWithRelationInput,
  ): Promise<CartItemWithRelations[]> {
    return await this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        product: includeProduct,
        cart: includeCart,
      },
      orderBy: orderBy || { createdAt: 'desc' },
    }) as any;
  }

  /**
   * Find many cart items with filters
   */
  async findMany(
    params: CartItemFindManyParams,
  ): Promise<CartItemWithRelations[]> {
    const {
      where,
      orderBy,
      skip,
      take,
      includeProduct = true,
      includeCart = false,
    } = params;

    return await this.prisma.cartItem.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        product: includeProduct,
        cart: includeCart,
      },
    }) as any;
  }

  /**
   * Update cart item
   */
  async update(
    id: string,
    data: Prisma.CartItemUpdateInput,
    includeProduct = true,
    includeCart = false,
  ): Promise<CartItemWithRelations> {
    return await this.prisma.cartItem.update({
      where: { id },
      data,
      include: {
        product: includeProduct,
        cart: includeCart,
      },
    }) as any;
  }

  /**
   * Delete cart item
   */
  async delete(id: string): Promise<void> {
    await this.prisma.cartItem.delete({
      where: { id },
    });
  }

  /**
   * Delete many cart items (used for clearing cart)
   */
  async deleteMany(
    where: Prisma.CartItemWhereInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    await client.cartItem.deleteMany({
      where,
    });
  }

  /**
   * Count cart items matching the where clause
   */
  async count(where: Prisma.CartItemWhereInput): Promise<number> {
    return await this.prisma.cartItem.count({ where });
  }

  /**
   * Calculate total amount for all ACTIVE items in a cart
   */
  async calculateCartTotal(cartId: string): Promise<number> {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { 
        cartId,
        status: ECartItemStatus.ACTIVE, // Only count active items
      },
    });

    return cartItems.reduce((sum, item) => {
      return sum + item.quantity * item.salePrice;
    }, 0);
  }

  /**
   * Calculate total amount for all ACTIVE items in a cart (transaction version)
   */
  async calculateCartTotalInTransaction(
    cartId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const cartItems = await tx.cartItem.findMany({
      where: { 
        cartId,
        status: ECartItemStatus.ACTIVE, // Only count active items
      },
    });

    return cartItems.reduce((sum, item) => {
      return sum + item.quantity * item.salePrice;
    }, 0);
  }
}

