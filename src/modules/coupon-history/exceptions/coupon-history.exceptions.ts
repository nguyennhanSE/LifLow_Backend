import { HttpException, HttpStatus } from '@nestjs/common';

export class CouponNotFoundException extends HttpException {
  constructor(couponId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Coupon with ID ${couponId} not found`,
        error: 'Coupon Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class CouponExpiredException extends HttpException {
  constructor(couponCode?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: couponCode 
          ? `Coupon ${couponCode} has expired` 
          : 'This coupon has expired',
        error: 'Coupon Expired',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CouponAlreadyUsedException extends HttpException {
  constructor(couponHistoryId: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Coupon history ${couponHistoryId} has already been used`,
        error: 'Coupon Already Used',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InsufficientPurchaseAmountException extends HttpException {
  constructor(requiredAmount: number, providedAmount: number) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Minimum purchase amount of ${requiredAmount} KRW required. Provided: ${providedAmount} KRW`,
        error: 'Insufficient Purchase Amount',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CouponInactiveException extends HttpException {
  constructor(couponCode?: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: couponCode 
          ? `Coupon ${couponCode} is not active` 
          : 'This coupon is not active',
        error: 'Coupon Inactive',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CouponNotIssuedException extends HttpException {
  constructor(couponHistoryId: string) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Coupon history ${couponHistoryId} is not in ISSUED status`,
        error: 'Coupon Not Issued',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class CouponHistoryNotFoundException extends HttpException {
  constructor(couponHistoryId: string) {
    super(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: `Coupon history with ID ${couponHistoryId} not found`,
        error: 'Coupon History Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

