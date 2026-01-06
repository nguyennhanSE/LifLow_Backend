import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new cart item
 */
export class CreateCartItemDto {
  @ApiProperty({
    description: 'Product ID to add to the cart',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({
    description: 'Quantity of the product to add',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;

  @ApiProperty({
    description: 'Sale price of the product at the time of adding to cart (in KRW)',
    example: 29000,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Sale price must be a number' })
  @IsNotEmpty({ message: 'Sale price is required' })
  @Min(0, { message: 'Sale price must be 0 or greater' })
  salePrice!: number;
}

