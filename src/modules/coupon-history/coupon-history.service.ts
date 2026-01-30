import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
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
import { EMembershipLevel } from '../memberships/enums/membership.enum';

@Injectable()
export class CouponHistoryService {
  constructor(
    private readonly couponHistoryRepository: CouponHistoryRepository,
    @Inject(forwardRef(() => CouponsService))
    private readonly couponsService: CouponsService,
  ) {}

  /**
   * Issue coupon to users by target grades (membership levels).
   * - targetGrades null or empty → issue to all users (no date validation).
   * - targetGrades có giá trị → issue to users whose membershipLevel in targetGrades.
   */
  async issueCouponToUsersByTargetGrades(
    couponId: string,
    targetGrades?: string[] | null, 
    startDate?: Date | null,
    endDate?: Date | null,
  ): Promise<{
    message: string;
    count: number;
    coupon: { id: string; name: string; code: string; type: string } | null;
    histories: any[];
  }> {
    const isIssueToAll = !targetGrades || targetGrades.length === 0;
    const userIds = await this.couponHistoryRepository.findUserIdsByMembershipLevels(
      isIssueToAll ? null : targetGrades,
    );

    if (userIds.length === 0) {
      const coupon = await this.couponsService.findOne(couponId).catch(() => null);
      return {
        message: 'No users matching target grades; no coupon histories created',
        count: 0,
        coupon: coupon
          ? { id: coupon.id, name: coupon.name, code: coupon.code, type: coupon.type }
          : null,
        histories: [],
      };
    }

    if (isIssueToAll) {
      const coupon = await this.couponsService.findOne(couponId).catch(() => null);
      if (!coupon) {
        return {
          message: 'Coupon not found',
          count: 0,
          coupon: null,
          histories: [],
        };
      }
      if (coupon && coupon.isActive) {
        const histories = await this.couponHistoryRepository.createBulk(couponId, userIds, startDate, endDate);
        return {
          message: `Successfully issued ${histories.length} coupon(s) to all users`,
          count: histories.length,
          coupon: { id: coupon.id, name: coupon.name, code: coupon.code, type: coupon.type },
          histories,
        };
      }
      return {
        message: 'Coupon is not active',
        count: 0,
        coupon: null,
        histories: [],
      };
    }

    const coupon = await this.validateCouponForIssuance(couponId);
    // await this.checkDuplicateIssuance(couponId, userIds);
    const histories = await this.couponHistoryRepository.createBulk(couponId, userIds, startDate, endDate);
    return {
      message: `Successfully issued ${histories.length} coupon(s)`,
      count: histories.length,
      coupon: { id: coupon.id, name: coupon.name, code: coupon.code, type: coupon.type },
      histories,
    };
  }

  /**
   * Issue coupon to multiple users.
   * Validates coupon exists and is active.
   */
  async issueCoupon(dto: IssueCouponDto) {
    const { couponId, userIds } = dto;

    // Validate coupon exists and is eligible for issuance
    const coupon = await this.validateCouponForIssuance(couponId);

    // Check for duplicate issuance
    await this.checkDuplicateIssuance(couponId, userIds);

    // Create coupon history records in bulk
    const histories = await this.couponHistoryRepository.createBulk(couponId, userIds);

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
      throw new CouponNotFoundException(history.couponId ?? '');
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
      (sum, item) => sum + (item.discountAmount ?? 0),
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
   * Expire all CouponHistory (status ISSUED) for a coupon (e.g. when coupon is deactivated).
   */
  async expireAllByCouponId(couponId: string): Promise<number> {
    return await this.couponHistoryRepository.expireAllByCouponId(couponId);
  }

  /**
   * Expire old issued coupons (for batch jobs)
   */
  async expireOldCoupons(): Promise<number> {
    return await this.couponHistoryRepository.expireOldCoupons();
  }

  // ==================== Membership-based coupon issuance ====================

  /** Coupon code for birthday coupon */
  private static readonly BIRTHDAY_COUPON_CODE = 'BIRTHDAY';
  /** Coupon code for free shipping (issued 1/2/3/5 per level) */
  private static readonly FREE_SHIPPING_COUPON_CODE = 'FREE_SHIPPING';
  /** Coupon codes for shopping support by level (10% max 10k, 10% max 20k, 15% max 30k, 20% max 50k) */
  private static readonly SHOPPING_SUPPORT_CODES: Record<string, string> = {
    [EMembershipLevel.LV2]: 'SHOPPING_SUPPORT_LV2', // 10% max 10,000 KRW, 1 coupon
    [EMembershipLevel.LV3]: 'SHOPPING_SUPPORT_LV3', // 10% max 20,000 KRW, 2 coupons
    [EMembershipLevel.LV4]: 'SHOPPING_SUPPORT_LV4', // 15% max 30,000 KRW, 3 coupons
    [EMembershipLevel.LV5]: 'SHOPPING_SUPPORT_LV5', // 20% max 50,000 KRW, 3 coupons
  };
  /** Number of free shipping coupons per membership level (Lv.2=1, Lv.3=2, Lv.4=3, Lv.5=5) */
  private static readonly FREE_SHIPPING_COUNT_BY_LEVEL: Record<string, number> = {
    [EMembershipLevel.LV2]: 1,
    [EMembershipLevel.LV3]: 2,
    [EMembershipLevel.LV4]: 3,
    [EMembershipLevel.LV5]: 5,
  };
  /** Number of shopping support coupons per membership level */
  private static readonly SHOPPING_SUPPORT_COUNT_BY_LEVEL: Record<string, number> = {
    [EMembershipLevel.LV2]: 1,
    [EMembershipLevel.LV3]: 2,
    [EMembershipLevel.LV4]: 3,
    [EMembershipLevel.LV5]: 3,
  };

  /**
   * Issue birthday coupon to user. Finds coupon with code BIRTHDAY and creates one CouponHistory for the user.
   */
  async issueBirthdayCoupon(userId: string): Promise<{
    message: string;
    count: number;
    coupon: { id: string; name: string; code: string; type: string } | null;
    histories: any[];
  }> {
    let coupon: CouponEntity;
    try {
      coupon = await this.couponsService.findByCode(CouponHistoryService.BIRTHDAY_COUPON_CODE);
    } catch {
      return {
        message: `Coupon with code ${CouponHistoryService.BIRTHDAY_COUPON_CODE} not found`,
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    if (!coupon.isActive) {
      return {
        message: `Coupon ${coupon.code} is not active`,
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    const histories = await this.couponHistoryRepository.createWithQuantity(
      coupon.id,
      userId,
      1,
    );
    return {
      message: `Successfully issued 1 birthday coupon to user`,
      count: histories.length,
      coupon: { id: coupon.id, name: coupon.name, code: coupon.code, type: coupon.type },
      histories,
    };
  }

  /**
   * Issue free shipping coupons to user based on membership level.
   * 새싹 (Lv.2): 1, 열매 (Lv.3): 2, 나무 (Lv.4): 3, 정원 (Lv.5): 5.
   */
  async issueFreeShipping(userId: string): Promise<{
    message: string;
    count: number;
    coupon: { id: string; name: string; code: string; type: string } | null;
    histories: any[];
  }> {
    const membershipLevel = await this.couponHistoryRepository.getMembershipLevelByUserId(userId);
    const count = membershipLevel
      ? CouponHistoryService.FREE_SHIPPING_COUNT_BY_LEVEL[membershipLevel] ?? 0
      : 0;
    if (count <= 0) {
      return {
        message: 'User has no eligible membership level for free shipping coupons (Lv.2~5 only)',
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    let coupon: CouponEntity;
    try {
      coupon = await this.couponsService.findByCode(CouponHistoryService.FREE_SHIPPING_COUPON_CODE);
    } catch {
      return {
        message: `Coupon with code ${CouponHistoryService.FREE_SHIPPING_COUPON_CODE} not found`,
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    if (!coupon.isActive) {
      return {
        message: `Coupon ${coupon.code} is not active`,
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    const histories = await this.couponHistoryRepository.createWithQuantity(
      coupon.id,
      userId,
      count,
    );
    return {
      message: `Successfully issued ${histories.length} free shipping coupon(s)`,
      count: histories.length,
      coupon: { id: coupon.id, name: coupon.name, code: coupon.code, type: coupon.type },
      histories,
    };
  }

  /**
   * Issue shopping support (percent discount) coupons to user based on membership level.
   * 새싹 (Lv.2): 1x 10% max 10,000 KRW | 열매 (Lv.3): 2x 10% max 20,000 KRW
   * 나무 (Lv.4): 3x 15% max 30,000 KRW | 정원 (Lv.5): 3x 20% max 50,000 KRW
   */
  async issueShoppingSupport(userId: string): Promise<{
    message: string;
    count: number;
    coupon: { id: string; name: string; code: string; type: string } | null;
    histories: any[];
  }> {
    const membershipLevel = await this.couponHistoryRepository.getMembershipLevelByUserId(userId);
    if (!membershipLevel || !CouponHistoryService.SHOPPING_SUPPORT_CODES[membershipLevel]) {
      return {
        message: 'User has no eligible membership level for shopping support coupons (Lv.2~5 only)',
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    const code = CouponHistoryService.SHOPPING_SUPPORT_CODES[membershipLevel];
    const count = CouponHistoryService.SHOPPING_SUPPORT_COUNT_BY_LEVEL[membershipLevel] ?? 0;
    if (count <= 0) {
      return {
        message: 'No shopping support coupons for this level',
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    let coupon: CouponEntity;
    try {
      coupon = await this.couponsService.findByCode(code);
    } catch {
      return {
        message: `Coupon with code ${code} not found`,
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    if (!coupon.isActive) {
      return {
        message: `Coupon ${coupon.code} is not active`,
        count: 0,
        coupon: null,
        histories: [],
      };
    }
    const histories = await this.couponHistoryRepository.createWithQuantity(
      coupon.id,
      userId,
      count,
    );
    return {
      message: `Successfully issued ${histories.length} shopping support coupon(s)`,
      count: histories.length,
      coupon: { id: coupon.id, name: coupon.name, code: coupon.code, type: coupon.type },
      histories,
    };
  }

  /**
   * Issue coupons to user after payment: birthday, free shipping, and shopping support.
   * Calls issueBirthdayCoupon, issueFreeShipping, and issueShoppingSupport in parallel.
   */
  async issueAfterUpdate(userId: string): Promise<{
    message: string;
    totalCount: number;
    freeShipping: { message: string; count: number; coupon: { id: string; name: string; code: string; type: string } | null; histories: any[] };
    shoppingSupport: { message: string; count: number; coupon: { id: string; name: string; code: string; type: string } | null; histories: any[] };
    allHistories: any[];
  }> {
    
    const [freeShipping, shoppingSupport] = await Promise.all([
      this.issueFreeShipping(userId),
      this.issueShoppingSupport(userId),
    ]);

    const totalCount = freeShipping.count + shoppingSupport.count;
    const allHistories = [
      ...freeShipping.histories,
      ...shoppingSupport.histories,
    ];

    return {
      message: `After payment: issued ${totalCount} coupon(s) (free shipping: ${freeShipping.count}, shopping support: ${shoppingSupport.count})`,
      totalCount,
      freeShipping,
      shoppingSupport,
      allHistories,
    };
  }
}


