import { ApiProperty } from '@nestjs/swagger';

export class DeactivateExpiredResponseDto {
  @ApiProperty({
    description: 'Number of banners deactivated',
    example: 2,
  })
  deactivated!: number;

  @ApiProperty({
    description: 'Array of banner IDs that were deactivated',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  bannerIds!: string[];

  @ApiProperty({
    description: 'Success message',
    example: 'Deactivated 2 expired banner(s)',
  })
  message!: string;
}

