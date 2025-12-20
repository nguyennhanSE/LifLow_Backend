export enum CouponType {
    PERCENT = 'PERCENT', // 정률 할인 (Discount rate %)
    AMOUNT = 'AMOUNT',  // 정액 할인 (Discount amount)
  }
  
export enum CouponTargetGrade {
    VIP = 'VIP',  // VIP
    VVIP = 'VVIP', // VVIP
  }
  
export enum CouponHistoryStatus {
    ISSUED = 'ISSUED',    // 발급됨
    USED = 'USED',      // 사용됨
    EXPIRED = 'EXPIRED',   // 만료됨
    CANCELLED = 'CANCELLED', // 취소됨
  }