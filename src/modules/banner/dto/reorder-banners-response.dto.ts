import { ApiProperty } from '@nestjs/swagger';

export class ReorderBannersResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Banners reordered successfully',
  })
  message!: string;
}

