import { CouponHistory, Coupon, Order, User } from '@prisma/client';
import { CouponHistoryEntity, CouponInfo, UserInfo, OrderInfo } from '../entities/coupon-history.entity';
import { CouponHistoryStatus } from '../../coupons/enums/coupon.enum';
import { toCouponEntity } from '../../coupons/mapper/coupon.mapper';

type UserSelect = { id: string; name?: string | null; email?: string | null };
type OrderSelect = { id: string; orderNumber?: string | null; totalPaymentAmount?: number | null };

type CouponHistoryWithRelations = CouponHistory & {
  coupon?: Coupon | null;
  user?: UserSelect | User | null;
  order?: OrderSelect | Order | null;
};

/**
 * Maps Prisma CouponHistory model to CouponHistoryEntity
 */
export function toCouponHistoryEntity(history: CouponHistory): CouponHistoryEntity {
  return {
    id: history.id,
    couponId: history.couponId,
    userId: history.userId,
    orderId: history.orderId,
    status: history.status as CouponHistoryStatus,
    issuedAt: history.issuedAt,
    usedAt: history.usedAt,
    expiredAt: history.expiredAt,
    cancelledAt: history.cancelledAt,
    discountAppliedAmount: history.discountAppliedAmount,
    purchaseAmountAtUse: history.purchaseAmountAtUse,
    createdAt: history.createdAt,
    updatedAt: history.updatedAt,
  };
}

/**
 * Maps Prisma CouponHistory with relations to CouponHistoryEntity
 */
export function toCouponHistoryEntityWithRelations(
  history: CouponHistoryWithRelations
): CouponHistoryEntity {
  const entity = toCouponHistoryEntity(history);

  // Map coupon relation
  if (history.coupon) {
    const couponFullInfo = toCouponEntity(history.coupon);
    entity.coupon = {
      id: couponFullInfo.id,
      code: couponFullInfo.code,
      name: couponFullInfo.name,
      type: couponFullInfo.type,
      discountRate: couponFullInfo.discountRate,
      discountAmount: couponFullInfo.discountAmount,
      maxDiscountAmount: couponFullInfo.maxDiscountAmount,
      minPurchaseAmount: couponFullInfo.minPurchaseAmount,
    };
  }

  // Map user relation
  if (history.user) {
    entity.user = {
      id: history.user.id,
      name: history.user.name ?? null,
      email: history.user.email ?? null,
    };
  }

  // Map order relation
  if (history.order) {
    entity.order = {
      id: history.order.id,
      orderNumber: history.order.orderNumber ?? null,
      totalPaymentAmount: history.order.totalPaymentAmount ?? null,
    };
  }

  return entity;
}

/**
 * Maps array of Prisma CouponHistory to CouponHistoryEntity array
 */
export function toCouponHistoryEntityArray(histories: CouponHistory[]): CouponHistoryEntity[] {
  return histories.map(toCouponHistoryEntity);
}

/**
 * Maps array of Prisma CouponHistory with relations to CouponHistoryEntity array
 */
export function toCouponHistoryEntityWithRelationsArray(
  histories: CouponHistoryWithRelations[]
): CouponHistoryEntity[] {
  return histories.map(x => toCouponHistoryEntityWithRelations(x));
}

