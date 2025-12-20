import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, IsNotEmpty, MaxLength, ValidateIf, IsArray, IsUUID, ArrayMinSize, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Enums for status fields
export enum DisplayStatus {
  DISPLAYED = '진열함',
  NOT_DISPLAYED = '진열안함',
}

export enum SaleStatus {
  ON_SALE = '판매함',
  NOT_ON_SALE = '판매안함',
}

// Create Product DTO
export class CreateProductDto {
  @ApiProperty({ description: 'Product name (required)', example: 'Organic Apple', maxLength: 128 })
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString()
  @MaxLength(128, { message: 'Product name must not exceed 128 characters' })
  productName!: string;

  @ApiPropertyOptional({ description: 'Product code', example: 'PROD001' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: 'Brand name', example: 'Juwangsan' })
  @IsOptional()
  @IsString()
  brand?: string;

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

  @ApiPropertyOptional({ description: 'Product price (원)', example: 13000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Product price must be a positive number' })
  productPrice?: number;

  @ApiPropertyOptional({ description: 'Sale price (원)', example: 10000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Sale price must be a positive number' })
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Minimum order quantity must be at least 1' })
  minOrderQuantity?: number;

  @ApiPropertyOptional({ description: 'Maximum order quantity', example: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Maximum order quantity must be at least 1' })
  maxOrderQuantity?: number;

  @ApiPropertyOptional({ description: 'Category number', example: 'CAT001' })
  @IsOptional()
  @IsString()
  productCategoryNumber?: string;

  @ApiPropertyOptional({ description: 'Sale status', example: '판매중' })
  @IsOptional()
  @IsString()
  saleStatus?: string;

  @ApiPropertyOptional({ description: 'Display status', example: '진열함' })
  @IsOptional()
  @IsString()
  displayStatus?: string;

  @ApiPropertyOptional({ description: 'Manufacturer', example: 'ABC Company' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Supplier', example: 'XYZ Supplier' })
  @IsOptional()
  @IsString()
  supplier?: string;

  // Additional optional fields can be added here as needed
  [key: string]: any;
}

// Update Product DTO - all fields optional
export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Product name', example: 'Organic Apple', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128, { message: 'Product name must not exceed 128 characters' })
  productName?: string;

  @ApiPropertyOptional({ description: 'Product code', example: 'PROD001' })
  @IsOptional()
  @IsString()
  productCode?: string;

  @ApiPropertyOptional({ description: 'Brand name', example: 'Juwangsan' })
  @IsOptional()
  @IsString()
  brand?: string;

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

  @ApiPropertyOptional({ description: 'Product price (원)', example: 13000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Product price must be a positive number' })
  productPrice?: number;

  @ApiPropertyOptional({ description: 'Sale price (원)', example: 10000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Sale price must be a positive number' })
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity', example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Minimum order quantity must be at least 1' })
  minOrderQuantity?: number;

  @ApiPropertyOptional({ description: 'Maximum order quantity', example: 100, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Maximum order quantity must be at least 1' })
  maxOrderQuantity?: number;

  @ApiPropertyOptional({ description: 'Category number', example: 'CAT001' })
  @IsOptional()
  @IsString()
  productCategoryNumber?: string;

  @ApiPropertyOptional({ description: 'Sale status', example: '판매중' })
  @IsOptional()
  @IsString()
  saleStatus?: string;

  @ApiPropertyOptional({ description: 'Display status', example: '진열함' })
  @IsOptional()
  @IsString()
  displayStatus?: string;

  @ApiPropertyOptional({ description: 'Manufacturer', example: 'ABC Company' })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Supplier', example: 'XYZ Supplier' })
  @IsOptional()
  @IsString()
  supplier?: string;

  // Additional optional fields
  [key: string]: any;
}

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

  @ApiPropertyOptional({ description: 'Filter by category number', example: 'CAT001' })
  @IsOptional()
  @IsString()
  category?: string;

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
    example: DisplayStatus.DISPLAYED,
  })
  @IsOptional()
  @IsEnum(DisplayStatus, { message: 'Display status must be either "진열함" or "진열안함"' })
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

