import { ApiProperty } from '@nestjs/swagger';
import { BannerEntity } from '../entities/banner.entity';

export class PaginatedBannerResponseDto {
  @ApiProperty({
    description: 'Array of banners in the current page',
    type: [BannerEntity],
  })
  data!: BannerEntity[];

  @ApiProperty({
    description: 'Total number of banners',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 10,
  })
  totalPages!: number;
}

