import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCouponDto } from '../dto/create-coupon.dto';
import { UpdateCouponDto } from '../dto/update-coupon.dto';
import { QueryCouponDto } from '../dto/query-coupon.dto';
import { toCouponEntity, toCouponEntityArray } from '../mapper/coupon.mapper';
import { CouponEntity } from '../entities/coupon.entity';

@Injectable()
export class CouponRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new coupon
   */
  async create(createCouponDto: CreateCouponDto): Promise<CouponEntity> {
    const data: Prisma.CouponCreateInput = {
      name: createCouponDto.name,
      code: createCouponDto.code,
      type: createCouponDto.type,
      discountRate: createCouponDto.discountRate,
      discountAmount: createCouponDto.discountAmount,
      minPurchaseAmount: createCouponDto.minPurchaseAmount || 0,
      maxDiscountAmount: createCouponDto.maxDiscountAmount,
      imageUrl: createCouponDto.imageUrl,
      isPermanent: false,
      isActive: createCouponDto.isActive !== undefined ? createCouponDto.isActive : true,
      isAutoIssue: createCouponDto.isAutoIssue || false,
      autoIssueDayOfMonth: createCouponDto.autoIssueDayOfMonth,
      targetGrades: createCouponDto.targetGrades || [],
    };

    const coupon = await this.prisma.coupon.create({
      data,
      include: {
        _count: {
          select: { histories: true },
        },
      },
    });

    return toCouponEntity(coupon);
  }

  /**
   * Find all coupons with pagination and filters
   */
  async findAll(queryDto: QueryCouponDto) {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', isActive, type, search } = queryDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.CouponWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: Prisma.CouponOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries in parallel
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: { histories: true },
          },
        },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: toCouponEntityArray(coupons),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single coupon by ID
   */
  async findOne(id: string): Promise<CouponEntity> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { histories: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with ID ${id} not found`);
    }

    return toCouponEntity(coupon);
  }

  /**
   * Find coupon by code
   */
  async findByCode(code: string): Promise<CouponEntity> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: {
        _count: {
          select: { histories: true },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon with code ${code} not found`);
    }

    return toCouponEntity(coupon);
  }

  /**
   * Check if coupon code exists
   */
  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.CouponWhereInput = { code };
    
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.coupon.count({ where });
    return count > 0;
  }

  /**
   * Update a coupon
   */
  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<CouponEntity> {
    // Check if coupon exists
    await this.findOne(id);

    const data: Prisma.CouponUpdateInput = {};

    if (updateCouponDto.name !== undefined) {
      data.name = updateCouponDto.name;
    }
    if (updateCouponDto.code !== undefined) {
      data.code = updateCouponDto.code;
    }
    if (updateCouponDto.type !== undefined) {
      data.type = updateCouponDto.type;
    }
    if (updateCouponDto.discountRate !== undefined) {
      data.discountRate = updateCouponDto.discountRate;
    }
    if (updateCouponDto.discountAmount !== undefined) {
      data.discountAmount = updateCouponDto.discountAmount;
    }
    if (updateCouponDto.minPurchaseAmount !== undefined) {
      data.minPurchaseAmount = updateCouponDto.minPurchaseAmount;
    }
    if (updateCouponDto.maxDiscountAmount !== undefined) {
      data.maxDiscountAmount = updateCouponDto.maxDiscountAmount;
    }
    if (updateCouponDto.imageUrl !== undefined) {
      data.imageUrl = updateCouponDto.imageUrl;
    }
    if (updateCouponDto.isActive !== undefined) {
      data.isActive = updateCouponDto.isActive;
    }
    if (updateCouponDto.isAutoIssue !== undefined) {
      data.isAutoIssue = updateCouponDto.isAutoIssue;
    }
    if (updateCouponDto.autoIssueDayOfMonth !== undefined) {
      data.autoIssueDayOfMonth = updateCouponDto.autoIssueDayOfMonth;
    }
    if (updateCouponDto.targetGrades !== undefined) {
      data.targetGrades = updateCouponDto.targetGrades || [];
    }

    const coupon = await this.prisma.coupon.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { histories: true },
        },
      },
    });

    return toCouponEntity(coupon);
  }

  /**
   * Remove (soft delete) a coupon
   */
  async remove(id: string): Promise<CouponEntity> {
    // Check if coupon exists
    await this.findOne(id);

    const coupon = await this.prisma.coupon.delete({
      where: { id },
    });

    return toCouponEntity(coupon);
  }

  /**
   * Get coupons for auto-issue by target grades
   */
  async findAutoIssueCoupons() {
    return this.prisma.coupon.findMany({
      where: {
        isAutoIssue: true,
        isActive: true,
      },
    });
  }
  /**
   * Get meta dashboard data
   */
  async count (where?: Prisma.CouponWhereInput) {
    return this.prisma.coupon.count({ where });
  }
}

