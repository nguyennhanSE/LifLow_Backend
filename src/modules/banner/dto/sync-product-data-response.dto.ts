import { ApiProperty } from '@nestjs/swagger';

export class SyncProductDataResponseDto {
  @ApiProperty({
    description: 'Number of banners synced successfully',
    example: 15,
  })
  synced!: number;

  @ApiProperty({
    description: 'Number of banners that failed to sync',
    example: 0,
  })
  failed!: number;

  @ApiProperty({
    description: 'Array of banner IDs that were synced',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  bannerIds!: string[];

  @ApiProperty({
    description: 'Success message',
    example: 'Synced 15 banner(s), 0 failed',
  })
  message!: string;
}

