import { CouponHistoryStatus, CouponType } from '../../coupons/enums/coupon.enum';

export class CouponHistoryEntity {
  id!: string;
  couponId?: string | null;
  userId!: string;
  orderId?: string | null;
  quantity!: number;
  status!: CouponHistoryStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  issuedAt!: Date;
  usedAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
  discountAppliedAmount?: number | null;
  purchaseAmountAtUse?: number | null;
  createdAt!: Date;
  updatedAt!: Date;
  
  // Relations
  coupon?: CouponInfo;
  user?: UserInfo;
  order?: OrderInfo;
}

export class CouponReturnEntity {
  couponId?: string | null;
  quantity!: number;
  status!: CouponHistoryStatus;
  issuedAt!: Date;
  startDate?: Date | null;
  endDate?: Date | null;
  usedAt?: Date | null;
  expiredAt?: Date | null;
  cancelledAt?: Date | null;
  discountAmount?: number | null;
  maxDiscountAmount?: number | null;
  minPurchaseAmount?: number | null;
  /** Coupon type (PERCENT, AMOUNT, FREE_SHIPPING, etc.) */
  couponType?: string | null;
  /** Discount rate in % (for PERCENT type) */
  discountRate?: number | null;
}

export class CouponInfo {
  id!: string;
  code!: string;
  name!: string;
  type!: CouponType;
  discountRate?: number | null;
  discountAmount?: number | null;
  maxDiscountAmount?: number | null;
  minPurchaseAmount!: number;
}
export class UserInfo {
  id!: string;
  name?: string | null;
  email?: string | null;
}

export class OrderInfo {
  id!: string;
  orderNumber?: string | null;
  totalPaymentAmount?: number | null;
}

