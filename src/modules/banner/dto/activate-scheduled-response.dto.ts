import { ApiProperty } from '@nestjs/swagger';

export class ActivateScheduledResponseDto {
  @ApiProperty({
    description: 'Number of banners activated',
    example: 3,
  })
  activated!: number;

  @ApiProperty({
    description: 'Array of banner IDs that were activated',
    type: [String],
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '123e4567-e89b-12d3-a456-426614174001',
    ],
  })
  bannerIds!: string[];

  @ApiProperty({
    description: 'Success message',
    example: 'Activated 3 scheduled banner(s)',
  })
  message!: string;
}

