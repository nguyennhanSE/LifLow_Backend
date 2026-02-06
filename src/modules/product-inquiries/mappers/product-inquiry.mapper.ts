import { ProductInquiries, Prisma } from '@prisma/client';
import { ProductInquiryEntity } from '../entities/product-inquiry.entity';
import {
  ProductInquiryResponseDto,
  InquiryUserInfoDto,
  InquiryProductInfoDto,
  ProductInquiryAnswerResponseDto,
} from '../dto/product-inquiry-response.dto';
import { createPaginatedResponse, PaginatedResponseDto } from '../../../libs/models/response/paginated-response.dto';

/**
 * Base ProductInquiry type matching Prisma ProductInquiries model structure
 */
type ProductInquiryBase = {
  id: string;
  productId: string;
  authorId: string;
  title: string | null;
  content: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Type for ProductInquiry with User relation
 */
type ProductInquiryWithUser = ProductInquiryBase & {
  user?: {
    id: string;
    name: string;
    email: string | null;
    membershipLevel: string | null;
    avatarURL: string | null;
  } | null;
};

/**
 * Type for ProductInquiry with Product relation
 */
type ProductInquiryWithProduct = ProductInquiryBase & {
  product?: {
    id: string;
    productName: string | null;
    productCode: string | null;
    imageRegistrationThumbnail: string | null;
    salePrice: number | null;
  } | null;
};

/**
 * Type for ProductInquiry with Answers relation
 */
type ProductInquiryWithAnswers = ProductInquiryBase & {
  productInquiryAnswers?: Array<{
    id: string;
    inquiryId: string;
    answer: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

/**
 * Type for ProductInquiry with all relations (User, Product, and Answers)
 */
type ProductInquiryWithRelations = Prisma.ProductInquiriesGetPayload<{
  include: {
    user: true;
    product: true;
    productInquiryAnswers: {
      include: {
        user: true;
      };
    };
  };
}>;

/**
 * ProductInquiryMapper utility class for converting between Prisma models, DTOs, and entities
 */
export class ProductInquiryMapper {
  /**
   * Converts Prisma ProductInquiries model to ProductInquiryEntity
   * @param prismaInquiry - Prisma ProductInquiries model from database
   * @returns ProductInquiryEntity instance
   */
  static toEntity(prismaInquiry: ProductInquiries): ProductInquiryEntity {
    const entity = new ProductInquiryEntity();
    entity.id = prismaInquiry.id;
    entity.productId = prismaInquiry.productId;
    entity.authorId = prismaInquiry.authorId;
    entity.title = prismaInquiry.title;
    entity.content = prismaInquiry.content;
    entity.status = prismaInquiry.status;
    entity.createdAt = prismaInquiry.createdAt;
    entity.updatedAt = prismaInquiry.updatedAt;
    return entity;
  }

  /**
   * Converts Prisma ProductInquiries model with User relation to ProductInquiryEntity
   * @param prismaInquiry - Prisma ProductInquiries model with optional User relation
   * @returns ProductInquiryEntity instance with nested user
   */
  static toEntityWithUser(prismaInquiry: ProductInquiryWithUser): ProductInquiryEntity {
    const entity = this.toEntity(prismaInquiry as ProductInquiries);
    
    // Map user if included
    if (prismaInquiry.user) {
      entity.user = {
        id: prismaInquiry.user.id,
        name: prismaInquiry.user.name,
        email: prismaInquiry.user.email ?? null,
        membershipLevel: prismaInquiry.user.membershipLevel ?? null,
        avatarURL: prismaInquiry.user.avatarURL ?? null,
      } as any;
    } else {
      entity.user = null;
    }
    
    return entity;
  }

  /**
   * Converts Prisma ProductInquiries model with Product relation to ProductInquiryEntity
   * @param prismaInquiry - Prisma ProductInquiries model with optional Product relation
   * @returns ProductInquiryEntity instance with nested product
   */
  static toEntityWithProduct(prismaInquiry: ProductInquiryWithProduct): ProductInquiryEntity {
    const entity = this.toEntity(prismaInquiry as ProductInquiries);
    
    // Map product if included
    if (prismaInquiry.product) {
      entity.product = {
        id: prismaInquiry.product.id,
        productName: prismaInquiry.product.productName ?? null,
        productCode: prismaInquiry.product.productCode ?? null,
        imageRegistrationThumbnail: prismaInquiry.product.imageRegistrationThumbnail ?? null,
        salePrice: prismaInquiry.product.salePrice ?? null,
      } as any;
    } else {
      entity.product = null;
    }
    
    return entity;
  }

  /**
   * Converts Prisma ProductInquiries model with Answers relation to ProductInquiryEntity
   * @param prismaInquiry - Prisma ProductInquiries model with optional Answers relation
   * @returns ProductInquiryEntity instance with nested answers
   */
  static toEntityWithAnswers(prismaInquiry: ProductInquiryWithAnswers): ProductInquiryEntity {
    const entity = this.toEntity(prismaInquiry as ProductInquiries);
    
    // Map answers if included
    if (prismaInquiry.productInquiryAnswers) {
      entity.productInquiryAnswers = prismaInquiry.productInquiryAnswers.map((answer) => ({
        id: answer.id,
        inquiryId: answer.inquiryId,
        answer: answer.answer,
        createdAt: answer.createdAt,
        updatedAt: answer.updatedAt,
      })) as any;
    }
    
    return entity;
  }

  /**
   * Converts Prisma ProductInquiries model with all relations to ProductInquiryEntity
   * @param prismaInquiry - Prisma ProductInquiries model with User, Product, and Answers relations
   * @returns ProductInquiryEntity instance with all nested relations
   */
  static toEntityWithRelations(prismaInquiry: ProductInquiryWithRelations): ProductInquiryEntity {
    const entity = this.toEntity({
      id: prismaInquiry.id,
      productId: prismaInquiry.productId,
      authorId: prismaInquiry.authorId,
      title: prismaInquiry.title,
      content: prismaInquiry.content,
      status: prismaInquiry.status,
      createdAt: prismaInquiry.createdAt,
      updatedAt: prismaInquiry.updatedAt,
    });
    
    // Map user if included
    if (prismaInquiry.user) {
      entity.user = {
        id: prismaInquiry.user.id,
        name: prismaInquiry.user.name,
        email: prismaInquiry.user.email ?? null,
        membershipLevel: prismaInquiry.user.membershipLevel ?? null,
        avatarURL: prismaInquiry.user.avatarURL ?? null,
      } as any;
    } else {
      entity.user = null;
    }
    
    // Map product if included
    if (prismaInquiry.product) {
      entity.product = {
        id: prismaInquiry.product.id,
        productName: prismaInquiry.product.productName ?? null,
        productCode: prismaInquiry.product.productCode ?? null,
        imageRegistrationThumbnail: prismaInquiry.product.imageRegistrationThumbnail ?? null,
        salePrice: prismaInquiry.product.salePrice ?? null,
        imageRegistrationDetail: prismaInquiry.product.imageRegistrationDetail ?? null,
      } as any;
    } else {
      entity.product = null;
    }

    // Map answers if included
    if (prismaInquiry.productInquiryAnswers) {
      entity.productInquiryAnswers = prismaInquiry.productInquiryAnswers.map((answer) => {
        const answerEntity: any = {
          id: answer.id,
          inquiryId: answer.inquiryId,
          answer: answer.answer,
          createdAt: answer.createdAt,
          updatedAt: answer.updatedAt,
        };
        
        // Map user if included
        if (answer.user) {
          answerEntity.user = {
            id: answer.user.id,
            name: answer.user.name,
            email: answer.user.email ?? null,
            membershipLevel: answer.user.membershipLevel ?? null,
            avatarURL: answer.user.avatarURL ?? null,
          };
        } else {
          answerEntity.user = null;
        }
        
        return answerEntity;
      }) as any;
    }
    
    return entity;
  }

  /**
   * Converts ProductInquiryEntity to ProductInquiryResponseDto
   * @param entity - ProductInquiryEntity instance
   * @returns ProductInquiryResponseDto for API response
   */
  static toResponseDto(entity: ProductInquiryEntity): ProductInquiryResponseDto {
    const dto = new ProductInquiryResponseDto();
    dto.id = entity.id;
    dto.productId = entity.productId;
    dto.authorId = entity.authorId;
    dto.title = entity.title;
    dto.content = entity.content;
    dto.status = entity.status ?? null;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    
    // Map user if present
    if (entity.user) {
      const userInfo = new InquiryUserInfoDto();
      userInfo.id = entity.user.id;
      userInfo.name = entity.user.name;
      userInfo.email = entity.user.email ?? null;
      userInfo.membershipLevel = entity.user.membershipLevel ?? null;
      userInfo.avatarUrl = (entity.user as any).avatarURL ?? null;
      dto.user = userInfo;
    } else {
      dto.user = null;
    }
    
    // Map product if present
    if (entity.product) {
      const productInfo = new InquiryProductInfoDto();
      productInfo.id = entity.product.id;
      productInfo.productName = entity.product.productName ?? null;
      productInfo.productCode = entity.product.productCode ?? null;
      productInfo.imageRegistrationThumbnail = entity.product.imageRegistrationThumbnail ?? null;
      productInfo.imageRegistrationDetail = entity.product.imageRegistrationDetail ?? null;
      productInfo.salePrice = entity.product.salePrice ?? null;
      dto.product = productInfo;
    } else {
      dto.product = null;
    }
    
    // Map answers if present
    if (entity.productInquiryAnswers) {
      dto.productInquiryAnswers = entity.productInquiryAnswers.map((answer) => {
        const answerDto = new ProductInquiryAnswerResponseDto();
        answerDto.id = answer.id;
        answerDto.inquiryId = answer.inquiryId;
        answerDto.answer = answer.answer;
        answerDto.createdAt = answer.createdAt;
        answerDto.updatedAt = answer.updatedAt;
        
        // Map user if present
        if (answer.user) {
          const userInfo = new InquiryUserInfoDto();
          userInfo.id = answer.user.id;
          userInfo.name = answer.user.name;
          userInfo.email = answer.user.email ?? null;
          userInfo.membershipLevel = answer.user.membershipLevel ?? null;
          userInfo.avatarUrl = (answer.user as any).avatarURL ?? null;
          answerDto.user = userInfo;
        } else {
          answerDto.user = null;
        }
        
        return answerDto;
      });
    }
    
    return dto;
  }

  /**
   * Converts array of ProductInquiryEntity instances to ProductInquiryResponseDto array
   * @param entities - Array of ProductInquiryEntity instances
   * @returns Array of ProductInquiryResponseDto for API response
   */
  static toResponseDtoList(entities: ProductInquiryEntity[]): ProductInquiryResponseDto[] {
    return entities.map((entity) => this.toResponseDto(entity));
  }

  /**
   * Converts Prisma ProductInquiries model directly to ProductInquiryResponseDto
   * @param prismaInquiry - Prisma ProductInquiries model
   * @returns ProductInquiryResponseDto for API response
   */
  static prismaToResponseDto(prismaInquiry: ProductInquiries): ProductInquiryResponseDto {
    const entity = this.toEntity(prismaInquiry);
    return this.toResponseDto(entity);
  }

  /**
   * Converts Prisma ProductInquiries model with relations directly to ProductInquiryResponseDto
   * @param prismaInquiry - Prisma ProductInquiries model with optional relations
   * @returns ProductInquiryResponseDto for API response
   */
  static prismaToResponseDtoWithRelations(prismaInquiry: ProductInquiryWithRelations): ProductInquiryResponseDto {
    const entity = this.toEntityWithRelations(prismaInquiry);
    return this.toResponseDto(entity);
  }

  /**
   * Converts array of Prisma ProductInquiries models directly to ProductInquiryResponseDto array
   * @param prismaInquiries - Array of Prisma ProductInquiries models
   * @returns Array of ProductInquiryResponseDto for API response
   */
  static prismaToResponseDtoList(prismaInquiries: ProductInquiries[]): ProductInquiryResponseDto[] {
    return prismaInquiries.map((inquiry) => this.prismaToResponseDto(inquiry));
  }

  /**
   * Converts array of Prisma ProductInquiries models with relations directly to ProductInquiryResponseDto array
   * @param prismaInquiries - Array of Prisma ProductInquiries models with optional relations
   * @returns Array of ProductInquiryResponseDto for API response
   */
  static prismaToResponseDtoListWithRelations(prismaInquiries: ProductInquiryWithRelations[]): ProductInquiryResponseDto[] {
    return prismaInquiries.map((inquiry) => this.prismaToResponseDtoWithRelations(inquiry));
  }

  /**
   * Converts array of ProductInquiryEntity to paginated response
   * @param entities - Array of ProductInquiryEntity instances
   * @param total - Total number of inquiries
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns PaginatedResponseDto with ProductInquiryResponseDto items
   */
  static toListResponseDto(
    entities: ProductInquiryEntity[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<ProductInquiryResponseDto> {
    const dtos = this.toResponseDtoList(entities);
    return createPaginatedResponse(dtos, total, page, limit);
  }

  /**
   * Converts array of Prisma ProductInquiries models to paginated response
   * @param prismaInquiries - Array of Prisma ProductInquiries models
   * @param total - Total number of inquiries
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns PaginatedResponseDto with ProductInquiryResponseDto items
   */
  static prismaToListResponseDto(
    prismaInquiries: ProductInquiries[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<ProductInquiryResponseDto> {
    const entities = prismaInquiries.map((inquiry) => this.toEntity(inquiry));
    return this.toListResponseDto(entities, total, page, limit);
  }

  /**
   * Converts array of Prisma ProductInquiries models with relations to paginated response
   * @param prismaInquiries - Array of Prisma ProductInquiries models with optional relations
   * @param total - Total number of inquiries
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns PaginatedResponseDto with ProductInquiryResponseDto items
   */
  static prismaToListResponseDtoWithRelations(
    prismaInquiries: ProductInquiryWithRelations[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponseDto<ProductInquiryResponseDto> {
    const entities = prismaInquiries.map((inquiry) => this.toEntityWithRelations(inquiry));
    return this.toListResponseDto(entities, total, page, limit);
  }
}

