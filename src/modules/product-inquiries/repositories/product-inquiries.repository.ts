import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, ProductInquiries } from '@prisma/client';
import { CreateProductInquiryDto } from '../dto/create-product-inquiry.dto';
import { UpdateProductInquiryDto } from '../dto/update-product-inquiry.dto';
import { QueryProductInquiriesDto } from '../dto/query-product-inquiries.dto';
import { ProductInquiryEntity } from '../entities/product-inquiry.entity';
import { ProductInquiryMapper } from '../mappers/product-inquiry.mapper';

/**
 * Type for ProductInquiry with all relations
 */
export type ProductInquiryWithRelations = Prisma.ProductInquiriesGetPayload<{
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
 * Repository for ProductInquiries entity
 * Handles all database operations for product inquiries
 */
@Injectable()
export class ProductInquiriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(): Promise<{
    total: number;
    pending: number;
    completed: number;
  }> {
    const [total, pending, completed] = await Promise.all([
      this.prisma.productInquiries.count(),
      this.prisma.productInquiries.count({ where: { status: 'pending' } }),
      this.prisma.productInquiries.count({ where: { status: 'completed' } }),
    ]);

    return { total, pending, completed };
  }

  /**
   * Create a new product inquiry
   * @param createDto - Data for creating the inquiry
   * @returns Created ProductInquiryEntity with relations
   */
  async create(createDto: any): Promise<ProductInquiryEntity> {
    try {
      // Verify product exists
      const product = await this.prisma.product.findUnique({
        where: { id: createDto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${createDto.productId} not found`);
      }

      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createDto.authorId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${createDto.authorId} not found`);
      }

      // Create the inquiry with relations
      const inquiry = await this.prisma.productInquiries.create({
        data: {
          productId: createDto.productId,
          authorId: createDto.authorId,
          title: createDto.title,
          content: createDto.content,
        },
        include: {
          user: true,
          product: true,
          productInquiryAnswers: {
            include: {
              user: true,
            },
          },
        },
      });

      return ProductInquiryMapper.toEntityWithRelations(inquiry);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('An inquiry with this configuration already exists');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Product or User not found');
        }
      }
      throw error;
    }
  }

  /**
   * Find all product inquiries with filtering and pagination
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Object with data array and total count
   */
  async findAll(
    queryDto: QueryProductInquiriesDto,
  ): Promise<{ data: ProductInquiryEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      productId,
      authorId,
      hasAnswer,
      status,
      search,
    } = queryDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.ProductInquiriesWhereInput = {};

    // Filter by productId
    if (productId) {
      where.productId = productId;
    }

    // Filter by authorId
    if (authorId) {
      where.authorId = authorId;
    }

    // Filter by status
    if (status) {
      where.status = status.trim().toLowerCase();
    }

    // Filter by hasAnswer (whether the inquiry has at least one answer)
    if (hasAnswer !== undefined) {
      if (hasAnswer) {
        where.productInquiryAnswers = {
          some: {},
        };
      } else {
        where.productInquiryAnswers = {
          none: {},
        };
      }
    }

    // Search in inquiry title or content
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          content: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // Build orderBy clause
    const orderBy: Prisma.ProductInquiriesOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries in parallel
    const [inquiries, total] = await Promise.all([
      this.prisma.productInquiries.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: true,
          product: true,
          productInquiryAnswers: {
            include: {
              user: true,
            },
          },
        },
      }),
      this.prisma.productInquiries.count({ where }),
    ]);

    const data = inquiries.map((inquiry) =>
      ProductInquiryMapper.toEntityWithRelations(inquiry),
    );
    return { data, total };
  }

  /**
   * Find a single product inquiry by ID
   * @param id - Inquiry ID
   * @returns ProductInquiryEntity or null if not found
   */
  async findOne(id: string): Promise<ProductInquiryEntity | null> {
    const inquiry = await this.prisma.productInquiries.findUnique({
      where: { id },
      include: {
        user: true,
        product: true,
        productInquiryAnswers: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!inquiry) {
      return null;
    }

    return ProductInquiryMapper.toEntityWithRelations(inquiry as ProductInquiryWithRelations);
  }

  /**
   * Find all inquiries for a specific product
   * @param productId - Product ID
   * @param queryDto - Optional query parameters for pagination and filtering
   * @returns Array of ProductInquiryEntity
   */
  async findByProductId(
    productId: string,
    queryDto?: Partial<QueryProductInquiriesDto>,
  ): Promise<ProductInquiryEntity[]> {
    const {
      sortBy = 'createdAt',
      sortOrder = 'desc',
      hasAnswer,
    } = queryDto || {};

    // Build where clause
    const where: Prisma.ProductInquiriesWhereInput = {
      productId,
    };

    // Filter by hasAnswer if provided
    if (hasAnswer !== undefined) {
      if (hasAnswer) {
        where.productInquiryAnswers = {
          some: {},
        };
      } else {
        where.productInquiryAnswers = {
          none: {},
        };
      }
    }

    // Build orderBy clause
    const orderBy: Prisma.ProductInquiriesOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const inquiries = await this.prisma.productInquiries.findMany({
      where,
      orderBy,
      include: {
        user: true,
        product: true,
        productInquiryAnswers: {
          include: {
            user: true,
          },
        },
      },
    });

    return inquiries.map((inquiry) =>
      ProductInquiryMapper.toEntityWithRelations(inquiry),
    );
  }

  /**
   * Find all inquiries by a specific author
   * @param authorId - User ID who authored the inquiries
   * @returns Array of ProductInquiryEntity
   */
  async findByAuthorId(authorId: string): Promise<ProductInquiryEntity[]> {
    const inquiries = await this.prisma.productInquiries.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        product: true,
        productInquiryAnswers: {
          include: {
            user: true,
          },
        },
      },
    });

    return inquiries.map((inquiry) =>
      ProductInquiryMapper.toEntityWithRelations(inquiry),
    );
  }

  /**
   * Find a single inquiry with all its answers
   * @param id - Inquiry ID
   * @returns ProductInquiryEntity with answers or null if not found
   */
  async findWithAnswers(id: string): Promise<ProductInquiryEntity | null> {
    const inquiry = await this.prisma.productInquiries.findUnique({
      where: { id },
      include: {
        user: true,
        product: true,
        productInquiryAnswers: {
          orderBy: {
            createdAt: 'asc',
          },
          include: {
            user: true,
          },
        },
      },
    });

    if (!inquiry) {
      return null;
    }

    return ProductInquiryMapper.toEntityWithRelations(inquiry as ProductInquiryWithRelations);
  }

  /**
   * Update a product inquiry
   * @param id - Inquiry ID
   * @param updateDto - Data to update
   * @returns Updated ProductInquiryEntity
   */
  async update(
    id: string,
    updateDto: UpdateProductInquiryDto,
  ): Promise<ProductInquiryEntity> {
    try {
      // Check if inquiry exists
      const existingInquiry = await this.findOne(id);
      if (!existingInquiry) {
        throw new NotFoundException(`Inquiry with ID ${id} not found`);
      }

      // Build update data object
      const data: Prisma.ProductInquiriesUpdateInput = {};

      if (updateDto.title !== undefined) {
        data.title = updateDto.title;
      }

      if (updateDto.content !== undefined) {
        data.content = updateDto.content;
      }

      if (updateDto.status !== undefined) {
        data.status = updateDto.status.trim().toLowerCase();
      }

      // Update the inquiry
      const inquiry = await this.prisma.productInquiries.update({
        where: { id },
        data,
        include: {
          user: true,
          product: true,
          productInquiryAnswers: {
            include: {
              user: true,
            },
          },
        },
      });

      return ProductInquiryMapper.toEntityWithRelations(inquiry);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Inquiry with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a product inquiry
   * @param id - Inquiry ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.productInquiries.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Inquiry with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Get inquiry count for a product
   * @param productId - Product ID
   * @returns Number of inquiries
   */
  async getInquiryCount(productId: string): Promise<number> {
    return await this.prisma.productInquiries.count({
      where: { productId },
    });
  }

  /**
   * Check if an inquiry has at least one answer
   * @param inquiryId - Inquiry ID
   * @returns true if inquiry has at least one answer
   */
  async checkHasAnswer(inquiryId: string): Promise<boolean> {
    const answerCount = await this.prisma.productInquiryAnswers.count({
      where: { inquiryId },
    });

    return answerCount > 0;
  }

  /**
   * Get inquiry count by author
   * @param authorId - User ID
   * @returns Number of inquiries by this author
   */
  async getInquiryCountByAuthor(authorId: string): Promise<number> {
    return await this.prisma.productInquiries.count({
      where: { authorId },
    });
  }

  /**
   * Get unanswered inquiries for a product
   * Useful for admins to see which inquiries need answers
   * @param productId - Product ID
   * @returns Array of unanswered ProductInquiryEntity
   */
  async getUnansweredInquiries(productId: string): Promise<ProductInquiryEntity[]> {
    const inquiries = await this.prisma.productInquiries.findMany({
      where: {
        productId,
        productInquiryAnswers: {
          none: {},
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: true,
        product: true,
        productInquiryAnswers: {
          include: {
            user: true,
          },
        },
      },
    });

    return inquiries.map((inquiry) =>
      ProductInquiryMapper.toEntityWithRelations(inquiry),
    );
  }

  /**
   * Get inquiry statistics for a product
   * @param productId - Product ID
   * @returns Object with inquiry statistics
   */
  async getProductInquiryStats(productId: string): Promise<{
    totalInquiries: number;
    answeredInquiries: number;
    unansweredInquiries: number;
  }> {
    const [totalInquiries, answeredInquiries] = await Promise.all([
      this.prisma.productInquiries.count({
        where: { productId },
      }),
      this.prisma.productInquiries.count({
        where: {
          productId,
          productInquiryAnswers: {
            some: {},
          },
        },
      }),
    ]);

    return {
      totalInquiries,
      answeredInquiries,
      unansweredInquiries: totalInquiries - answeredInquiries,
    };
  }

  /**
   * Bulk delete inquiries by product ID
   * Useful when a product is deleted
   * @param productId - Product ID
   * @returns Number of deleted inquiries
   */
  async bulkDeleteByProductId(productId: string): Promise<number> {
    const result = await this.prisma.productInquiries.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  /**
   * Bulk delete inquiries by author ID
   * Useful when a user is deleted
   * @param authorId - User ID
   * @returns Number of deleted inquiries
   */
  async bulkDeleteByAuthorId(authorId: string): Promise<number> {
    const result = await this.prisma.productInquiries.deleteMany({
      where: { authorId },
    });

    return result.count;
  }
}

