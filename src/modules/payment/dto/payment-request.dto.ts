import { IsString, IsNumber, IsOptional, IsUUID, IsEnum, IsArray, IsInt, Min, Max, ValidateNested, IsNotEmpty, MaxLength, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * Cart with order data for payment confirmation
 * Combines cart ID with order creation data
 */
export class CartOrderItemDto {
  @ApiProperty({ description: '장바구니 ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsNotEmpty({ message: 'Cart ID is required' })
  @IsUUID('4', { message: 'Cart ID must be a valid UUID' })
  cartItemId!: string;

  @ApiProperty({ description: '상품 ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsString({ message: 'Product ID must be a string' })
  productId!: string;

  @ApiProperty({ description: '주문 금액 (KRW)', example: 150000 })
  @IsNotEmpty({ message: 'Total order amount is required' })
  @Type(() => Number)
  @IsInt({ message: 'Total order amount must be an integer' })
  @Min(0, { message: 'Total order amount must be at least 0' })
  totalOrderAmount!: number;

  @ApiProperty({ description: '결제 금액 (KRW)', example: 145000 })
  @IsNotEmpty({ message: 'Total payment amount is required' })
  @Type(() => Number)
  @IsInt({ message: 'Total payment amount must be an integer' })
  @Min(0, { message: 'Total payment amount must be at least 0' })
  totalPaymentAmount!: number;

  @ApiPropertyOptional({ description: '상품명', example: 'Organic Apple 1kg', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Product name must be a string' })
  @MaxLength(500, { message: 'Product name must not exceed 500 characters' })
  productName?: string;

  @ApiPropertyOptional({ description: '옵션 포함 상품명', example: 'Organic Apple 1kg (Red, Gift Box)', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Product name with options must be a string' })
  @MaxLength(500, { message: 'Product name with options must not exceed 500 characters' })
  productNameWithOptions?: string;

  @ApiProperty({ description: '주문 수량', example: 5, minimum: 1, maximum: 10000 })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10000, { message: 'Quantity must not exceed 10000' })
  quantity!: number;

  @ApiProperty({ description: '판매 단가 (KRW)', example: 29000, minimum: 0 })
  @IsNotEmpty({ message: 'Sale price is required' })
  @Type(() => Number)
  @IsInt({ message: 'Sale price must be an integer' })
  @Min(0, { message: 'Sale price must be at least 0' })
  salePrice!: number;

  @ApiPropertyOptional({ description: '수령인 이름', example: '김철수', minLength: 2, maxLength: 100 })
  @IsOptional()
  @IsString({ message: 'Recipient name must be a string' })
  @MinLength(2, { message: 'Recipient name must be at least 2 characters' })
  @MaxLength(100, { message: 'Recipient name must not exceed 100 characters' })
  recipient?: string;

  @ApiPropertyOptional({ description: '수령인 주소', example: '서울특별시 강남구 테헤란로 123, 456호', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Recipient address must be a string' })
  @MaxLength(500, { message: 'Recipient address must not exceed 500 characters' })
  recipientAddressFull?: string;

  @ApiProperty({ description: '수령인 우편번호 (5자리)', example: 12345, minimum: 10000, maximum: 99999 })
  @IsNotEmpty({ message: 'Recipient postal code is required' })
  @Type(() => Number)
  @IsInt({ message: 'Recipient postal code must be an integer' })
  @Min(10000, { message: 'Recipient postal code must be a 5-digit number' })
  @Max(99999, { message: 'Recipient postal code must be a 5-digit number' })
  recipientPostalCode!: number;

  @ApiPropertyOptional({ description: '수령인 휴대폰 번호 (format: 010-XXXX-XXXX)', example: '010-1234-5678', pattern: '^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$' })
  @IsOptional()
  @IsString({ message: 'Recipient mobile phone must be a string' })
  @Matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: 'Recipient mobile phone must be in format 010-XXXX-XXXX or 01XXXXXXXXX',
  })
  recipientMobilePhone?: string;

  @ApiPropertyOptional({ description: '배송 메시지', example: '문 앞에 놔주세요', maxLength: 500 })
  @IsOptional()
  @IsString({ message: 'Delivery message must be a string' })
  @MaxLength(500, { message: 'Delivery message must not exceed 500 characters' })
  deliveryMessage?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ description: '사용자 ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: '주문명' })
  @IsString()
  orderName: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '정기결제 ID' })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({ description: '결제 타입' })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiPropertyOptional({ description: '메타데이터' })
  @IsOptional()
  metadata?: any;
}

export class CouponIdQuantityDto {
  @ApiProperty({ description: '쿠폰 ID' })
  @IsString()
  couponId: string;

  @ApiProperty({ description: '쿠폰 사용 수량' })
  @IsNumber()
  quantity: number;
}

/**
 * Cart item with associated coupons
 */
// export class CartItemCouponDto {
//   @ApiProperty({ description: '장바구니 아이템 ID', example: '123e4567-e89b-12d3-a456-426614174000' })
//   @IsNotEmpty({ message: 'Cart item ID is required' })
//   @IsString({ message: 'Cart item ID must be a string' })
//   cartItemId!: string;

//   @ApiPropertyOptional({ description: '해당 장바구니 아이템에 사용할 쿠폰 ID 배열', type: [String], example: [] })
//   @IsOptional()
//   @IsArray()
//   @IsString({ each: true })
//   couponIds?: string[] | null;

//   @ApiPropertyOptional({ description: '쿠폰 사용 수량', example: 1, minimum: 1, maximum: 10000 })
//   @IsOptional()
//   @Type(() => Number)
//   @IsInt({ message: 'Coupon quantity must be an integer' })
//   @Min(1, { message: 'Coupon quantity must be at least 1' })
//   @Max(10000, { message: 'Coupon quantity must not exceed 10000' })
//   quantity?: number;
// }

export class ConfirmPaymentRequestDto {
  @ApiProperty({ description: 'Payment token from initiatePayment (required, expires in 1 hour)' })
  @IsString()
  @IsNotEmpty({ message: 'Payment token is required' })
  paymentToken: string;

  @ApiProperty({ description: '결제 키 (Toss에서 전달)' })
  @IsString()
  paymentKey: string;

  @ApiProperty({ description: '주문 그룹 번호' })
  @IsString()
  orderGroupNumber: string;

  @ApiProperty({ description: '결제 금액' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: '사용자 ID (optional, will be set from authenticated request)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: '배송비' })
  @IsNumber()
  deliveryFee: number;

  @ApiPropertyOptional({ description: '수령인 주소 ID (선택 사항)' })
  @IsOptional()
  @IsString()
  userShippingAddressId?: string;

  @ApiPropertyOptional({ description: '장바구니 아이템과 쿠폰 매핑'})
  @IsOptional()
  @IsArray()
  cartItems: string[];

  @ApiPropertyOptional({ description: '쿠폰 정보 배열', type: [CouponIdQuantityDto], example: [{ couponId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponIdQuantityDto)
  coupons?: CouponIdQuantityDto[];
}

export class CancelPaymentRequestDto {
  @ApiProperty({ description: '결제 ID' })
  @IsUUID()
  paymentId: string;

  @ApiProperty({ description: '취소 사유' })
  @IsString()
  cancelReason: string;

  @ApiPropertyOptional({ description: '취소 금액 (부분 취소)' })
  @IsOptional()
  @IsNumber()
  cancelAmount?: number;
}

export class PaymentWebhookDto {
  @ApiProperty()
  @IsString()
  eventType: string;

  @ApiProperty()
  @IsString()
  createdAt: string;

  @ApiProperty()
  data: any;
}

export class GetPaymentDto {
  @ApiPropertyOptional({ description: '사용자 ID로 필터' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '상태로 필터' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: '페이지 번호' })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기' })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class PreparePaymentRequestDto {
  @ApiProperty({ description: '주문 항목 배열 (장바구니 ID + 주문 데이터)', type: [CartOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartOrderItemDto)
  orderItems!: CartOrderItemDto[];
}

export class InitiatePaymentRequestDto {
  @ApiProperty({ description: '장바구니 아이템 ID 배열', example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001'] })
  @IsArray()
  @IsString({ each: true })
  cartItemIds!: string[];

  @ApiProperty({ description: '쿠폰 정보 배열', type: [CouponIdQuantityDto], example: [{ couponId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 }] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponIdQuantityDto)
  coupons?: CouponIdQuantityDto[];


  @ApiPropertyOptional({ description: '사용할 포인트' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Points must be at least 0' })
  points?: number;

  @ApiPropertyOptional({ description: '배송비 (KRW)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Delivery fee must be at least 0' })
  deliveryFee?: number;

  @ApiPropertyOptional({ description: '수령인 주소 ID (선택 사항)' })
  @IsOptional()
  @IsString()
  userShippingAddressId: string;
}

/** DTO for direct pay (single product, no cart) */
export class InitiateDirectPayRequestDto {
  @ApiProperty({ description: '상품 ID (직결제 1개 상품)', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({ description: '주문 수량', example: 2, minimum: 1 })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Type(() => Number)
  quantity!: number;

  @ApiProperty({ description: '수령인 주소 ID (필수)' })
  @IsString()
  @IsNotEmpty({ message: 'User shipping address ID is required' })
  userShippingAddressId!: string;

  @ApiPropertyOptional({ description: '쿠폰 정보 배열', type: [CouponIdQuantityDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponIdQuantityDto)
  coupons?: CouponIdQuantityDto[];

  @ApiPropertyOptional({ description: '사용할 포인트' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Points must be at least 0' })
  points?: number;

  @ApiPropertyOptional({ description: '배송비 (KRW)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Delivery fee must be at least 0' })
  deliveryFee?: number;
}