import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Basic user information included in product inquiry response
 */
export class InquiryUserInfoDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  name!: string;

  @ApiPropertyOptional({ description: 'User email', example: 'john.doe@example.com' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Membership level', example: 'GOLD' })
  membershipLevel?: string | null;
}

/**
 * Basic product information included in product inquiry response
 */
export class InquiryProductInfoDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  id!: string;

  @ApiPropertyOptional({ description: 'Product name', example: 'Organic Apple' })
  productName?: string | null;

  @ApiPropertyOptional({ description: 'Product code', example: 'PROD001' })
  productCode?: string | null;

  @ApiPropertyOptional({ description: 'Product image URL', example: 'https://example.com/image.jpg' })
  imageRegistrationThumbnail?: string | null;

  @ApiPropertyOptional({ description: 'Current sale price', example: 29000 })
  salePrice?: number | null;
}

/**
 * Product inquiry answer response DTO
 */
export class ProductInquiryAnswerResponseDto {
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
}

/**
 * Product inquiry response DTO with nested user, product, and answers information
 */
export class ProductInquiryResponseDto {
  @ApiProperty({ description: 'Inquiry ID', example: '123e4567-e89b-12d3-a456-426614174002' })
  id!: string;

  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174001' })
  productId!: string;

  @ApiProperty({ description: 'Author ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  authorId!: string;

  @ApiProperty({ description: 'Inquiry title', example: 'Question about product ingredients' })
  title!: string;

  @ApiProperty({ description: 'Inquiry content text', example: 'Is this product suitable for vegetarians?' })
  content!: string;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'User information (author of the inquiry)',
    type: InquiryUserInfoDto,
  })
  user?: InquiryUserInfoDto | null;

  @ApiPropertyOptional({
    description: 'Product information',
    type: InquiryProductInfoDto,
  })
  product?: InquiryProductInfoDto | null;

  @ApiPropertyOptional({
    description: 'Answers to this inquiry',
    type: [ProductInquiryAnswerResponseDto],
  })
  productInquiryAnswers?: ProductInquiryAnswerResponseDto[];
}

