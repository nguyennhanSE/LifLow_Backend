import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, OrderGroup, User, Order, OrderSituation } from '@prisma/client';
import { OrderGroupNotFoundException } from '../exceptions/order-group-not-found.exception';
import { OrderGroupValidationException } from '../exceptions/order-group-validation.exception';
import { EOrderSituation } from '../enum/order.enum';
import { OrderGroupEntity } from '../entities/order.entity';

export type OrderGroupWithRelations = OrderGroup & { 
  user?: User | null;
  orders?: Order[] | null;
};

export interface OrderGroupPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class OrderGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.OrderGroupCreateInput,
    includeRelations = true,
  ): Promise<OrderGroupWithRelations> {
    try {
      return (await this.prisma.orderGroup.create({
        data,
        include: includeRelations ? { 
          user: true, 
          orders: {
            include: {
              product: true,
            },
          },
        } : undefined,
      })) as OrderGroupWithRelations;
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async findMany(params: {
    where: Prisma.OrderGroupWhereInput;
    orderBy?: Prisma.OrderGroupOrderByWithRelationInput;
    skip?: number;
    take?: number;
    includeRelations?: boolean;
  }): Promise<OrderGroupWithRelations[]> {
    const { where, orderBy, skip, take, includeRelations = true } = params;
    return (await this.prisma.orderGroup.findMany({
      where,
      orderBy,
      skip,
      take,
      include: includeRelations ? { 
        user: true, 
        orders: {
          include: {
            product: true,
          },
        },
      } : undefined,
    })) as OrderGroupWithRelations[];
  }

  async findByOrderGroupNumber(
    orderGroupNumber: string, 
    includeRelations = true
  ): Promise<OrderGroupWithRelations | null> {
    return (await this.prisma.orderGroup.findUnique({
      where: { orderGroupNumber },
      include: includeRelations ? { 
        user: true, 
        orders: {
          include: {
            product: true,
          },
        },
      } : undefined,
    })) as OrderGroupWithRelations | null;
  }

  async update(
    orderGroupNumber: string,
    data: Prisma.OrderGroupUpdateInput,
    includeRelations = true,
  ): Promise<OrderGroupEntity> {
    try {
      return (await this.prisma.orderGroup.update({
        where: { orderGroupNumber },
        data,
        include: includeRelations ? { 
          user: true, 
          orders: {
            include: {
              product: true,
            },
          },
        } : undefined,
      })) as OrderGroupEntity;
    } catch (error: any) {
      this.handlePrismaError(error, orderGroupNumber);
    }
  }

  async delete(orderGroupNumber: string): Promise<void> {
    try {
      await this.prisma.orderGroup.delete({ where: { orderGroupNumber } });
    } catch (error: any) {
      this.handlePrismaError(error, orderGroupNumber);
    }
  }

  async count(where: Prisma.OrderGroupWhereInput): Promise<number> {
    return this.prisma.orderGroup.count({ where });
  }

  async countBySituation(situation: EOrderSituation): Promise<number> {
    return this.prisma.orderGroup.count({ where: { situation: situation as OrderSituation } });
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return !!user;
  }

  async getLastOrderGroupNumber(prefix?: string): Promise<string | null> {
    const where: Prisma.OrderGroupWhereInput = prefix
      ? {
          orderGroupNumber: {
            startsWith: prefix,
          },
        }
      : {};
    
    const lastOrderGroup = await this.prisma.orderGroup.findFirst({
      orderBy: { orderGroupNumber: 'desc' },
      select: { orderGroupNumber: true },
      where,
    });
    return lastOrderGroup?.orderGroupNumber || null;
  }

  /**
   * Sum final_amount within a created_at date range
   */
  async sumFinalAmountByDateRange(
    from: Date,
    to: Date,
  ): Promise<number> {
    const result = await this.prisma.$queryRaw<
      Array<{ final_amount: string }>
    >`
      SELECT COALESCE(SUM(og.final_amount), 0) as final_amount
      FROM order_groups og
      WHERE og.created_at >= ${from}
        AND og.created_at < ${to}
    `;

    return parseInt(result?.[0]?.final_amount ?? '0', 10) || 0;
  }

  /**
   * Group final_amount by day within a created_at date range
   */
  async sumFinalAmountGroupByDayByDateRange(
    from: Date,
    to: Date,
  ): Promise<Array<{ date: string; finalAmount: number }>> {
    const rows = await this.prisma.$queryRaw<
      Array<{ date: string; final_amount: string }>
    >`
      SELECT
        DATE(og.created_at) as date,
        COALESCE(SUM(og.final_amount), 0) as final_amount
      FROM order_groups og
      WHERE og.created_at >= ${from}
        AND og.created_at < ${to}
      GROUP BY DATE(og.created_at)
      ORDER BY date ASC
    `;

    return (rows ?? []).map((r) => ({
      date: r.date,
      finalAmount: parseInt(r.final_amount ?? '0', 10) || 0,
    }));
  }

  private handlePrismaError(error: any, orderGroupNumber?: string): never {
    if (error?.code === 'P2025') {
      throw new OrderGroupNotFoundException(
        `OrderGroup with number ${orderGroupNumber ?? ''} not found`.trim(),
      );
    }
    if (error?.code === 'P2003') {
      throw new OrderGroupValidationException('Invalid order group data');
    }
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new OrderGroupValidationException(
        `OrderGroup with this ${field} already exists`,
      );
    }
    throw error;
  }
}
