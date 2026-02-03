import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class BulkDeleteCartItemsDto {
  @ApiProperty({
    description: 'Array of cart item IDs to delete',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  @IsArray({ message: 'Item IDs must be an array' })
  @ArrayNotEmpty({ message: 'Item IDs array cannot be empty' })
  @IsUUID('4', { each: true, message: 'Each cart item ID must be a valid UUID' })
  cartItemIds!: string[];
}
