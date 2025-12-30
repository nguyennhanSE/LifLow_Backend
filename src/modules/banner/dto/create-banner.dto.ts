import {
  IsEnum,
  IsString,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  IsDateString,
  IsUUID,
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EBannerType, EBannerStatus } from '../enums/banner.enum';
import { ECategoryType } from '../../categories/enums/category.enum';

export class CreateBannerDto {
  @ApiProperty({
    description: 'Banner type',
    enum: EBannerType,
    example: EBannerType.MAIN_PRODUCTS,
  })
  @IsEnum(EBannerType)
  type: EBannerType;

  @ApiPropertyOptional({
    description: 'Banner status',
    enum: EBannerStatus,
    example: EBannerStatus.ACTIVE,
    default: EBannerStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EBannerStatus)
  status?: EBannerStatus;

  @ApiPropertyOptional({
    description: 'Product category number',
    example: 'CAT001',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  productCategoryNumber?: string;

  @ApiPropertyOptional({
    description: 'Product ID (UUID) for product banners',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId?: string;

  @ApiPropertyOptional({
    description: 'Banner title',
    example: 'Special Holiday Sale',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Badge text for banner',
    example: 'NEW',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeText?: string;

  @ApiPropertyOptional({
    description: 'Main text content for the banner',
    example: 'Get 50% off on all items',
  })
  @IsOptional()
  @IsString()
  mainText?: string;

  @ApiPropertyOptional({
    description: 'CTA button text',
    example: 'Shop Now',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ctaButtonText?: string;

  @ApiPropertyOptional({
    description: 'CTA button URL',
    example: '/products/123',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'ctaButtonUrl must be a valid URL' })
  @MaxLength(500)
  ctaButtonUrl?: string;

  @ApiProperty({
    description: 'Banner image URL (required, minimum 800x800px recommended)',
    example: 'https://example.com/banners/holiday-sale.jpg',
  })
  @IsNotEmpty()
  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Mobile-optimized image URL',
    example: 'https://example.com/banners/holiday-sale-mobile.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'mobileImageUrl must be a valid URL' })
  mobileImageUrl?: string;

  @ApiPropertyOptional({
    description: 'Display order (lower numbers appear first)',
    example: 0,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Start date for scheduled banners (ISO 8601 format)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for scheduled banners (ISO 8601 format)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
