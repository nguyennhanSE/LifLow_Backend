import {
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsUUID,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BannerOrderItem {
  @ApiProperty({
    description: 'Banner ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID('4', { message: 'id must be a valid UUID' })
  id: string;

  @ApiProperty({
    description: 'New display order (lower numbers appear first)',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  displayOrder: number;
}

export class ReorderBannersDto {
  @ApiProperty({
    description: 'Array of banner IDs with their new display orders',
    type: [BannerOrderItem],
    example: [
      { id: '123e4567-e89b-12d3-a456-426614174000', displayOrder: 0 },
      { id: '123e4567-e89b-12d3-a456-426614174001', displayOrder: 1 },
    ],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'bannerOrders array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => BannerOrderItem)
  bannerOrders: BannerOrderItem[];
}

