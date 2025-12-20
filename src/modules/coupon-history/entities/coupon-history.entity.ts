import { CouponHistoryStatus, CouponType } from '../../coupons/enums/coupon.enum';

export class CouponHistoryEntity {
  id!: string;
  couponId!: string;
  userId!: string;
  orderId?: string | null;
  status!: CouponHistoryStatus;
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
  name!: string;
  email!: string;
}

export class OrderInfo {
  id!: string;
  orderNumber!: string;
  totalPaymentAmount!: number;
}

