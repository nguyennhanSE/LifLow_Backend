import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { CreateProductInquiryDto } from '../dto/create-product-inquiry.dto';
import { UpdateProductInquiryDto } from '../dto/update-product-inquiry.dto';
import { QueryProductInquiriesDto } from '../dto/query-product-inquiries.dto';
import { ProductInquiriesRepository } from '../repositories/product-inquiries.repository';
import { ProductInquiryMapper } from '../mappers/product-inquiry.mapper';
import {
  ProductInquiryResponseDto,
} from '../dto/product-inquiry-response.dto';
import { PaginatedResponseDto } from '../../../libs/models/response/paginated-response.dto';

/**
 * Service for managing product inquiries
 * Handles business logic and validation for product inquiries
 */
@Injectable()
export class ProductInquiriesService {
  private readonly logger = new Logger(ProductInquiriesService.name);

  constructor(
    private readonly productInquiriesRepository: ProductInquiriesRepository,
  ) {}

  /**
   * Create a new product inquiry
   * Validates that the product and user exist
   * @param createDto - Data for creating the inquiry
   * @returns Created inquiry with relations
   */
  async create(
    createDto: CreateProductInquiryDto,
  ): Promise<ProductInquiryResponseDto> {
    try {
      this.logger.log(
        `Creating inquiry for product ${createDto.productId} by user ${createDto.authorId}`,
      );

      // Validate title and content
      if (createDto.title.trim().length === 0) {
        throw new BadRequestException('Title cannot be empty');
      }
      if (createDto.content.trim().length === 0) {
        throw new BadRequestException('Content cannot be empty');
      }

      // Create the inquiry (repository handles product/user existence validation)
      const inquiryEntity = await this.productInquiriesRepository.create(createDto);

      // Convert to response DTO
      const responseDto = ProductInquiryMapper.toResponseDto(inquiryEntity);

      this.logger.log(`Inquiry created successfully: ID=${inquiryEntity.id}`);
      return responseDto;
    } catch (error) {
      this.logger.error(
        `Failed to create inquiry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all product inquiries with filtering and pagination
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Paginated list of inquiries
   */
  async findAll(
    queryDto: QueryProductInquiriesDto,
  ): Promise<PaginatedResponseDto<ProductInquiryResponseDto>> {
    try {
      this.logger.log('Fetching product inquiries with filters');

      // Set defaults
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit ?? 10;
      const sortBy = queryDto.sortBy ?? 'createdAt';
      const sortOrder = queryDto.sortOrder ?? 'desc';

      const query: QueryProductInquiriesDto = {
        ...queryDto,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      // Get inquiries from repository
      const { data, total } = await this.productInquiriesRepository.findAll(query);

      // Convert to paginated response
      return ProductInquiryMapper.toListResponseDto(data, total, page, limit);
    } catch (error) {
      this.logger.error(
        `Failed to fetch inquiries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find a single product inquiry by ID
   * @param id - Inquiry ID
   * @returns Inquiry with relations
   */
  async findOne(id: string): Promise<ProductInquiryResponseDto> {
    try {
      this.logger.log(`Fetching inquiry by ID: ${id}`);

      const inquiryEntity = await this.productInquiriesRepository.findOne(id);

      if (!inquiryEntity) {
        throw new NotFoundException(`Inquiry with ID ${id} not found`);
      }

      return ProductInquiryMapper.toResponseDto(inquiryEntity);
    } catch (error) {
      this.logger.error(
        `Failed to fetch inquiry ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all inquiries for a specific product
   * @param productId - Product ID
   * @param queryDto - Optional query parameters for filtering
   * @returns Array of inquiries for the product
   */
  async findByProduct(
    productId: string,
    queryDto?: Partial<QueryProductInquiriesDto>,
  ): Promise<ProductInquiryResponseDto[]> {
    try {
      this.logger.log(`Fetching inquiries for product: ${productId}`);

      const inquiryEntities = await this.productInquiriesRepository.findByProductId(
        productId,
        queryDto,
      );

      return inquiryEntities.map((entity) =>
        ProductInquiryMapper.toResponseDto(entity),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch inquiries for product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all inquiries by a specific user
   * @param authorId - User ID who authored the inquiries
   * @returns Array of inquiries by the user
   */
  async findByUser(authorId: string): Promise<ProductInquiryResponseDto[]> {
    try {
      this.logger.log(`Fetching inquiries by user: ${authorId}`);

      const inquiryEntities = await this.productInquiriesRepository.findByAuthorId(
        authorId,
      );

      return inquiryEntities.map((entity) =>
        ProductInquiryMapper.toResponseDto(entity),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch inquiries by user ${authorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Update a product inquiry
   * Verifies that the user owns the inquiry before updating
   * @param id - Inquiry ID
   * @param updateDto - Data to update
   * @param userId - ID of the user making the request
   * @returns Updated inquiry
   */
  async update(
    id: string,
    updateDto: UpdateProductInquiryDto,
    userId: string,
  ): Promise<ProductInquiryResponseDto> {
    try {
      this.logger.log(`Updating inquiry ${id} by user ${userId}`);

      // Verify inquiry exists
      const existingInquiry = await this.productInquiriesRepository.findOne(id);

      if (!existingInquiry) {
        throw new NotFoundException(`Inquiry with ID ${id} not found`);
      }

      // Verify ownership - only the author can update their inquiry
      if (existingInquiry.authorId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to update this inquiry',
        );
      }

      // Validate title and content if provided
      if (updateDto.title !== undefined) {
        if (updateDto.title.trim().length === 0) {
          throw new BadRequestException('Title cannot be empty');
        }
      }
      if (updateDto.content !== undefined) {
        if (updateDto.content.trim().length === 0) {
          throw new BadRequestException('Content cannot be empty');
        }
      }

      // Update the inquiry
      const updatedEntity = await this.productInquiriesRepository.update(
        id,
        updateDto,
      );

      this.logger.log(`Inquiry updated successfully: ID=${id}`);
      return ProductInquiryMapper.toResponseDto(updatedEntity);
    } catch (error) {
      this.logger.error(
        `Failed to update inquiry ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete a product inquiry
   * Verifies that the user owns the inquiry before deleting
   * Cascade deletes all associated answers
   * @param id - Inquiry ID
   * @param userId - ID of the user making the request
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting inquiry ${id} by user ${userId}`);

      // Verify inquiry exists
      const existingInquiry = await this.productInquiriesRepository.findOne(id);

      if (!existingInquiry) {
        throw new NotFoundException(`Inquiry with ID ${id} not found`);
      }

      // Verify ownership - only the author can delete their inquiry
      if (existingInquiry.authorId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to delete this inquiry',
        );
      }

      // Delete the inquiry (cascade deletes answers via Prisma schema)
      await this.productInquiriesRepository.delete(id);

      this.logger.log(`Inquiry deleted successfully: ID=${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete inquiry ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get product inquiry statistics
   * @param productId - Product ID
   * @returns Object with total inquiries and answered count
   */
  async getProductStats(productId: string): Promise<{
    totalInquiries: number;
    answeredInquiries: number;
    unansweredInquiries: number;
  }> {
    try {
      this.logger.log(`Fetching inquiry stats for product: ${productId}`);

      const stats = await this.productInquiriesRepository.getProductInquiryStats(
        productId,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to fetch stats for product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get unanswered inquiries for a product
   * Useful for admins to prioritize responses
   * @param productId - Product ID
   * @returns Array of unanswered inquiries
   */
  async getUnansweredInquiries(
    productId: string,
  ): Promise<ProductInquiryResponseDto[]> {
    try {
      this.logger.log(`Fetching unanswered inquiries for product: ${productId}`);

      const inquiryEntities = await this.productInquiriesRepository.getUnansweredInquiries(
        productId,
      );

      return inquiryEntities.map((entity) =>
        ProductInquiryMapper.toResponseDto(entity),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch unanswered inquiries for product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get inquiry count for a product
   * @param productId - Product ID
   * @returns Number of inquiries
   */
  async getInquiryCount(productId: string): Promise<number> {
    try {
      return await this.productInquiriesRepository.getInquiryCount(productId);
    } catch (error) {
      this.logger.error(
        `Failed to get inquiry count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Check if an inquiry has answers
   * @param inquiryId - Inquiry ID
   * @returns true if inquiry has at least one answer
   */
  async hasAnswer(inquiryId: string): Promise<boolean> {
    try {
      return await this.productInquiriesRepository.checkHasAnswer(inquiryId);
    } catch (error) {
      this.logger.error(
        `Failed to check if inquiry has answer: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
