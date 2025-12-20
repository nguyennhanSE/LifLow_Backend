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
        include: includeUser ? { user: true } : undefined,
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
      include: includeUser ? { user: true } : undefined,
    })) as OrderWithUser[];
  }

  async findById(id: string, includeUser = true): Promise<OrderWithUser | null> {
    return (await this.prisma.order.findUnique({
      where: { id },
      include: includeUser ? { user: true } : undefined,
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
        // include: includeUser ? { user: true } : undefined,
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
}

