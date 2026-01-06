import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Order, User } from '@prisma/client';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';
import { OrderValidationException } from '../exceptions/order-validation.exception';
import { EOrderSituation } from '../enum/order.enum';
import { OrderEntity } from '../entities/order.entity';

export type OrderWithUser = Order & { user?: User | null };

export interface OrderPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.OrderCreateInput,
    includeUser = true,
  ): Promise<OrderWithUser> {
    try {
      return (await this.prisma.order.create({
        data,
        include: includeUser ? { user: true, product: true } : undefined,
      })) as OrderWithUser;
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async findMany(params: {
    where: Prisma.OrderWhereInput;
    orderBy?: Prisma.OrderOrderByWithRelationInput;
    skip?: number;
    take?: number;
    includeUser?: boolean;
  }): Promise<OrderWithUser[]> {
    const { where, orderBy, skip, take, includeUser = true } = params;
    return (await this.prisma.order.findMany({
      where,
      orderBy,
      skip,
      take,
      include: includeUser ? { user: true, product: true } : undefined,
    })) as OrderWithUser[];
  }

  async findById(id: string, includeUser = true): Promise<OrderWithUser | null> {
    return (await this.prisma.order.findUnique({
      where: { id },
      include: includeUser ? { user: true, product: true } : undefined,
    })) as OrderWithUser | null;
  }

  async update(
    id: string,
    data: Prisma.OrderUpdateInput,
    includeUser = true,
  ): Promise<OrderEntity> {
    try {
      return (await this.prisma.order.update({
        where: { id },
        data,
        include: includeUser ? { user: true, product: true } : undefined,
      })) as OrderEntity;
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.order.delete({ where: { id } });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  async count(where: Prisma.OrderWhereInput): Promise<number> {
    return this.prisma.order.count({ where });
  }

  async countByStatus(status: EOrderSituation): Promise<number> {
    return this.prisma.order.count({ where: { situation: status } as any });
  }

  /**
   * Sum total_payment_amount within an order_date [from, toExclusive) range.
   * Note: order_date is stored as TEXT, but lexicographic range works with YYYY-MM-DD (and YYYY-MM-DD HH:mm:ss).
   */
  async sumTotalPaymentAmountByOrderDateRange(
    from: string,
    toExclusive: string,
  ): Promise<number> {
    const result = await this.prisma.$queryRaw<
      Array<{ total_payment_amount: string }>
    >`
      SELECT COALESCE(SUM(o.total_payment_amount), 0) as total_payment_amount
      FROM orders o
      WHERE o.order_date >= ${from}
        AND o.order_date < ${toExclusive}
    `;

    return parseInt(result?.[0]?.total_payment_amount ?? '0', 10) || 0;
  }

  /**
   * Group total_payment_amount by day (LEFT(order_date, 10)) within an order_date [from, toExclusive) range.
   */
  async sumTotalPaymentAmountGroupByDayByOrderDateRange(
    from: string,
    toExclusive: string,
  ): Promise<Array<{ date: string; totalPaymentAmount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ date: string; total_payment_amount: string }>
    >`
      SELECT
        LEFT(o.order_date, 10) as date,
        COALESCE(SUM(o.total_payment_amount), 0) as total_payment_amount
      FROM orders o
      WHERE o.order_date >= ${from}
        AND o.order_date < ${toExclusive}
      GROUP BY LEFT(o.order_date, 10)
      ORDER BY date ASC
    `;

    return (rows ?? []).map((r) => ({
      date: r.date,
      totalPaymentAmount: parseInt(r.total_payment_amount ?? '0', 10) || 0,
    }));
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return !!user;
  }
  // Get user order number
  async getUserOrderNumber(userId: string): Promise<number> {
    const order = await this.prisma.order.findMany({ where: { user: { id: userId } } });
    return order.length ?? 0;
  }

  private handlePrismaError(error: any, id?: string): never {
    if (error?.code === 'P2025') {
      throw new OrderNotFoundException(`Order with id ${id ?? ''} not found`.trim());
    }
    if (error?.code === 'P2003') {
      throw new OrderValidationException('Invalid order data');
    }
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new OrderValidationException(`Order with this ${field} already exists`);
    }
    throw error;
  }
  async getOrderNumber(userId: string): Promise<number> {
    const order = await this.prisma.order.findMany({ where: { user: { id: userId } } });
    return order.length ?? 0;
  }
  
  async getLastItemWiseOrderNumber(prefix?: string): Promise<string | null> {
    const where: Prisma.OrderWhereInput = prefix
      ? {
          itemWiseOrderNumber: {
            startsWith: prefix,
          },
        }
      : {};
    
    const lastOrder = await this.prisma.order.findFirst({
      orderBy: { itemWiseOrderNumber: 'desc' },
      select: { itemWiseOrderNumber: true },
      where,
    });
    return lastOrder?.itemWiseOrderNumber || null;
  }

  async getLastOrderNumber(itemWiseOrderNumber: string): Promise<string | null> {
    const where: Prisma.OrderWhereInput = {
      itemWiseOrderNumber: {
        equals: itemWiseOrderNumber,
      },
      orderNumber: {
        startsWith: `${itemWiseOrderNumber}-`,
      },
    };
    const lastOrder = await this.prisma.order.findFirst({
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
      where,
    });
    return lastOrder?.orderNumber || null;
  }
}

