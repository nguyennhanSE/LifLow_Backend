import { ApiProperty } from '@nestjs/swagger';

export class DeleteBannerResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Banner deleted successfully',
  })
  message!: string;
}

