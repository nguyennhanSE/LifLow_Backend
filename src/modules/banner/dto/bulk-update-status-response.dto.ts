import { ApiProperty } from '@nestjs/swagger';

export class BulkUpdateStatusResponseDto {
  @ApiProperty({
    description: 'Number of banners updated',
    example: 3,
  })
  updated!: number;

  @ApiProperty({
    description: 'Success message',
    example: 'Successfully updated 3 banners',
  })
  message!: string;
}

