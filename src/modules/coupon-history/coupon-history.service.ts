import { Injectable, BadRequestException } from '@nestjs/common';
import { CouponHistoryRepository } from './repositories/coupon-history.repository';
import { CouponsService } from '../coupons/coupons.service';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { UseCouponDto } from './dto/use-coupon.dto';
import { CancelCouponDto } from './dto/cancel-coupon.dto';
import { QueryCouponHistoryDto } from './dto/query-coupon-history.dto';
import { CouponType } from '../coupons/enums/coupon.enum';
import {
  CouponNotFoundException,
  CouponExpiredException,
  CouponAlreadyUsedException,
  InsufficientPurchaseAmountException,
  CouponInactiveException,
  CouponNotIssuedException,
} from './exceptions/coupon-history.exceptions';
import { CouponHistoryStatus } from '@prisma/client';
import { CouponEntity } from '../coupons/entities/coupon.entity';
import { CouponInfo } from './entities/coupon-history.entity';

@Injectable()
export class CouponHistoryService {
  constructor(
    private readonly couponHistoryRepository: CouponHistoryRepository,
    private readonly couponsService: CouponsService,
  ) {}

  /**
   * Issue coupon to multiple users
   * Validates coupon exists, is active, and is within valid date range
   */
  async issueCoupon(dto: IssueCouponDto) {
    const { couponId, userIds, expirationDate } = dto;

    // Validate coupon exists and is eligible for issuance
    const coupon = await this.validateCouponForIssuance(couponId);

    // Check for duplicate issuance
    await this.checkDuplicateIssuance(couponId, userIds);

    // Determine expiration date
    const expirationDateTime = expirationDate 
      ? new Date(expirationDate) 
      : coupon.endDate;

    // Validate expiration date is in the future
    if (expirationDateTime <= new Date()) {
      throw new BadRequestException('Expiration date must be in the future');
    }

    // Create coupon history records in bulk
    const histories = await this.couponHistoryRepository.createBulk(
      couponId,
      userIds,
      expirationDateTime,
    );

    return {
      message: `Successfully issued ${histories.length} coupon(s)`,
      count: histories.length,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        code: coupon.code,
        type: coupon.type,
      },
      histories,
    };
  }

  /**
   * Use coupon for an order
   * Validates status, expiration, purchase amount, and calculates discount
   */
  async useCoupon(dto: UseCouponDto) {
    const { couponHistoryId, orderId, purchaseAmount } = dto;

    // Find coupon history with relations
    const history = await this.couponHistoryRepository.findOne(couponHistoryId);

    // Validate coupon relation exists
    if (!history.coupon) {
      throw new CouponNotFoundException(history.couponId);
    }

    // Validate coupon can be used
    this.validateCouponUsage(history, purchaseAmount);

    // Calculate discount
    const discountAmount = this.calculateDiscount(history.coupon, purchaseAmount);

    // Update history to USED
    const updatedHistory = await this.couponHistoryRepository.markAsUsed(
      couponHistoryId,
      orderId,
      discountAmount,
      purchaseAmount,
    );

    return {
      message: 'Coupon successfully applied',
      discountAmount,
      finalAmount: purchaseAmount - discountAmount,
      history: updatedHistory,
    };
  }

  /**
   * Cancel issued coupon
   * Validates status is ISSUED before cancelling
   */
  async cancelCoupon(dto: CancelCouponDto) {
    const { couponHistoryId } = dto;

    // Find coupon history
    const history = await this.couponHistoryRepository.findOne(couponHistoryId);

    // Validate status is ISSUED
    if (history.status !== CouponHistoryStatus.ISSUED as any) {
      throw new CouponNotIssuedException(couponHistoryId);
    }

    // Update to CANCELLED
    const updatedHistory = await this.couponHistoryRepository.markAsCancelled(couponHistoryId);

    return {
      message: 'Coupon successfully cancelled',
      history: updatedHistory,
    };
  }

  /**
   * Get all coupon histories with filters
   */
  async findAll(queryDto: QueryCouponHistoryDto) {
    return this.couponHistoryRepository.findAll(queryDto);
  }

  /**
   * Get coupon histories for a specific user
   */
  async findByUser(userId: string, queryDto: QueryCouponHistoryDto) {
    return this.couponHistoryRepository.findByUser(userId, queryDto);
  }

  // ==================== Private Helper Methods ====================

  /**
   * Validate coupon eligibility for issuance
   */
  private async validateCouponForIssuance(couponId: string): Promise<CouponEntity> {
    let coupon: CouponEntity;
    
    try {
      coupon = await this.couponsService.findOne(couponId);
    } catch (error) {
      throw new CouponNotFoundException(couponId);
    }

    // Validate coupon is active
    if (!coupon.isActive) {
      throw new CouponInactiveException(coupon.code);
    }

    // Validate current date is within coupon validity period
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      throw new CouponExpiredException(coupon.code);
    }

    return coupon;
  }

  /**
   * Check for duplicate coupon issuance to users
   */
  private async checkDuplicateIssuance(couponId: string, userIds: string[]): Promise<void> {
    const duplicates = await this.couponHistoryRepository.findActiveHistoriesByUserIds(
      couponId,
      userIds,
    );

    if (duplicates.length > 0) {
      const duplicateUserIds = duplicates.map((h) => h.userId).join(', ');
      throw new BadRequestException(
        `Coupon already issued to users: ${duplicateUserIds}. Cancel existing coupons before reissuing.`,
      );
    }
  }

  /**
   * Validate coupon can be used (status, expiration, purchase amount)
   */
  private validateCouponUsage(history: any, purchaseAmount: number): void {
    // Validate status is ISSUED
    if (history.status !== ('ISSUED' as CouponHistoryStatus)) {
      if (history.status === ('USED' as CouponHistoryStatus)) {
        throw new CouponAlreadyUsedException(history.id);
      }
      throw new CouponNotIssuedException(history.id);
    }

    // Validate coupon is active
    if (!history.coupon.isActive) {
      throw new CouponInactiveException(history.coupon.code);
    }

    // Validate not expired
    const now = new Date();
    const expirationDate = history.expiredAt || history.coupon.endDate;
    if (now > expirationDate) {
      throw new CouponExpiredException(history.coupon.code);
    }

    // Validate minimum purchase amount
    if (purchaseAmount < history.coupon.minPurchaseAmount) {
      throw new InsufficientPurchaseAmountException(
        history.coupon.minPurchaseAmount,
        purchaseAmount,
      );
    }
  }

  /**
   * Calculate discount based on coupon type
   */
  private calculateDiscount(coupon: CouponInfo | CouponEntity, purchaseAmount: number): number {
    let discountAmount: number;

    if (coupon.type === CouponType.PERCENT) {
      // Calculate percentage discount
      const percentageDiscount = purchaseAmount * (coupon.discountRate! / 100);
      
      // Apply max discount amount if specified
      const maxDiscount = coupon.maxDiscountAmount || Infinity;
      discountAmount = Math.min(percentageDiscount, maxDiscount);
    } else if (coupon.type === CouponType.AMOUNT) {
      // Use fixed discount amount
      discountAmount = coupon.discountAmount!;
      
      // Ensure discount doesn't exceed purchase amount
      discountAmount = Math.min(discountAmount, purchaseAmount);
    } else {
      throw new Error('Invalid coupon type');
    }

    // Round to nearest integer (KRW doesn't have decimals)
    return Math.floor(discountAmount);
  }

  // ==================== Business Query Methods ====================

  /**
   * Get user's available (issued and not expired) coupons
   */
  async getUserAvailableCoupons(userId: string) {
    return await this.couponHistoryRepository.findUserAvailableCoupons(userId);
  }

  /**
   * Get user's used coupons with statistics
   */
  async getUserUsedCoupons(userId: string) {
    const usedCoupons = await this.couponHistoryRepository.findUserUsedCoupons(userId);
    
    const totalSavings = usedCoupons.reduce(
      (sum, history) => sum + (history.discountAppliedAmount || 0),
      0,
    );

    return {
      coupons: usedCoupons,
      statistics: {
        totalUsed: usedCoupons.length,
        totalSavings,
      },
    };
  }

  /**
   * Get coupon usage statistics
   */
  async getCouponStatistics(couponId: string) {
    return await this.couponHistoryRepository.getCouponStatistics(couponId);
  }

  /**
   * Check if user can use a specific coupon
   */
  async canUserUseCoupon(userId: string, couponId: string): Promise<boolean> {
    const activeHistory = await this.couponHistoryRepository.findActiveHistoryByUserAndCoupon(
      userId,
      couponId,
    );

    if (!activeHistory) {
      return false;
    }

    // Check if not expired
    const now = new Date();
    const expirationDate = activeHistory.expiredAt || new Date();
    
    return now <= expirationDate;
  }

  /**
   * Expire old issued coupons (for batch jobs)
   */
  async expireOldCoupons(): Promise<number> {
    return await this.couponHistoryRepository.expireOldCoupons();
  }
}


