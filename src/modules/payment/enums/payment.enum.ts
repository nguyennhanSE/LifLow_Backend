
export enum PaymentStatus {
    PENDING = 'PENDING',   // 대기중
    SUCCESS = 'SUCCESS',   // 성공
    FAILED = 'FAILED',    // 실패
    CANCELLED = 'CANCELLED', // 취소됨
  }
  
export enum PaymentType {
    NORMAL = 'NORMAL',    // 일반결제
    BILLING = 'BILLING',   // 자동결제 (정기결제)
    BRANDPAY = 'BRANDPAY',  // 브랜드페이
}