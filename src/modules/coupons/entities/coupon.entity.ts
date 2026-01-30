import { CouponType, CouponTargetGrade, CouponHistoryStatus } from '../enums/coupon.enum';

export class CouponEntity {
  id!: string;
  name!: string;
  code!: string;
  type!: CouponType;
  discountRate?: number | null;
  discountAmount?: number | null;
  minPurchaseAmount!: number;
  maxDiscountAmount?: number | null;
  imageUrl?: string | null;
  isPermanent!: boolean;
  isActive!: boolean;
  isAutoIssue!: boolean;
  autoIssueDayOfMonth?: Date | null;
  targetGrades!: CouponTargetGrade[];
  createdAt!: Date;
  updatedAt!: Date;
}

export class CouponWithHistories extends CouponEntity {
  histories?: {
    id: string;
    couponId: string | null;
    userId: string;
    status: CouponHistoryStatus;
    issuedAt?: Date | null;
    usedAt?: Date | null;
    expiredAt?: Date | null;
    cancelledAt?: Date | null;
  }[];
}
