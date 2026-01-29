import { Coupon, CouponHistory } from '@prisma/client';
import { CouponEntity, CouponWithHistories } from '../entities/coupon.entity';
import { CouponType, CouponTargetGrade, CouponHistoryStatus } from '../enums/coupon.enum';

type CouponWithHistoriesType = Coupon & {
  histories: CouponHistory[];
};
/**
 * Maps Prisma Coupon model to CouponEntity
 */
export function toCouponEntity(coupon: Coupon): CouponEntity {
  return {
    id: coupon.id,
    name: coupon.name,
    code: coupon.code,
    type: coupon.type as CouponType,
    discountRate: coupon.discountRate,
    discountAmount: coupon.discountAmount,
    minPurchaseAmount: coupon.minPurchaseAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    imageUrl: coupon.imageUrl,
    startDate: coupon.startDate,
    endDate: coupon.endDate,
    isActive: coupon.isActive,
    canAutoIssue: coupon.canAutoIssue,
    isAutoIssue: coupon.isAutoIssue,
    autoIssueDayOfMonth: coupon.autoIssueDayOfMonth,
    targetGrades: coupon.targetGrades as CouponTargetGrade[],
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };
}

/**
 * Maps Prisma Coupon with count relations to CouponEntity
 */
export function toCouponWithHistories(coupon: CouponWithHistoriesType): CouponWithHistories {
  return {
    ...toCouponEntity(coupon),
    histories: coupon.histories.map((history) => ({
      id: history.id,
      couponId: history.couponId,
      userId: history.userId,
      status: history.status as CouponHistoryStatus,
      issuedAt: history.issuedAt,
      usedAt: history.usedAt,
      expiredAt: history.expiredAt,
      cancelledAt: history.cancelledAt,
    })),
  };
}


/**
 * Maps array of Prisma Coupons to CouponEntity array
 */
export function toCouponEntityArray(coupons: Coupon[]): CouponEntity[] {
  return coupons.map(toCouponEntity);
}

/**
 * Maps array of Prisma Coupons with count to CouponEntity array
 */
export function toCouponWithHistoriesArray(coupons: CouponWithHistoriesType[]): CouponWithHistories[] {
  return coupons.map(toCouponWithHistories);
}

