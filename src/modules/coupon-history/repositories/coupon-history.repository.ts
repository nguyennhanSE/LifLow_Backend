import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, CouponHistoryStatus } from '@prisma/client';
import { QueryCouponHistoryDto } from '../dto/query-coupon-history.dto';
import { CouponHistoryNotFoundException } from '../exceptions/coupon-history.exceptions';
import {
  toCouponHistoryEntityWithRelations,
  toCouponHistoryEntityWithRelationsArray,
  toCouponReturnEntityArray,
} from '../mapper/coupon-history.mapper';
import { CouponHistoryEntity, CouponReturnEntity } from '../entities/coupon-history.entity';

@Injectable()
export class CouponHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create coupon history records in bulk (transaction)
   */
  async createBulk(
    couponId: string,
    userIds: string[],
    startDate?: Date | null,
    endDate?: Date | null,
  ): Promise<CouponHistoryEntity[]> {
    const now = new Date();
    const data: Prisma.CouponHistoryCreateManyInput[] = userIds.map((userId) => ({
      couponId,
      userId,
      status: CouponHistoryStatus.ISSUED,
      issuedAt: now,
      startDate,
      endDate,
    }));

    const histories = await this.prisma.$transaction(async (tx) => {
      await tx.couponHistory.createMany({
        data,
      });

      // Return the created records
      return tx.couponHistory.findMany({
        where: {
          couponId,
          userId: { in: userIds },
          issuedAt: now,
        },
        include: {
          coupon: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    });

    return toCouponHistoryEntityWithRelationsArray(histories);
  }

  /**
   * Create a single coupon history record (or multiple when quantity > 1 via repeated calls).
   */
  async createWithQuantity(
    couponId: string,
    userId: string,
    quantity: number,
    startDate?: Date | null,
    endDate?: Date | null,
  ): Promise<CouponHistoryEntity[]> {
    const now = new Date();
    startDate = startDate ?? now;
    endDate = endDate ?? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30days later
    const history = await this.prisma.$transaction(async (tx) => {
      const created = await tx.couponHistory.create({
        data: {
          couponId,
          userId,
          status: CouponHistoryStatus.ISSUED,
          issuedAt: now,
          quantity,
          startDate,
          endDate,
        },
        include: {
          coupon: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
      return created;
    });
    return toCouponHistoryEntityWithRelationsArray([history]);
  }
  /**
   * Find coupon history by ID with relations
   */
  async findOne(id: string): Promise<CouponHistoryEntity> {
    const history = await this.prisma.couponHistory.findUnique({
      where: { id },
      include: {
        coupon: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: true,
      },
    });

    if (!history) {
      throw new CouponHistoryNotFoundException(id);
    }

    return toCouponHistoryEntityWithRelations(history);
  }

  /**
   * Update coupon history to USED status
   */
  async markAsUsed(
    id: string,
    orderId: string,
    discountAppliedAmount: number,
    purchaseAmountAtUse: number,
  ): Promise<CouponHistoryEntity> {
    const history = await this.prisma.couponHistory.update({
      where: { id },
      data: {
        status: CouponHistoryStatus.USED,
        usedAt: new Date(),
        orderId,
        discountAppliedAmount,
        purchaseAmountAtUse,
      },
      include: {
        coupon: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        order: true,
      },
    });

    return toCouponHistoryEntityWithRelations(history);
  }

  /**
   * Update coupon history to CANCELLED status
   */
  async markAsCancelled(id: string): Promise<CouponHistoryEntity> {
    const history = await this.prisma.couponHistory.update({
      where: { id },
      data: {
        status: CouponHistoryStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        coupon: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return toCouponHistoryEntityWithRelations(history);
  }

  /**
   * Find all coupon histories with filters and pagination
   */
  async findAll(queryDto: QueryCouponHistoryDto) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'issuedAt',
      sortOrder = 'desc',
      couponId,
      userId,
      status,
      issuedAtFrom,
      issuedAtTo,
    } = queryDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.CouponHistoryWhereInput = {};

    if (couponId) {
      where.couponId = couponId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status as CouponHistoryStatus;
    }

    if (issuedAtFrom || issuedAtTo) {
      where.issuedAt = {};
      if (issuedAtFrom) {
        where.issuedAt.gte = new Date(issuedAtFrom);
      }
      if (issuedAtTo) {
        where.issuedAt.lte = new Date(issuedAtTo);
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.CouponHistoryOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries in parallel
    const [histories, total] = await Promise.all([
      this.prisma.couponHistory.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          coupon: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalPaymentAmount: true,
            },
          },
        },
      }),
      this.prisma.couponHistory.count({ where }),
    ]);

    return {
      data: toCouponHistoryEntityWithRelationsArray(histories),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find coupon histories by user ID
   */
  async findByUser(userId: string, queryDto: QueryCouponHistoryDto) {
    return this.findAll({
      ...queryDto,
      userId,
    });
  }

  /**
   * Get user IDs by membership levels for coupon issuance.
   * @param membershipLevels - If null or empty, returns all user IDs; otherwise users whose membershipLevel is in this array.
   */
  async findUserIdsByMembershipLevels(membershipLevels: string[] | null): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where:
        membershipLevels && membershipLevels.length > 0
          ? { membershipLevel: { in: membershipLevels, not: null } }
          : {},
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  /**
   * Get user's membership level by user ID.
   */
  async getMembershipLevelByUserId(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { membershipLevel: true },
    });
    return user?.membershipLevel ?? null;
  }

  /**
   * Find active (ISSUED) coupon histories for specific users and coupon
   * Used to check for duplicate issuance
   */
  async findActiveHistoriesByUserIds(
    couponId: string,
    userIds: string[],
  ): Promise<CouponHistoryEntity[]> {
    const histories = await this.prisma.couponHistory.findMany({
      where: {
        couponId,
        userId: { in: userIds },
        status: CouponHistoryStatus.ISSUED,
      },
      include: {
        coupon: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return toCouponHistoryEntityWithRelationsArray(histories);
  }

  /**
   * Find user's available coupons (issued and not expired)
   */
  async findUserAvailableCoupons(userId: string): Promise<CouponReturnEntity[]> {
    const now = new Date();

    const histories = await this.prisma.couponHistory.findMany({
      where: {
        userId,
        status: CouponHistoryStatus.ISSUED,
        // OR: [
        //   { expiredAt: { gt: now } },
        //   { expiredAt: null },
        // ],
        coupon: {
          isActive: true,
          // endDate: { gt: now },
        },
      },
      include: {
        coupon: true
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return toCouponReturnEntityArray(histories);
  }

  /**
   * Find user's used coupons
   */
  async findUserUsedCoupons(userId: string): Promise<CouponReturnEntity[]> {
    const histories = await this.prisma.couponHistory.findMany({
      where: {
        userId,
        status: CouponHistoryStatus.USED,
      },
      include: {
        coupon: true,
      },
      orderBy: {
        usedAt: 'desc',
      },
    });

    return toCouponReturnEntityArray(histories);
  }

  /**
   * Check if user already has any coupon history for this coupon (any status).
   */
  async existsByUserAndCoupon(userId: string, couponId: string): Promise<boolean> {
    const existing = await this.prisma.couponHistory.findFirst({
      where: { userId, couponId },
      select: { id: true },
    });
    return existing != null;
  }

  /**
   * Find active coupon history for a user and specific coupon
   */
  async findActiveHistoryByUserAndCoupon(
    userId: string,
    couponId: string,
  ): Promise<CouponHistoryEntity | null> {
    const history = await this.prisma.couponHistory.findFirst({
      where: {
        userId,
        couponId,
        status: CouponHistoryStatus.ISSUED,
      },
      include: {
        coupon: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return history ? toCouponHistoryEntityWithRelations(history) : null;
  }

  /**
   * Get coupon usage statistics
   */
  async getCouponStatistics(couponId: string) {
    const [totalIssued, totalUsed, totalCancelled, totalExpired] = await Promise.all([
      this.prisma.couponHistory.count({
        where: { couponId, status: CouponHistoryStatus.ISSUED },
      }),
      this.prisma.couponHistory.count({
        where: { couponId, status: CouponHistoryStatus.USED },
      }),
      this.prisma.couponHistory.count({
        where: { couponId, status: CouponHistoryStatus.CANCELLED },
      }),
      this.prisma.couponHistory.count({
        where: { couponId, status: CouponHistoryStatus.EXPIRED },
      }),
    ]);

    const usedHistories = await this.prisma.couponHistory.findMany({
      where: {
        couponId,
        status: CouponHistoryStatus.USED,
      },
      select: {
        discountAppliedAmount: true,
        purchaseAmountAtUse: true,
      },
    });

    const totalDiscountGiven = usedHistories.reduce(
      (sum, h) => sum + (h.discountAppliedAmount || 0),
      0,
    );

    const totalRevenueImpacted = usedHistories.reduce(
      (sum, h) => sum + (h.purchaseAmountAtUse || 0),
      0,
    );

    return {
      totalIssued,
      totalUsed,
      totalCancelled,
      totalExpired,
      usageRate: totalIssued > 0 ? (totalUsed / totalIssued) * 100 : 0,
      totalDiscountGiven,
      totalRevenueImpacted,
      averageDiscountAmount: totalUsed > 0 ? totalDiscountGiven / totalUsed : 0,
    };
  }

  /**
   * Expire all CouponHistory (status ISSUED) for a given coupon (e.g. when coupon is deactivated).
   * Returns the number of records updated.
   */
  async expireAllByCouponId(couponId: string): Promise<number> {
    const result = await this.prisma.couponHistory.updateMany({
      where: {
        couponId,
        status: CouponHistoryStatus.ISSUED,
      },
      data: {
        status: CouponHistoryStatus.EXPIRED,
      },
    });
    return result.count;
  }

  /**
   * Expire old issued coupons that have passed their expiration date
   * Returns the number of expired coupons
   */
  async expireOldCoupons(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.couponHistory.updateMany({
      where: {
        status: CouponHistoryStatus.ISSUED,
        expiredAt: {
          lte: now,
        },
      },
      data: {
        status: CouponHistoryStatus.EXPIRED,
      },
    });

    return result.count;
  }
}

