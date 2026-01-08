import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { ECartItemStatus } from '../enums/cart.enum';

// Using any due to Prisma type generation issues
export type CartWithRelations = any;

type CartIncludeOptions = {
  includeUser?: boolean;
  includeItems?: boolean;
};

export interface CartFindManyParams {
  where?: Prisma.CartWhereInput;
  orderBy?: Prisma.CartOrderByWithRelationInput;
  skip?: number;
  take?: number;
  includeUser?: boolean;
  includeItems?: boolean;
}

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new cart
   */
  async create(
    data: Prisma.CartCreateInput,
    includeUser = true,
    includeItems = true,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.create({
      data,
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Find cart by ID
   */
  async findById(
    id: string,
    includeUser = true,
    includeItems = true,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.findUnique({
      where: { id },
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Find cart by user ID
   */
  async findByUserId(
    userId: string,
    includeUser = true,
    includeItems = true,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Find active cart by user ID (returns the most recent cart)
   */
  async findActiveCartByUserId(
    userId: string,
    includeUser = true,
    includeItems = true,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Find many carts with filters and pagination
   */
  async findMany(params: CartFindManyParams): Promise<CartWithRelations[]> {
    const {
      where,
      orderBy,
      skip,
      take,
      includeUser = true,
      includeItems = true,
    } = params;

    return await this.prisma.cart.findMany({
      where,
      orderBy,
      skip,
      take,
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Update cart
   */
  async update(
    id: string,
    data: Prisma.CartUpdateInput,
    includeUser = true,
    includeItems = true,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.update({
      where: { id },
      data,
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Delete cart
   */
  async delete(id: string): Promise<void> {
    await this.prisma.cart.delete({
      where: { id },
    });
  }

  /**
   * Count carts matching the where clause
   */
  async count(where: Prisma.CartWhereInput): Promise<number> {
    return await this.prisma.cart.count({ where });
  }

  /**
   * Update cart total amount
   */
  async updateTotalAmount(
    id: string,
    totalAmount: number,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.update({
      where: { id },
      data: { totalAmount },
      include: {
        user: true,
        cartItems: {
          include: {
            product: true,
          },
        },
      },
    }) as any;
  }

  /**
   * Checkout cart (set checkedOutAt timestamp only)
   */
  async checkout(
    id: string,
    includeUser = true,
    includeItems = true,
  ): Promise<CartWithRelations> {
    return await this.prisma.cart.update({
      where: { id },
      data: {
        checkedOutAt: new Date(),
      },
      include: {
        user: includeUser,
        cartItems: includeItems
          ? {
              include: {
                product: true,
              },
            }
          : false,
      },
    }) as any;
  }

  /**
   * Clear all ACTIVE items from cart (used in transaction)
   * Preserves CHECKED_OUT items
   */
  async clearItems(cartId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx || this.prisma;
    await client.cartItem.deleteMany({
      where: { 
        cartId,
        status: ECartItemStatus.ACTIVE,
      },
    });
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    return !!user;
  }
}

