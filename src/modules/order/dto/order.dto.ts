import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsUUID,
  IsDateString,
  Max,
  MinLength,
  IsEnum,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EOrderSituation } from '../enum/order.enum';
import { PaymentType } from 'src/modules/payment/enums/payment.enum';


// ============================================
// 1. CREATE ORDER DTO
// ============================================
export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'Order group number',
    example: 'GRP-2025-001234',
    maxLength: 255,
  })
  @IsNotEmpty({ message: 'Order group number is required' })
  @IsString({ message: 'Order group number must be a string' })
  @MaxLength(255, { message: 'Order group number must not exceed 255 characters' })
  orderGroupNumber!: string;

  @ApiProperty({
    description: 'Cart ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsNotEmpty({ message: 'Cart ID is required' })
  @IsUUID('4', { message: 'Cart ID must be a valid UUID' })
  cartId!: string;

  @ApiProperty({
    description: 'Total order amount in KRW',
    example: 150000,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Total order amount is required' })
  @Type(() => Number)
  @IsInt({ message: 'Total order amount must be an integer' })
  @Min(0, { message: 'Total order amount must be at least 0' })
  totalOrderAmount!: number;

  @ApiProperty({
    description: 'Total payment amount in KRW',
    example: 145000,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Total payment amount is required' })
  @Type(() => Number)
  @IsInt({ message: 'Total payment amount must be an integer' })
  @Min(0, { message: 'Total payment amount must be at least 0' })
  totalPaymentAmount!: number;

  @ApiProperty({
    description: 'Product number',
    example: 1001,
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Product id is required' })
  @Type(() => Number)
  @IsInt({ message: 'Product id must be an integer' })
  @Min(1, { message: 'Product id must be at least 1' })
  productId!: string;

  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Organic Apple 1kg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Product name must be a string' })
  @MaxLength(500, { message: 'Product name must not exceed 500 characters' })
  productName?: string;

  @ApiPropertyOptional({
    description: 'Product name with options',
    example: 'Organic Apple 1kg (Red, Gift Box)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Product name with options must be a string' })
  @MaxLength(500, { message: 'Product name with options must not exceed 500 characters' })
  productNameWithOptions?: string;

  @ApiProperty({
    description: 'Order quantity',
    example: 5,
    minimum: 1,
    maximum: 10000,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10000, { message: 'Quantity must not exceed 10000' })
  quantity!: number;

  @ApiPropertyOptional({
    description: 'Recipient name',
    example: '김철수',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Recipient name must be a string' })
  @MinLength(2, { message: 'Recipient name must be at least 2 characters' })
  @MaxLength(100, { message: 'Recipient name must not exceed 100 characters' })
  recipient?: string;

  @ApiPropertyOptional({
    description: 'Full recipient address',
    example: '서울특별시 강남구 테헤란로 123, 456호',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Recipient address must be a string' })
  @MaxLength(500, { message: 'Recipient address must not exceed 500 characters' })
  recipientAddressFull?: string;

  @ApiProperty({
    description: 'Recipient postal code (5 digits)',
    example: 12345,
    minimum: 10000,
    maximum: 99999,
  })
  @IsNotEmpty({ message: 'Recipient postal code is required' })
  @Type(() => Number)
  @IsInt({ message: 'Recipient postal code must be an integer' })
  @Min(10000, { message: 'Recipient postal code must be a 5-digit number' })
  @Max(99999, { message: 'Recipient postal code must be a 5-digit number' })
  recipientPostalCode!: number;

  @ApiPropertyOptional({
    description: 'Recipient mobile phone (format: 010-XXXX-XXXX or 01XXXXXXXXX)',
    example: '010-1234-5678',
    pattern: '^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$',
  })
  @IsOptional()
  @IsString({ message: 'Recipient mobile phone must be a string' })
  @Matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: 'Recipient mobile phone must be in format 010-XXXX-XXXX or 01XXXXXXXXX',
  })
  recipientMobilePhone?: string;

  @ApiPropertyOptional({
    description: 'Recipient phone number (format: 0XX-XXX-XXXX or 0XX-XXXX-XXXX)',
    example: '02-1234-5678',
    pattern: '^0[0-9]{1,2}-?[0-9]{3,4}-?[0-9]{4}$',
  })
  @IsOptional()
  @IsString({ message: 'Recipient phone number must be a string' })
  @Matches(/^0[0-9]{1,2}-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: 'Recipient phone number must be in valid Korean phone format',
  })
  recipientPhoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Delivery message',
    example: '문 앞에 놔주세요',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Delivery message must be a string' })
  @MaxLength(500, { message: 'Delivery message must not exceed 500 characters' })
  deliveryMessage?: string;

  @ApiProperty({
    description: 'Sale price per unit in KRW',
    example: 29000,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Sale price is required' })
  @Type(() => Number)
  @IsInt({ message: 'Sale price must be an integer' })
  @Min(0, { message: 'Sale price must be at least 0' })
  salePrice!: number;

  @ApiPropertyOptional({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.NORMAL,
  })
  @IsOptional()
  @IsString({ message: 'Payment type must be a string' })
  paymentType?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
  })
  @IsOptional()
  @IsString({ message: 'Payment method must be a string' })
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Order date (format: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)',
    example: '2025-12-10',
    pattern: '^\\d{4}-\\d{2}-\\d{2}( \\d{2}:\\d{2}:\\d{2})?$',
  })
  @IsOptional()
  @IsString({ message: 'Order date must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/, {
    message: 'Order date must be in format YYYY-MM-DD or YYYY-MM-DD HH:mm:ss',
  })
  orderDate?: string;

  @ApiPropertyOptional({
    description: 'Desired delivery date (format: YYYY-MM-DD)',
    example: '2025-12-15',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Desired delivery date must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Desired delivery date must be in format YYYY-MM-DD',
  })
  desiredDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Situation',
    enum: EOrderSituation,
    example: EOrderSituation.ORDER_PAYMENT_PENDING,
  })
  @IsOptional()
  @IsString({ message: 'Situation must be a string' })
  situation?: EOrderSituation;

  @ApiPropertyOptional({
    description: 'Courier company',
    example: 'CJ대한통운',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Courier company must be a string' })
  @MaxLength(50, { message: 'Courier company must not exceed 50 characters' })
  courierCompany?: string;

  @ApiPropertyOptional({
    description: 'List of coupon IDs used for this order',
    example: ['coupon-id-1', 'coupon-id-2'],
    type: [String],
  })
  @IsOptional()
  couponUsed?: string[];

  @ApiPropertyOptional({
    description: 'Total discount amount applied to this order',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Discount amount must be an integer' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;
}

// ============================================
// 2. UPDATE ORDER DTO (All fields optional)
// ============================================
export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Cart ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Cart ID must be a valid UUID' })
  cartId?: string;

  @ApiPropertyOptional({
    description: 'Order number',
    example: 'ORD-2025-001234',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Order number must be a string' })
  @MaxLength(255, { message: 'Order number must not exceed 255 characters' })
  orderNumber?: string;

  @ApiPropertyOptional({
    description: 'Order group number',
    example: 'GRP-2025-001234',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Order group number must be a string' })
  @MaxLength(255, { message: 'Order group number must not exceed 255 characters' })
  orderGroupNumber?: string;

  @ApiPropertyOptional({
    description: 'Total order amount in KRW',
    example: 150000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Total order amount must be an integer' })
  @Min(0, { message: 'Total order amount must be at least 0' })
  totalOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'Total payment amount in KRW',
    example: 145000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Total payment amount must be an integer' })
  @Min(0, { message: 'Total payment amount must be at least 0' })
  totalPaymentAmount?: number;

  @ApiPropertyOptional({
    description: 'Product number',
    example: 1001,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Product number must be an integer' })
  @Min(1, { message: 'Product number must be at least 1' })
  productNumber?: number;

  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Organic Apple 1kg',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Product name must be a string' })
  @MaxLength(500, { message: 'Product name must not exceed 500 characters' })
  productName?: string;

  @ApiPropertyOptional({
    description: 'Product name with options',
    example: 'Organic Apple 1kg (Red, Gift Box)',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Product name with options must be a string' })
  @MaxLength(500, { message: 'Product name with options must not exceed 500 characters' })
  productNameWithOptions?: string;

  @ApiPropertyOptional({
    description: 'Order quantity',
    example: 5,
    minimum: 1,
    maximum: 10000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10000, { message: 'Quantity must not exceed 10000' })
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Recipient name',
    example: '김철수',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Recipient name must be a string' })
  @MinLength(2, { message: 'Recipient name must be at least 2 characters' })
  @MaxLength(100, { message: 'Recipient name must not exceed 100 characters' })
  recipient?: string;

  @ApiPropertyOptional({
    description: 'Full recipient address',
    example: '서울특별시 강남구 테헤란로 123, 456호',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Recipient address must be a string' })
  @MaxLength(500, { message: 'Recipient address must not exceed 500 characters' })
  recipientAddressFull?: string;

  @ApiPropertyOptional({
    description: 'Recipient postal code (5 digits)',
    example: 12345,
    minimum: 10000,
    maximum: 99999,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Recipient postal code must be an integer' })
  @Min(10000, { message: 'Recipient postal code must be a 5-digit number' })
  @Max(99999, { message: 'Recipient postal code must be a 5-digit number' })
  recipientPostalCode?: number;

  @ApiPropertyOptional({
    description: 'Recipient mobile phone (format: 010-XXXX-XXXX or 01XXXXXXXXX)',
    example: '010-1234-5678',
    pattern: '^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$',
  })
  @IsOptional()
  @IsString({ message: 'Recipient mobile phone must be a string' })
  @Matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: 'Recipient mobile phone must be in format 010-XXXX-XXXX or 01XXXXXXXXX',
  })
  recipientMobilePhone?: string;

  @ApiPropertyOptional({
    description: 'Recipient phone number (format: 0XX-XXX-XXXX or 0XX-XXXX-XXXX)',
    example: '02-1234-5678',
    pattern: '^0[0-9]{1,2}-?[0-9]{3,4}-?[0-9]{4}$',
  })
  @IsOptional()
  @IsString({ message: 'Recipient phone number must be a string' })
  @Matches(/^0[0-9]{1,2}-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: 'Recipient phone number must be in valid Korean phone format',
  })
  recipientPhoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Delivery message',
    example: '문 앞에 놔주세요',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Delivery message must be a string' })
  @MaxLength(500, { message: 'Delivery message must not exceed 500 characters' })
  deliveryMessage?: string;

  @ApiPropertyOptional({
    description: 'Sale price per unit in KRW',
    example: 29000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Sale price must be an integer' })
  @Min(0, { message: 'Sale price must be at least 0' })
  salePrice?: number;

  @ApiPropertyOptional({
    description: 'Payment type',
    enum: PaymentType,
    example: PaymentType.NORMAL,
  })
  @IsOptional()
  @IsString({ message: 'Payment type must be a string' })
  paymentType?: string;

  @ApiPropertyOptional({
    description: 'Payment method',
    example: 'CARD',
  })
  @IsOptional()
  @IsString({ message: 'Payment method must be a string' })
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Order date (format: YYYY-MM-DD or YYYY-MM-DD HH:mm:ss)',
    example: '2025-12-10',
    pattern: '^\\d{4}-\\d{2}-\\d{2}( \\d{2}:\\d{2}:\\d{2})?$',
  })
  @IsOptional()
  @IsString({ message: 'Order date must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/, {
    message: 'Order date must be in format YYYY-MM-DD or YYYY-MM-DD HH:mm:ss',
  })
  orderDate?: string;

  @ApiPropertyOptional({
    description: 'Orderer name',
    example: '박영희',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Orderer name must be a string' })
  @MinLength(2, { message: 'Orderer name must be at least 2 characters' })
  @MaxLength(100, { message: 'Orderer name must not exceed 100 characters' })
  ordererName?: string;

  @ApiPropertyOptional({
    description: 'Orderer mobile phone (format: 010-XXXX-XXXX or 01XXXXXXXXX)',
    example: '010-9876-5432',
    pattern: '^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$',
  })
  @IsOptional()
  @IsString({ message: 'Orderer mobile phone must be a string' })
  @Matches(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, {
    message: 'Orderer mobile phone must be in format 010-XXXX-XXXX or 01XXXXXXXXX',
  })
  ordererMobilePhone?: string;

  @ApiPropertyOptional({
    description: 'Orderer user ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Orderer ID must be a valid UUID' })
  ordererId?: string;

  @ApiPropertyOptional({
    description: 'Desired delivery date (format: YYYY-MM-DD)',
    example: '2025-12-15',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Desired delivery date must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Desired delivery date must be in format YYYY-MM-DD',
  })
  desiredDeliveryDate?: string;

  @ApiPropertyOptional({
    description: 'Membership level at order time',
    example: 'GOLD',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Membership level must be a string' })
  @MaxLength(50, { message: 'Membership level must not exceed 50 characters' })
  membershipLevelAtOrderTime?: string;

  @ApiPropertyOptional({
    description: 'Situation',
    enum: EOrderSituation,
    example: EOrderSituation.ORDER_PAYMENT_PENDING,
  })
  @IsOptional()
  @IsString({ message: 'Situation must be a string' })
  situation?: EOrderSituation;

  @ApiPropertyOptional({
    description: 'Courier company',
    example: 'CJ대한통운',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Courier company must be a string' })
  @MaxLength(50, { message: 'Courier company must not exceed 50 characters' })
  courierCompany?: string;
  
  @ApiPropertyOptional({
    description: 'Invoice number',
    example: '1234567890',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Invoice number must be a string' })
  @MaxLength(50, { message: 'Invoice number must not exceed 50 characters' })
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'List of coupon IDs used for this order',
    example: ['coupon-id-1', 'coupon-id-2'],
    type: [String],
  })
  @IsOptional()
  couponUsed?: string[];

  @ApiPropertyOptional({
    description: 'Total discount amount applied to this order',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Discount amount must be an integer' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;
}

// ============================================
// 3. ORDER RESPONSE DTO
// ============================================
export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiPropertyOptional({ description: 'Cart ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  cartId?: string | null;

  @ApiPropertyOptional({ description: 'Order number', example: 'ORD-2025-001234' })
  orderNumber?: string | null;

  @ApiPropertyOptional({ description: 'Order group number', example: 'GRP-2025-001234' })
  orderGroupNumber?: string | null;

  @ApiPropertyOptional({ description: 'Total order amount in KRW', example: 150000 })
  totalOrderAmount?: number | null;

  @ApiPropertyOptional({ description: 'Total payment amount in KRW', example: 145000 })
  totalPaymentAmount?: number | null;

  @ApiPropertyOptional({ description: 'Product', example: { id: '123e4567-e89b-12d3-a456-426614174000', productName: 'Organic Apple 1kg', productCode: '1234567890', productPrice: 10000, salePrice: 12000, consumerPrice: 8000, supplyPrice: 6000, modelName: 'Apple 1kg' } })
  productId?: string | null;

  @ApiPropertyOptional({ description: 'Product name', example: 'Organic Apple 1kg' })
  productName?: string | null;

  @ApiPropertyOptional({ description: 'Product name with options', example: 'Organic Apple 1kg (Red, Gift Box)' })
  productNameWithOptions?: string | null;

  @ApiPropertyOptional({ description: 'Order quantity', example: 5 })
  quantity?: number | null;

  @ApiPropertyOptional({ description: 'Recipient name', example: '김철수' })
  recipient?: string | null;

  @ApiPropertyOptional({ description: 'Full recipient address', example: '서울특별시 강남구 테헤란로 123, 456호' })
  recipientAddressFull?: string | null;

  @ApiPropertyOptional({ description: 'Recipient postal code', example: 12345 })
  recipientPostalCode?: number | null;

  @ApiPropertyOptional({ description: 'Recipient mobile phone', example: '010-1234-5678' })
  recipientMobilePhone?: string | null;

  @ApiPropertyOptional({ description: 'Recipient phone number', example: '02-1234-5678' })
  recipientPhoneNumber?: string | null;

  @ApiPropertyOptional({ description: 'Delivery message', example: '문 앞에 놔주세요' })
  deliveryMessage?: string | null;

  @ApiPropertyOptional({ description: 'Sale price per unit in KRW', example: 29000 })
  salePrice?: number | null;

  @ApiPropertyOptional({ description: 'Payment type', example: '선결제' })
  paymentType?: string | null;

  @ApiPropertyOptional({ description: 'Payment method', example: '신용카드' })
  paymentMethod?: string | null;

  @ApiPropertyOptional({ description: 'Order date', example: '2025-12-10' })
  orderDate?: string | null;

  @ApiPropertyOptional({ description: 'Orderer name', example: '박영희' })
  ordererName?: string | null;

  @ApiPropertyOptional({ description: 'Orderer mobile phone', example: '010-9876-5432' })
  ordererMobilePhone?: string | null;

  @ApiPropertyOptional({ description: 'Orderer user ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  ordererId?: string | null;

  @ApiPropertyOptional({ description: 'Desired delivery date', example: '2025-12-15' })
  desiredDeliveryDate?: string | null;

  @ApiPropertyOptional({ description: 'Membership level at order time', example: 'GOLD' })
  membershipLevelAtOrderTime?: string | null;

  @ApiPropertyOptional({ description: 'Order creation timestamp', example: '2025-12-10T10:30:00.000Z' })
  createdAt?: Date | null;

  @ApiPropertyOptional({ description: 'Order last update timestamp', example: '2025-12-10T10:30:00.000Z' })
  updatedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Associated user information' })
  user?: any;

  @ApiPropertyOptional({ description: 'List of coupon IDs used for this order', example: ['coupon-id-1', 'coupon-id-2'], type: [String] })
  couponUsed?: string[] | null;

  @ApiPropertyOptional({ description: 'Total discount amount applied to this order', example: 5000 })
  discountAmount?: number | null;
}

// ============================================
// 4. ORDER FILTER DTO (Search & Pagination)
// ============================================
export class OrderFilterDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by order number, product name, customer name, recipient name',
    example: 'ORD-2025-001234 OR Apple OR 김철수 OR 박영희',
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  q?: string;


  @ApiPropertyOptional({
    description: 'Filter by orderer user ID',
    example: 'user000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Orderer ID must be a valid UUID' })
  ordererId?: string;

  @ApiPropertyOptional({
    description: 'Date range start (format: YYYY-MM-DD)',
    example: '2025-01-01',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Date from must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date from must be in format YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date range end (format: YYYY-MM-DD)',
    example: '2025-12-31',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Date to must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date to must be in format YYYY-MM-DD',
  })
  dateTo?: string;


  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'createdAt',
      'updatedAt',
      'orderDate',
      'totalOrderAmount',
      'orderNumber',
      'productName',
      'ordererName',
      'recipient',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @IsIn(
    [
      'createdAt',
      'updatedAt',
      'orderDate',
      'totalOrderAmount',
      'totalPaymentAmount',
      'orderNumber',
      'productName',
      'ordererName',
      'recipient',
      'situation',
      'courierCompany',
    ],
    { message: 'Invalid sort field' },
  )
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['asc', 'desc'], { message: 'Sort order must be either "asc" or "desc"' })
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Order status filter',
    enum: [...Object.values(EOrderSituation), 'ALL'],
    example: EOrderSituation.ORDER_PAYMENT_PENDING,
  })
  @IsOptional()
  @IsString({ message: 'Order status must be a string' })
  @IsIn([...Object.values(EOrderSituation), 'ALL'], {
    message: 'Order status must be a valid order status or ALL',
  })
  situation?: EOrderSituation | 'ALL';

  @ApiPropertyOptional({
    description: 'Predefined period filter',
    example: '7d',
    enum: ['today', '7d', '1m', 'all'],
  })
  @IsOptional()
  @IsString({ message: 'Period must be a string' })
  @IsIn(['today', '7d', '1m', 'all'], {
    message: 'Period must be one of today, 7d, 1m, all',
  })
  period?: 'today' | '7d' | '1m' | 'all';

  // @ApiPropertyOptional({
  //   description: 'General search term (searches across multiple fields)',
  //   example: 'Apple',
  // })
  // @IsOptional()
  // @IsString({ message: 'Search term must be a string' })
  // search?: string;
}

// ============================================
// PAGINATION & LIST RESPONSE INTERFACES
// ============================================
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface OrderListResponse {
  orders: OrderResponseDto[];
  pagination: PaginationMeta;
}

export interface OrderGroupedByOrderGroup {
  orderGroupNumber: string | null;
  orders: OrderResponseDto[];
}

export interface OrderGroupedListResponse {
  orderGroups: OrderGroupedByOrderGroup[];
  pagination: PaginationMeta;
}

// ============================================
// ORDER STATISTICS RESPONSE
// ============================================
export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderAmount: number;
  byPaymentType: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  topProducts: Array<{ productName: string; totalQuantity: number; totalRevenue: number }>;
}

// ============================================
// ORDER GROUP DTOs
// ============================================

// 1. CREATE ORDER GROUP DTO
export class CreateOrderGroupDto {
  @ApiPropertyOptional({
    description: 'Order group number (auto-generated if not provided)',
    example: '20250123-0000001',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Order group number must be a string' })
  @MaxLength(255, { message: 'Order group number must not exceed 255 characters' })
  orderGroupNumber?: string;

  @ApiPropertyOptional({
    description: 'Order group name',
    example: 'Order Group 2025-01-23',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Order group name must be a string' })
  @MaxLength(255, { message: 'Order group name must not exceed 255 characters' })
  orderGroupName?: string;

  @ApiProperty({
    description: 'Original amount before discounts',
    example: 150000,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Original amount is required' })
  @Type(() => Number)
  @IsInt({ message: 'Original amount must be an integer' })
  @Min(0, { message: 'Original amount must be at least 0' })
  originalAmount!: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Discount amount must be an integer' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;

  @ApiProperty({
    description: 'Final amount after discounts',
    example: 145000,
    minimum: 0,
  })
  @IsNotEmpty({ message: 'Final amount is required' })
  @Type(() => Number)
  @IsInt({ message: 'Final amount must be an integer' })
  @Min(0, { message: 'Final amount must be at least 0' })
  finalAmount!: number;

  @ApiPropertyOptional({
    description: 'Points used',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Points used must be an integer' })
  @Min(0, { message: 'Points used must be at least 0' })
  pointsUsed?: number;

  @ApiPropertyOptional({
    description: 'Cart item IDs',
    example: ['cart-item-id-1', 'cart-item-id-2'],
    type: [String],
  })
  @IsOptional()
  cartItemIds?: string[];

  @ApiPropertyOptional({
    description: 'Delivery fee',
    example: 3000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Delivery fee must be an integer' })
  @Min(0, { message: 'Delivery fee must be at least 0' })
  deliveryFee?: number;

  @ApiPropertyOptional({
    description: 'Orderer user ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Orderer ID must be a valid UUID' })
  ordererId?: string;

  @ApiPropertyOptional({
    description: 'Situation',
    enum: EOrderSituation,
    example: EOrderSituation.ORDER_PAYMENT_PENDING,
  })
  @IsOptional()
  @IsEnum(EOrderSituation, { message: 'Situation must be a valid order situation' })
  situation?: EOrderSituation;
}

// 2. UPDATE ORDER GROUP DTO
export class UpdateOrderGroupDto {
  @ApiPropertyOptional({
    description: 'Order group name',
    example: 'Order Group 2025-01-23',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Order group name must be a string' })
  @MaxLength(255, { message: 'Order group name must not exceed 255 characters' })
  orderGroupName?: string;

  @ApiPropertyOptional({
    description: 'Original amount before discounts',
    example: 150000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Original amount must be an integer' })
  @Min(0, { message: 'Original amount must be at least 0' })
  originalAmount?: number;

  @ApiPropertyOptional({
    description: 'Discount amount',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Discount amount must be an integer' })
  @Min(0, { message: 'Discount amount must be at least 0' })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Final amount after discounts',
    example: 145000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Final amount must be an integer' })
  @Min(0, { message: 'Final amount must be at least 0' })
  finalAmount?: number;

  @ApiPropertyOptional({
    description: 'Points used',
    example: 1000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Points used must be an integer' })
  @Min(0, { message: 'Points used must be at least 0' })
  pointsUsed?: number;

  @ApiPropertyOptional({
    description: 'Cart item IDs',
    example: ['cart-item-id-1', 'cart-item-id-2'],
    type: [String],
  })
  @IsOptional()
  cartItemIds?: string[];

  @ApiPropertyOptional({
    description: 'Delivery fee',
    example: 3000,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Delivery fee must be an integer' })
  @Min(0, { message: 'Delivery fee must be at least 0' })
  deliveryFee?: number;

  @ApiPropertyOptional({
    description: 'Orderer user ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Orderer ID must be a valid UUID' })
  ordererId?: string;

  @ApiPropertyOptional({
    description: 'Situation',
    enum: EOrderSituation,
    example: EOrderSituation.ORDER_PAYMENT_COMPLETED,
  })
  @IsOptional()
  @IsEnum(EOrderSituation, { message: 'Situation must be a valid order situation' })
  situation?: EOrderSituation;

  @ApiPropertyOptional({
    description: 'Courier company',
    example: 'CJ대한통운',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Courier company must be a string' })
  @MaxLength(50, { message: 'Courier company must not exceed 50 characters' })
  courierCompany?: string;

  @ApiPropertyOptional({
    description: 'Invoice number',
    example: '1234567890',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'Invoice number must be a string' })
  @MaxLength(50, { message: 'Invoice number must not exceed 50 characters' })
  invoiceNumber?: string;
}

// 3. ORDER GROUP RESPONSE DTO
export class OrderGroupResponseDto {
  @ApiProperty({ description: 'Order group number', example: '20250123-0000001' })
  orderGroupNumber!: string;

  @ApiPropertyOptional({ description: 'Order group name', example: 'Order Group 2025-01-23' })
  orderGroupName?: string | null;

  @ApiPropertyOptional({ description: 'Original amount before discounts', example: 150000 })
  originalAmount?: number | null;

  @ApiPropertyOptional({ description: 'Discount amount', example: 5000 })
  discountAmount?: number | null;

  @ApiPropertyOptional({ description: 'Final amount after discounts', example: 145000 })
  finalAmount?: number | null;

  @ApiPropertyOptional({ description: 'Points used', example: 1000 })
  pointsUsed?: number | null;

  @ApiPropertyOptional({ description: 'Cart item IDs', example: ['cart-item-id-1'], type: [String] })
  cartItemIds?: string[] | null;

  @ApiPropertyOptional({ description: 'Delivery fee', example: 3000 })
  deliveryFee?: number | null;

  @ApiPropertyOptional({ description: 'Orderer user ID (UUID)', example: '123e4567-e89b-12d3-a456-426614174000' })
  ordererId?: string | null;

  @ApiPropertyOptional({ description: 'Situation', enum: EOrderSituation, example: EOrderSituation.ORDER_PAYMENT_PENDING })
  situation?: EOrderSituation | null;

  @ApiPropertyOptional({ description: 'Courier company', example: 'CJ대한통운' })
  courierCompany?: string | null;

  @ApiPropertyOptional({ description: 'Invoice number', example: '1234567890' })
  invoiceNumber?: string | null;

  @ApiPropertyOptional({ description: 'Order group creation timestamp', example: '2025-01-23T10:30:00.000Z' })
  createdAt?: Date | null;

  @ApiPropertyOptional({ description: 'Order group last update timestamp', example: '2025-01-23T10:30:00.000Z' })
  updatedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Associated user information' })
  user?: any;

  @ApiPropertyOptional({ description: 'Orders in this group', type: [OrderResponseDto] })
  orders?: OrderResponseDto[] | null;
}

// 4. ORDER GROUP FILTER DTO
export class OrderGroupFilterDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must not exceed 100' })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Search by order group number, orderer name',
    example: '20250123-0000001',
  })
  @IsOptional()
  @IsString({ message: 'Search query must be a string' })
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by orderer user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Orderer ID must be a valid UUID' })
  ordererId?: string;

  @ApiPropertyOptional({
    description: 'Date range start (format: YYYY-MM-DD)',
    example: '2025-01-01',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Date from must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date from must be in format YYYY-MM-DD',
  })
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Date range end (format: YYYY-MM-DD)',
    example: '2025-12-31',
    pattern: '^\\d{4}-\\d{2}-\\d{2}$',
  })
  @IsOptional()
  @IsString({ message: 'Date to must be a string' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date to must be in format YYYY-MM-DD',
  })
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: [
      'createdAt',
      'updatedAt',
      'orderGroupNumber',
      'finalAmount',
      'originalAmount',
      'situation',
    ],
  })
  @IsOptional()
  @IsString({ message: 'Sort by must be a string' })
  @IsIn(
    [
      'createdAt',
      'updatedAt',
      'orderGroupNumber',
      'finalAmount',
      'originalAmount',
      'situation',
    ],
    { message: 'Invalid sort field' },
  )
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  @IsIn(['asc', 'desc'], { message: 'Sort order must be either "asc" or "desc"' })
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Order status filter',
    enum: [...Object.values(EOrderSituation), 'ALL'],
    example: EOrderSituation.ORDER_PAYMENT_PENDING,
  })
  @IsOptional()
  @IsString({ message: 'Order status must be a string' })
  @IsIn([...Object.values(EOrderSituation), 'ALL'], {
    message: 'Order status must be a valid order status or ALL',
  })
  situation?: EOrderSituation | 'ALL';

  @ApiPropertyOptional({
    description: 'Predefined period filter',
    example: '7d',
    enum: ['today', '7d', '1m', 'all'],
  })
  @IsOptional()
  @IsString({ message: 'Period must be a string' })
  @IsIn(['today', '7d', '1m', 'all'], {
    message: 'Period must be one of today, 7d, 1m, all',
  })
  period?: 'today' | '7d' | '1m' | 'all';
}

// 5. ORDER GROUP LIST RESPONSE
export interface OrderGroupListResponse {
  orderGroups: OrderGroupResponseDto[];
  pagination: PaginationMeta;
}

