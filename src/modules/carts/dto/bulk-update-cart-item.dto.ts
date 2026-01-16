import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ValidateNested, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateCartItemDto } from './update-cart-item.dto';

export class BulkUpdateCartItemDto {
  @ApiProperty({
    description: 'Cart item ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'Cart item ID must be a valid UUID' })
  id!: string;

  @ApiProperty({
    description: 'Update data for the cart item',
    type: UpdateCartItemDto,
  })
  @ValidateNested()
  @Type(() => UpdateCartItemDto)
  data!: UpdateCartItemDto;
}

export class BulkUpdateCartItemsDto {
  @ApiProperty({
    description: 'Array of cart items to update',
    type: [BulkUpdateCartItemDto],
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        data: { quantity: 3 },
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        data: { quantity: 2 },
      },
    ],
  })
  @IsArray({ message: 'Items must be an array' })
  @ArrayNotEmpty({ message: 'Items array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateCartItemDto)
  items!: BulkUpdateCartItemDto[];
}

