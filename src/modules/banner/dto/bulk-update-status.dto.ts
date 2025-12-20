import { IsArray, IsEnum, ArrayNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EBannerStatus } from '../enums/banner.enum';

export class BannerBulkUpdateStatusDto {
  @ApiProperty({
    description: 'Array of banner IDs to update',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'ids array cannot be empty' })
  @IsUUID('4', { each: true, message: 'Each id must be a valid UUID' })
  ids: string[];

  @ApiProperty({
    description: 'New status to apply to all banners',
    enum: EBannerStatus,
    example: EBannerStatus.ACTIVE,
  })
  @IsEnum(EBannerStatus)
  status: EBannerStatus;
}

