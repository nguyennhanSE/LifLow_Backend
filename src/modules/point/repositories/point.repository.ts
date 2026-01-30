import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Point, User } from '@prisma/client';
import { PointNotFoundException } from '../exceptions/point-not-found.exception';
import { PointValidationException } from '../exceptions/point-validation.exception';
import { PointEntity } from '../entities/point.entity';

export type PointWithRelations = Point & { user?: User | null; orderGroup?: any };

@Injectable()
export class PointRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.PointCreateInput,
    includeRelations = true,
  ): Promise<PointWithRelations> {
    try {
      const include: any = includeRelations ? { user: true, orderGroup: true } : undefined;
      return (await this.prisma.point.create({
        data,
        include,
      })) as PointWithRelations;
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  async findMany(params: {
    where: Prisma.PointWhereInput;
    orderBy?: Prisma.PointOrderByWithRelationInput;
    skip?: number;
    take?: number;
    includeRelations?: boolean;
  }): Promise<PointWithRelations[]> {
    const { where, orderBy, skip, take, includeRelations = true } = params;
    const include: any = includeRelations ? { user: true, orderGroup: true } : undefined;
    return (await this.prisma.point.findMany({
      where,
      orderBy,
      skip,
      take,
      include,
    })) as PointWithRelations[];
  }

  async findById(id: string, includeRelations = true): Promise<PointWithRelations | null> {
    const include: any = includeRelations ? { user: true, orderGroup: true } : undefined;
    return (await this.prisma.point.findUnique({
      where: { id },
      include,
    })) as PointWithRelations | null;
  }

  async findByUserId(userId: string, includeRelations = true): Promise<PointWithRelations | null> {
    const include: any = includeRelations ? { user: true, orderGroup: true } : undefined;
    return (await this.prisma.point.findFirst({
      where: { userId },
      include,
    })) as PointWithRelations | null;
  }

  async findByOrderGroupNumber(
    orderGroupNumber: string,
    includeRelations = true,
  ): Promise<PointWithRelations | null> {
    const include: any = includeRelations ? { user: true, orderGroup: true } : undefined;
    return (await this.prisma.point.findFirst({
      where: { orderGroupNumber },
      include,
    })) as PointWithRelations | null;
  }

  async update(
    id: string,
    data: Prisma.PointUpdateInput,
    includeRelations = true,
  ): Promise<PointEntity> {
    try {
      const include: any = includeRelations ? { user: true, orderGroup: true } : undefined;
      return (await this.prisma.point.update({
        where: { id },
        data,
        include,
      })) as PointEntity;
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.point.delete({ where: { id } });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  async count(where: Prisma.PointWhereInput): Promise<number> {
    return this.prisma.point.count({ where });
  }

  async userExists(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return !!user;
  }

  async orderGroupExists(orderGroupNumber: string): Promise<boolean> {
    const orderGroup = await this.prisma.orderGroup.findUnique({ where: { orderGroupNumber } });
    return !!orderGroup;
  }

  async getUserMembershipAndPoints(
    userId: string,
  ): Promise<{ membershipLevel: string | null; availablePoints: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { membershipLevel: true, availablePoints: true },
    });
    if (!user) {
      return { membershipLevel: null, availablePoints: 0 };
    }
    return {
      membershipLevel: user.membershipLevel ?? null,
      availablePoints: user.availablePoints ?? 0,
    };
  }

  async updateUserAvailablePoints(userId: string, availablePoints: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { availablePoints },
    });
  }

  private handlePrismaError(error: any, id?: string): never {
    if (error?.code === 'P2025') {
      throw new PointNotFoundException(`Point with id ${id ?? ''} not found`.trim());
    }
    if (error?.code === 'P2003') {
      throw new PointValidationException('Invalid point data');
    }
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new PointValidationException(`Point with this ${field} already exists`);
    }
    throw error;
  }
}

