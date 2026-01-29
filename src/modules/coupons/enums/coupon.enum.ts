export enum CouponType {
    PERCENT = 'PERCENT', // 정률 할인 (Discount rate %)
    AMOUNT = 'AMOUNT',  // 정액 할인 (Discount amount)
    FREE_SHIPPING = 'FREE_SHIPPING', // 무료 배송 (Free shipping)
  }
  
export enum CouponTargetGrade {
    LV1 = 'LV1. 씨앗',
    LV2 = 'LV2. 새싹',
    LV3 = 'LV3. 열매',
    LV4 = 'LV4. 나무',
    LV5 = 'LV5. 정원',
}
  
export enum CouponHistoryStatus {
    ISSUED = 'ISSUED',    // 발급됨
    USED = 'USED',      // 사용됨
    EXPIRED = 'EXPIRED',   // 만료됨
    CANCELLED = 'CANCELLED', // 취소됨
  }