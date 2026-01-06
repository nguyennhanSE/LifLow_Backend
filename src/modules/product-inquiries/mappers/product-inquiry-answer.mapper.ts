import { ProductInquiryAnswers, Prisma } from '@prisma/client';
import { ProductInquiryAnswerEntity } from '../entities/product-inquiry-answer.entity';
import {
  ProductInquiryAnswerStandaloneResponseDto,
  AnswerInquiryInfoDto,
} from '../dto/product-inquiry-answer-response.dto';
import { ProductInquiryAnswerResponseDto } from '../dto/product-inquiry-response.dto';

/**
 * Base ProductInquiryAnswer type matching Prisma ProductInquiryAnswers model structure
 */
type ProductInquiryAnswerBase = {
  id: string;
  inquiryId: string;
  answer: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type for ProductInquiryAnswer with Inquiry relation
 */
type ProductInquiryAnswerWithInquiry = Prisma.ProductInquiryAnswersGetPayload<{
  include: {
    productInquiry: true;
  };
}>;

/**
 * ProductInquiryAnswerMapper utility class for converting between Prisma models, DTOs, and entities
 */
export class ProductInquiryAnswerMapper {
  /**
   * Converts Prisma ProductInquiryAnswers model to ProductInquiryAnswerEntity
   * @param prismaAnswer - Prisma ProductInquiryAnswers model from database
   * @returns ProductInquiryAnswerEntity instance
   */
  static toEntity(prismaAnswer: ProductInquiryAnswers): ProductInquiryAnswerEntity {
    const entity = new ProductInquiryAnswerEntity();
    entity.id = prismaAnswer.id;
    entity.inquiryId = prismaAnswer.inquiryId;
    entity.answer = prismaAnswer.answer;
    entity.createdAt = prismaAnswer.createdAt;
    entity.updatedAt = prismaAnswer.updatedAt;
    return entity;
  }

  /**
   * Converts Prisma ProductInquiryAnswers model with Inquiry relation to ProductInquiryAnswerEntity
   * @param prismaAnswer - Prisma ProductInquiryAnswers model with optional Inquiry relation
   * @returns ProductInquiryAnswerEntity instance with nested inquiry
   */
  static toEntityWithInquiry(prismaAnswer: ProductInquiryAnswerWithInquiry): ProductInquiryAnswerEntity {
    const entity = this.toEntity(prismaAnswer);
    
    // Map inquiry if included
    if (prismaAnswer.productInquiry) {
      entity.productInquiry = {
        id: prismaAnswer.productInquiry.id,
        productId: prismaAnswer.productInquiry.productId,
        authorId: prismaAnswer.productInquiry.authorId,
        title: prismaAnswer.productInquiry.title,
        content: prismaAnswer.productInquiry.content,
        createdAt: prismaAnswer.productInquiry.createdAt,
        updatedAt: prismaAnswer.productInquiry.updatedAt,
      } as any;
    } else {
      entity.productInquiry = null;
    }
    
    return entity;
  }

  /**
   * Converts ProductInquiryAnswerEntity to ProductInquiryAnswerResponseDto (simple version)
   * Used when answers are nested within inquiry responses
   * @param entity - ProductInquiryAnswerEntity instance
   * @returns ProductInquiryAnswerResponseDto for API response
   */
  static toResponseDto(entity: ProductInquiryAnswerEntity): ProductInquiryAnswerResponseDto {
    const dto = new ProductInquiryAnswerResponseDto();
    dto.id = entity.id;
    dto.inquiryId = entity.inquiryId;
    dto.answer = entity.answer;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  /**
   * Converts ProductInquiryAnswerEntity to ProductInquiryAnswerStandaloneResponseDto
   * Used when answers are queried independently with inquiry information
   * @param entity - ProductInquiryAnswerEntity instance
   * @returns ProductInquiryAnswerStandaloneResponseDto for API response
   */
  static toStandaloneResponseDto(entity: ProductInquiryAnswerEntity): ProductInquiryAnswerStandaloneResponseDto {
    const dto = new ProductInquiryAnswerStandaloneResponseDto();
    dto.id = entity.id;
    dto.inquiryId = entity.inquiryId;
    dto.answer = entity.answer;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    
    // Map inquiry info if present
    if (entity.productInquiry) {
      const inquiryInfo = new AnswerInquiryInfoDto();
      inquiryInfo.id = entity.productInquiry.id;
      inquiryInfo.productId = entity.productInquiry.productId;
      inquiryInfo.authorId = entity.productInquiry.authorId;
      inquiryInfo.title = entity.productInquiry.title;
      inquiryInfo.content = entity.productInquiry.content;
      inquiryInfo.createdAt = entity.productInquiry.createdAt;
      dto.productInquiry = inquiryInfo;
    } else {
      dto.productInquiry = null;
    }
    
    return dto;
  }

  /**
   * Converts array of ProductInquiryAnswerEntity instances to ProductInquiryAnswerResponseDto array
   * @param entities - Array of ProductInquiryAnswerEntity instances
   * @returns Array of ProductInquiryAnswerResponseDto for API response
   */
  static toResponseDtoList(entities: ProductInquiryAnswerEntity[]): ProductInquiryAnswerResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }

  /**
   * Converts array of ProductInquiryAnswerEntity instances to ProductInquiryAnswerStandaloneResponseDto array
   * @param entities - Array of ProductInquiryAnswerEntity instances
   * @returns Array of ProductInquiryAnswerStandaloneResponseDto for API response
   */
  static toStandaloneResponseDtoList(entities: ProductInquiryAnswerEntity[]): ProductInquiryAnswerStandaloneResponseDto[] {
    return entities.map((entity) => this.toStandaloneResponseDto(entity));
  }

  /**
   * Converts Prisma ProductInquiryAnswers model directly to ProductInquiryAnswerResponseDto
   * @param prismaAnswer - Prisma ProductInquiryAnswers model
   * @returns ProductInquiryAnswerResponseDto for API response
   */
  static prismaToResponseDto(prismaAnswer: ProductInquiryAnswers): ProductInquiryAnswerResponseDto {
    const entity = this.toEntity(prismaAnswer);
    return this.toResponseDto(entity);
  }

  /**
   * Converts Prisma ProductInquiryAnswers model directly to ProductInquiryAnswerStandaloneResponseDto
   * @param prismaAnswer - Prisma ProductInquiryAnswers model
   * @returns ProductInquiryAnswerStandaloneResponseDto for API response
   */
  static prismaToStandaloneResponseDto(prismaAnswer: ProductInquiryAnswers): ProductInquiryAnswerStandaloneResponseDto {
    const entity = this.toEntity(prismaAnswer);
    return this.toStandaloneResponseDto(entity);
  }

  /**
   * Converts Prisma ProductInquiryAnswers model with Inquiry relation directly to ProductInquiryAnswerStandaloneResponseDto
   * @param prismaAnswer - Prisma ProductInquiryAnswers model with optional Inquiry relation
   * @returns ProductInquiryAnswerStandaloneResponseDto for API response
   */
  static prismaToStandaloneResponseDtoWithInquiry(prismaAnswer: ProductInquiryAnswerWithInquiry): ProductInquiryAnswerStandaloneResponseDto {
    const entity = this.toEntityWithInquiry(prismaAnswer);
    return this.toStandaloneResponseDto(entity);
  }

  /**
   * Converts array of Prisma ProductInquiryAnswers models directly to ProductInquiryAnswerResponseDto array
   * @param prismaAnswers - Array of Prisma ProductInquiryAnswers models
   * @returns Array of ProductInquiryAnswerResponseDto for API response
   */
  static prismaToResponseDtoList(prismaAnswers: ProductInquiryAnswers[]): ProductInquiryAnswerResponseDto[] {
    return prismaAnswers.map((answer) => this.prismaToResponseDto(answer));
  }

  /**
   * Converts array of Prisma ProductInquiryAnswers models directly to ProductInquiryAnswerStandaloneResponseDto array
   * @param prismaAnswers - Array of Prisma ProductInquiryAnswers models
   * @returns Array of ProductInquiryAnswerStandaloneResponseDto for API response
   */
  static prismaToStandaloneResponseDtoList(prismaAnswers: ProductInquiryAnswers[]): ProductInquiryAnswerStandaloneResponseDto[] {
    return prismaAnswers.map((answer) => this.prismaToStandaloneResponseDto(answer));
  }

  /**
   * Converts array of Prisma ProductInquiryAnswers models with Inquiry relations directly to ProductInquiryAnswerStandaloneResponseDto array
   * @param prismaAnswers - Array of Prisma ProductInquiryAnswers models with optional Inquiry relations
   * @returns Array of ProductInquiryAnswerStandaloneResponseDto for API response
   */
  static prismaToStandaloneResponseDtoListWithInquiry(prismaAnswers: ProductInquiryAnswerWithInquiry[]): ProductInquiryAnswerStandaloneResponseDto[] {
    return prismaAnswers.map((answer) => this.prismaToStandaloneResponseDtoWithInquiry(answer));
  }
}

