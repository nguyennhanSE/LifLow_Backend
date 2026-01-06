import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Basic inquiry information included in answer response
 */
export class AnswerInquiryInfoDto {
  @ApiProperty({ description: 'Inquiry ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  id!: string;

  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  productId!: string;

  @ApiProperty({ description: 'Author ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  authorId!: string;

  @ApiProperty({ description: 'Inquiry title', example: 'Question about product ingredients' })
  title!: string;

  @ApiProperty({ description: 'Inquiry content', example: 'Is this product suitable for vegetarians?' })
  content!: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;
}

/**
 * Product inquiry answer response DTO with nested inquiry information
 */
export class ProductInquiryAnswerStandaloneResponseDto {
  @ApiProperty({ description: 'Answer ID', example: '123e4567-e89b-12d3-a456-426614174003' })
  id!: string;

  @ApiProperty({ description: 'Inquiry ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  inquiryId!: string;

  @ApiProperty({ description: 'Answer content text', example: 'Yes, this product is 100% vegetarian.' })
  answer!: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Inquiry information',
    type: AnswerInquiryInfoDto,
  })
  productInquiry?: AnswerInquiryInfoDto | null;
}

