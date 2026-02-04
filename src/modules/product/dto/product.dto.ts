import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsNotEmpty, MaxLength, ValidateIf, IsArray, IsUUID, ArrayMinSize, IsEnum, ValidateNested, IsBoolean, IsNumber, IsDate } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Enums for status fields
export enum DisplayStatus {
  Y = 'Y',
  N = 'N',
}

export enum SaleStatus {
  ON_SALE = '판매함',
  NOT_ON_SALE = '판매안함',
}

// Product Badges DTO
export class ProductBadgesDto {
  @ApiPropertyOptional({ description: 'Whether the product is a hot deal', example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'isHotDeal must be a boolean' })
  isHotDeal?: boolean;

  @ApiPropertyOptional({ description: 'Whether the product is a new product', example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'isNewProduct must be a boolean' })
  isNewProduct?: boolean;

  @ApiPropertyOptional({ description: 'Whether the product is a best seller', example: false, default: false })
  @IsOptional()
  @IsBoolean({ message: 'isBestSeller must be a boolean' })
  isBestSeller?: boolean;
}

export class CreateProductSpecialOfferDto {
  @ApiPropertyOptional({ description: 'Special offer status', example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;

  @ApiPropertyOptional({ description: 'Special offer discount amount', example: 10000 })
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Special offer discount amount must be a positive number' })
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Special offer price applied', example: 10000 })
  @IsOptional()
  @IsInt()
  specialPriceApplied?: number;

  @ApiPropertyOptional({ description: 'Special offer start date', example: '2025-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Special offer end date', example: '2025-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

// Create Product DTO
export class CreateProductDto {
  @ApiPropertyOptional({ description: 'Product name (required)', example: 'Organic Apple' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Product code', example: 'PROD001' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Product code is required' })
  productCode!: string;
  
  // category - single category number
  @ApiPropertyOptional({ description: 'Category number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category?: number;

  @ApiPropertyOptional({ description: 'Storage method', example: 'refrigerator' })
  @IsOptional()
  @IsString()
  storageMethod?: string;

  // manufacturer
  @ApiPropertyOptional({ description: 'Manufacturer', example: 'ABC Company' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  //origin
  @ApiPropertyOptional({ description: 'Origin', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Origin must be a positive number' })
  origin?: number;

  @ApiPropertyOptional({ description: 'Consumer price (원)', example: 15000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Consumer price must be a positive number' })
  consumerPrice?: number;

  @ApiPropertyOptional({ description: 'Supply price (원)', example: 12000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Supply price must be a positive number' })
  supplyPrice?: number;

  //product price
  @ApiPropertyOptional({ description: 'Product price (원)', example: 13000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Product price must be a positive number' })
  productPrice?: number;

  //sale price
  @ApiPropertyOptional({ description: 'Sale price (원)', example: 10000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Sale price must be a positive number' })
  salePrice?: number;

  //discount rate
  @ApiPropertyOptional({ description: 'Discount rate', example: 10, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Discount rate must be a positive number' })
  discountRate?: number;

  //discount start date
  @ApiPropertyOptional({ description: 'Discount start date', example: '2025-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  discountStartDate?: Date;

  //discount end date
  @ApiPropertyOptional({ description: 'Discount end date', example: '2025-01-01' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  discountEndDate?: Date;

  //delivery method
  @ApiPropertyOptional({ description: 'Delivery method', example: '택배' })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  //delivery fee
  @ApiPropertyOptional({ description: 'Delivery fee input', example: '10000' })
  @IsOptional()
  @IsString()
  deliveryFeeInput?: string;

  //brief explanation
  @ApiPropertyOptional({ description: 'Brief explanation', example: 'This is a brief explanation of the product' })
  @IsOptional()
  @IsString()
  productBriefDescription?: string;

  // seo description
  @ApiPropertyOptional({ description: 'Seo description', example: 'This is a seo description of the product' })
  @IsOptional()
  @IsString()
  seoDescription?: string;

  //seo keywords
  @ApiPropertyOptional({ description: 'Seo keywords', example: 'This is a list of seo keywords for the product' })
  @IsOptional()
  @IsString()
  seoKeywords?: string;

  // sale status
  @ApiPropertyOptional({ description: 'Sale status', example: '판매중' })
  @IsOptional()
  @IsString()
  displayStatus?: string;

  // stock quantity
  @ApiPropertyOptional({ description: 'Stock quantity', example: 100, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Stock quantity must be a positive number' })
  stockQuantity?: number;

  @ApiPropertyOptional({ 
    description: 'Product badges (send as JSON string for multipart/form-data, e.g., \'{"isHotDeal":true,"isNewProduct":true,"isBestSeller":false}\')', 
    example: { isHotDeal: true, isNewProduct: true, isBestSeller: false },
  })
  @IsOptional()
  @Transform(({ value, obj }) => {
    let badgesData: { isHotDeal?: boolean; isNewProduct?: boolean; isBestSeller?: boolean } | null = null;
    
    // If value is already an object, use it
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log('productBadges Transform: value is already object', value);
      badgesData = value;
    }
    // If value is a string, try to parse it as JSON
    else if (typeof value === 'string' && value.trim() !== '') {
      // Skip if it's the string "[object Object]" which means object was stringified incorrectly
      if (value === '[object Object]') {
        console.log('productBadges Transform: received [object Object] string, returning undefined');
        return undefined;
      }
      try {
        const parsed = JSON.parse(value);
        // Only use if it's an object
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          console.log('productBadges Transform: parsed JSON successfully', parsed);
          badgesData = parsed;
        }
      } catch (e) {
        console.log('productBadges Transform: JSON parse failed, trying separate fields', e);
        // If parsing fails, try to check if it's sent as separate fields
        // For multipart/form-data, sometimes object fields come as separate properties
        // Check if we have productBadges.isHotDeal, etc.
        if (obj && typeof obj === 'object') {
          const tempBadges: { isHotDeal?: boolean; isNewProduct?: boolean; isBestSeller?: boolean } = {};
          if (obj['productBadges.isHotDeal'] !== undefined) {
            tempBadges.isHotDeal = obj['productBadges.isHotDeal'] === 'true' || obj['productBadges.isHotDeal'] === true;
          }
          if (obj['productBadges.isNewProduct'] !== undefined) {
            tempBadges.isNewProduct = obj['productBadges.isNewProduct'] === 'true' || obj['productBadges.isNewProduct'] === true;
          }
          if (obj['productBadges.isBestSeller'] !== undefined) {
            tempBadges.isBestSeller = obj['productBadges.isBestSeller'] === 'true' || obj['productBadges.isBestSeller'] === true;
          }
          if (Object.keys(tempBadges).length > 0) {
            badgesData = tempBadges;
            console.log('productBadges Transform: built from separate fields', badgesData);
          }
        }
        if (!badgesData) {
          console.log('productBadges Transform: returning undefined after failed parse');
          return undefined;
        }
      }
    }
    
    // If we have badgesData, create an instance of ProductBadgesDto
    if (badgesData) {
      const badges = new ProductBadgesDto();
      if (badgesData.isHotDeal !== undefined) badges.isHotDeal = badgesData.isHotDeal;
      if (badgesData.isNewProduct !== undefined) badges.isNewProduct = badgesData.isNewProduct;
      if (badgesData.isBestSeller !== undefined) badges.isBestSeller = badgesData.isBestSeller;
      return badges;
    }
    
    // For other types or empty string, return undefined
    console.log('productBadges Transform: value is not object or string, returning undefined. Type:', typeof value, 'Value:', value);
    return undefined;
  })
  @ValidateIf((o) => {
    // Only validate if productBadges exists and is an object after transform
    const value = o.productBadges;
    return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value);
  })
  @ValidateNested()
  @Type(() => ProductBadgesDto)
  productBadges?: ProductBadgesDto;


  @ApiPropertyOptional({ 
    description: 'Special offer (send as JSON string for multipart/form-data, e.g., \'{"status":true,"discountAmount":10000,"specialPriceApplied":10000,"startDate":"2025-01-01","endDate":"2025-01-01"}\')', 
    example: { status: true, discountAmount: 10000, specialPriceApplied: 10000, startDate: '2025-01-01', endDate: '2025-01-01' },
  })
  @IsOptional()
  @Transform(({ value, obj }) => {
    let specialOfferData: {
      status?: boolean;
      discountAmount?: number;
      specialPriceApplied?: number;
      startDate?: Date | string;
      endDate?: Date | string;
    } | null = null;
    
    // If value is already an object, use it
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      specialOfferData = value;
    }
    // If value is a string, try to parse it as JSON
    else if (typeof value === 'string' && value.trim() !== '') {
      // Skip if it's the string "[object Object]" which means object was stringified incorrectly
      if (value === '[object Object]') {
        console.log('specialOffer Transform: received [object Object] string, returning undefined');
        return undefined;
      }
      try {
        const parsed = JSON.parse(value);
        // Only use if it's an object
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          console.log('specialOffer Transform: parsed JSON successfully', parsed);
          specialOfferData = parsed;
        }
      } catch (e) {
        console.log('specialOffer Transform: JSON parse failed', e);
        return undefined;
      }
    }
    
    // If we have specialOfferData, create an instance of CreateProductSpecialOfferDto
    if (specialOfferData) {
      const specialOffer = new CreateProductSpecialOfferDto();
      if (specialOfferData.status !== undefined) specialOffer.status = specialOfferData.status;
      if (specialOfferData.discountAmount !== undefined) specialOffer.discountAmount = specialOfferData.discountAmount;
      if (specialOfferData.specialPriceApplied !== undefined) specialOffer.specialPriceApplied = specialOfferData.specialPriceApplied;
      if (specialOfferData.startDate !== undefined) {
        specialOffer.startDate = specialOfferData.startDate instanceof Date 
          ? specialOfferData.startDate 
          : new Date(specialOfferData.startDate);
      }
      if (specialOfferData.endDate !== undefined) {
        specialOffer.endDate = specialOfferData.endDate instanceof Date 
          ? specialOfferData.endDate 
          : new Date(specialOfferData.endDate);
      }
      return specialOffer;
    }
    
    // For other types or empty string, return undefined
    console.log('specialOffer Transform: value is not object or string, returning undefined. Type:', typeof value, 'Value:', value);
    return undefined;
  })
  @ValidateIf((o) => {
    // Only validate if specialOffer exists and is an object after transform
    const value = o.specialOffer;
    return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value);
  })
  @ValidateNested()
  @Type(() => CreateProductSpecialOfferDto)
  specialOffer?: CreateProductSpecialOfferDto;

  // Additional optional fields can be added here as needed
  [key: string]: any;
}

// Update Product DTO - all fields optional
export class UpdateProductDto extends CreateProductDto {}

// Query DTO for listing products
export class ProductListQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term for product name, brand, or code', example: 'organic' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category number', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category?: number;

  @ApiPropertyOptional({ description: 'Filter by brand', example: 'Juwangsan' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Filter by sale status', example: '판매중' })
  @IsOptional()
  @IsString()
  saleStatus?: string;

  @ApiPropertyOptional({ description: 'Filter by display status', example: '진열함' })
  @IsOptional()
  @IsString()
  displayStatus?: string;

  @ApiPropertyOptional({ 
    description: 'Sort field', 
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'productName', 'salePrice', 'consumerPrice', 'brand']
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ 
    description: 'Sort order', 
    example: 'desc',
    enum: ['asc', 'desc']
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ 
    description: 'Include product reviews in response', 
    example: false,
    default: false
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeProductReview?: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ProductListResponse {
  products: any[];
  pagination: PaginationMeta;
}

// Bulk Delete DTO
export class BulkDeleteProductDto {
  @ApiProperty({
    description: 'Array of product IDs to delete',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsNotEmpty({ message: 'Product IDs array is required' })
  @IsArray({ message: 'Product IDs must be an array' })
  @ArrayMinSize(1, { message: 'Product IDs array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID' })
  productIds!: string[];
}

// Status Update DTO
export class UpdateProductStatusDto {
  @ApiPropertyOptional({
    description: 'Display status',
    enum: DisplayStatus,
    example: DisplayStatus.Y,
  })
  @IsOptional()
  @IsEnum(DisplayStatus, { message: 'Display status must be either "Y" or "N"' })
  displayStatus?: DisplayStatus;

  @ApiPropertyOptional({
    description: 'Sale status',
    enum: SaleStatus,
    example: SaleStatus.ON_SALE,
  })
  @IsOptional()
  @IsEnum(SaleStatus, { message: 'Sale status must be either "판매함" or "판매안함"' })
  saleStatus?: SaleStatus;

  @ValidateIf((o) => !o.displayStatus && !o.saleStatus)
  @IsNotEmpty({ message: 'At least one status field (displayStatus or saleStatus) must be provided' })
  _atLeastOne?: any;
}

// Bulk Status Update DTO
export class ProductBulkUpdateStatusDto {
  @ApiProperty({
    description: 'Array of product IDs to update',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsNotEmpty({ message: 'Product IDs array is required' })
  @IsArray({ message: 'Product IDs must be an array' })
  @ArrayMinSize(1, { message: 'Product IDs array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each product ID must be a valid UUID' })
  productIds!: string[];

  @ApiPropertyOptional({
    description: 'Display status to set',
    enum: DisplayStatus,
  })
  @IsOptional()
  @IsEnum(DisplayStatus)
  displayStatus?: DisplayStatus;

  @ApiPropertyOptional({
    description: 'Sale status to set',
    enum: SaleStatus,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  saleStatus?: SaleStatus;

  @ValidateIf((o) => !o.displayStatus && !o.saleStatus)
  @IsNotEmpty({ message: 'At least one status field must be provided' })
  _atLeastOne?: any;
}

// Product Stats Response
export interface ProductStats {
  totalProducts: number;
  bySaleStatus: Record<string, number>;
  byDisplayStatus: Record<string, number>;
  byCategory: Record<string, number>;
  averageSalePrice: number;
}

