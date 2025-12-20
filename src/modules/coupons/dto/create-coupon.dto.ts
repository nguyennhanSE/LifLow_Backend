import {
  IsEnum,
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
  ValidateIf,
  IsArray,
  ArrayNotEmpty,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, CouponTargetGrade } from '../enums/coupon.enum';
import { Type } from 'class-transformer';
import { IsBeforeEndDate } from '../validators/date-range.validator';

export class CreateCouponDto {
  @ApiProperty({
    description: 'Coupon name',
    example: 'VIP 할인 쿠폰',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Unique coupon code',
    example: 'VIP2024WELCOME',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  code: string;

  @ApiProperty({
    description: 'Coupon type: PERCENT for percentage discount, AMOUNT for fixed amount discount',
    enum: CouponType,
    example: CouponType.PERCENT,
  })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiPropertyOptional({
    description: 'Discount rate in percentage (1-100). Required if type is PERCENT',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @ValidateIf((o) => o.type === CouponType.PERCENT)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsNotEmpty({ message: 'discountRate is required when type is PERCENT' })
  discountRate?: number;

  @ApiPropertyOptional({
    description: 'Discount amount in KRW. Required if type is AMOUNT',
    example: 5000,
    minimum: 1,
  })
  @ValidateIf((o) => o.type === CouponType.AMOUNT)
  @IsInt()
  @Min(1)
  @IsNotEmpty({ message: 'discountAmount is required when type is AMOUNT' })
  discountAmount?: number;

  @ApiPropertyOptional({
    description: 'Minimum purchase amount in KRW to use this coupon',
    example: 50000,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minPurchaseAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum discount amount in KRW (useful for percentage coupons)',
    example: 50000,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({
    description: 'Coupon image URL',
    example: 'https://example.com/coupon-image.jpg',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Coupon start date (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsBeforeEndDate()
  startDate: string;

  @ApiProperty({
    description: 'Coupon end date (ISO 8601 format). Must be after startDate',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Whether the coupon is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to auto-issue this coupon monthly',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutoIssue?: boolean;

  @ApiPropertyOptional({
    // Date()
    description: 'Day of month to auto-issue (1-31). Required if isAutoIssue is true',
    example: new Date('2025-12-18').toISOString(),
  })
  @ValidateIf((o) => o.isAutoIssue === true)
  @IsDateString()
  @IsNotEmpty({ message: 'autoIssueDayOfMonth is required when isAutoIssue is true' })
  autoIssueDayOfMonth?: string;

  @ApiPropertyOptional({
    description: 'Target membership grades for auto-issue. Required if isAutoIssue is true',
    enum: CouponTargetGrade,
    isArray: true,
    example: [CouponTargetGrade.VIP, CouponTargetGrade.VVIP],
  })
  @ValidateIf((o) => o.isAutoIssue === true)
  @IsArray()
  @ArrayNotEmpty({ message: 'targetGrades is required when isAutoIssue is true' })
  @IsEnum(CouponTargetGrade, { each: true })
  targetGrades?: CouponTargetGrade[];
}
