import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ECartStatus } from '../enums/cart.enum';

/**
 * Basic user information included in cart response
 */
export class CartUserInfoDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name!: string;

  @ApiPropertyOptional({ description: 'User email', example: 'john.doe@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'User phone number', example: '010-1234-5678' })
  phoneNumber?: string | null;
}

/**
 * Basic product information included in cart item response
 */
export class CartItemProductInfoDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  id!: string;

  @ApiPropertyOptional({ description: 'Product name', example: 'Organic Apple' })
  productName?: string | null;

  @ApiPropertyOptional({ description: 'Product code', example: 'PROD001' })
  productCode?: string | null;

  @ApiPropertyOptional({ description: 'Current sale price', example: 29000 })
  salePrice?: number | null;

  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://example.com/image.jpg' })
  imageRegistrationThumbnail?: string | null;
}

/**
 * Cart item response DTO
 */
export class CartItemResponseDto {
  @ApiProperty({ description: 'Cart item ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  id!: string;

  @ApiProperty({ description: 'Cart ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  cartId!: string;

  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  productId!: string;

  @ApiProperty({ description: 'Quantity of the product', example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Sale price at the time item was added to cart', example: 29000 })
  salePrice!: number;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Product information',
    type: CartItemProductInfoDto,
  })
  product?: CartItemProductInfoDto | null;
}

/**
 * Cart response DTO with nested items and user information
 */
export class CartResponseDto {
  @ApiProperty({ description: 'Cart ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'User ID that owns this cart', example: '123e4567-e89b-12d3-a456-426614174000' })
  userId!: string;

  @ApiProperty({
    description: 'Cart status',
    enum: ECartStatus,
    example: ECartStatus.ACTIVE,
  })
  status!: ECartStatus;

  @ApiProperty({ description: 'Total amount of all items in the cart (in KRW)', example: 58000 })
  totalAmount!: number;

  @ApiPropertyOptional({ description: 'Timestamp when the cart was checked out' })
  checkedOutAt?: Date | null;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'User information',
    type: CartUserInfoDto,
  })
  user?: CartUserInfoDto | null;

  @ApiPropertyOptional({
    description: 'Array of cart items',
    type: [CartItemResponseDto],
  })
  cartItems?: CartItemResponseDto[] | null;
}

