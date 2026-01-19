import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProductEntity } from '../entities/product.entity';
import { Prisma } from '@prisma/client';
import { DuplicateError } from '../../../utils/customErrors';
import { toProductEntity, toProductEntityWithRelations } from '../mapper/product.mapper';
import { CreateProductDto, CreateProductSpecialOfferDto, UpdateProductDto } from '../dto/product.dto';

export interface ProductFilters {
  search?: string;
  category?: number;
  brand?: string;
  saleStatus?: string;
  displayStatus?: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find many products with filters and pagination
   */
  async findMany(
    filters: ProductFilters,
    pagination: ProductPagination
  ): Promise<ProductEntity[]> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(pagination.sortBy, pagination.sortOrder);

    const skip = (pagination.page - 1) * pagination.limit;

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: pagination.limit,
      include: {
        productSpecialOffer: true,
        productDiscount: true,
        banner: true,
        productBadges: true,
      },
    });

    return products.map(product => toProductEntityWithRelations(product));
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        productSpecialOffer: true,
        productDiscount: true,
        banner: true,
        productBadges: true,
      },
    });

    if (!product) {
      return null;
    }

    return toProductEntityWithRelations(product);
  }

  /**
   * Count products matching filters
   */
  async count(filters: ProductFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return await this.prisma.product.count({ where });
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters: ProductFilters): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {};

    // Search: searches productName, brand, productCode
    const searchConditions: Prisma.ProductWhereInput[] = [];
    if (filters.search) {
      searchConditions.push(
        {
          productName: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          brand: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          productCode: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      );
    }

    // Filter products that have at least one valid S3 image URL
    // Check if any of the image fields contains S3 URL indicators (amazonaws.com)
    // This condition is always applied to ensure products have valid S3 images
    const s3UrlCondition: Prisma.ProductWhereInput = {
      OR: [
        {
          imageRegistrationDetail: {
            contains: 'amazonaws.com',
          },
        },
        {
          imageRegistrationList: {
            contains: 'amazonaws.com',
          },
        },
        {
          imageRegistrationSmallList: {
            contains: 'amazonaws.com',
          },
        },
        {
          imageRegistrationThumbnail: {
            contains: 'amazonaws.com',
          },
        },
      ],
    };

    // Build AND conditions: search (if exists) AND S3 URL condition
    const andConditions: Prisma.ProductWhereInput[] = [];
    
    // Add search conditions if they exist
    if (searchConditions.length > 0) {
      andConditions.push({
        OR: searchConditions,
      });
    }
    
    // Always add S3 URL condition
    andConditions.push(s3UrlCondition);

    // Combine all AND conditions
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Category filter - exact match with single category
    if (filters.category) {
      where.productCategoryNumber = filters.category;
    }

    // Brand filter (exact match)
    if (filters.brand) {
      where.brand = filters.brand;
    }

    // Sale status filter
    if (filters.saleStatus) {
      where.saleStatus = filters.saleStatus;
    }

    // Display status filter
    // Only filter by 'Y' if explicitly requested, otherwise return both 'Y' and 'N'
    if (filters.displayStatus === 'Y') {
      where.displayStatus = 'Y';
    }

    return where;
  }

  /**
   * Create a new product
   */
  async create(data: CreateProductDto): Promise<ProductEntity> {
    try {
      // Extract fields that should not be in product table
      const {
        hsCode,
        category,
        discountRate,
        discountStartDate,
        discountEndDate,
        ...productData
      } = data;

      // Convert hsCode from string to BigInt if provided
      const createData: Prisma.ProductCreateInput = productData as Prisma.ProductCreateInput;
      if (hsCode !== undefined) {
        createData.hsCode = hsCode !== null ? BigInt(String(hsCode)) : null;
      }
      createData.displayStatus = 'Y';

      // Create product
      const product = await this.prisma.product.create({
        data: createData,
      });

      // Note: Product category is now managed through direct relation via productCategoryNumber

      return toProductEntity(product);
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new DuplicateError(`Product with this ${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async update(id: string, data: UpdateProductDto): Promise<ProductEntity> {
    try {
      // Convert hsCode from string to BigInt if provided
      const { hsCode, ...restData } = data;
      const updateData: Prisma.ProductUpdateInput = restData as Prisma.ProductUpdateInput;
      if (hsCode !== undefined) {
        updateData.hsCode = hsCode !== null ? BigInt(String(hsCode)) : null;
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
      });

      return toProductEntity(product);
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new DuplicateError(`Product with this ${field} already exists`);
      }
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Check if product exists by productCode
   */
  async existsByProductCode(productCode: string, excludeId?: string): Promise<boolean> {
    const where: Prisma.ProductWhereInput = {
      productCode,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const count = await this.prisma.product.count({ where });
    return count > 0;
  }

  /**
   * Delete a single product by ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.product.delete({
        where: { id },
      });
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete multiple products by IDs
   */
  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.prisma.product.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return result.count;
  }

  /**
   * Update product images
   */
  async updateImages(
    id: string,
    images: {
      imageRegistrationDetail?: string;
      imageRegistrationList?: string;
      imageRegistrationSmallList?: string;
      imageRegistrationThumbnail?: string;
    },
  ): Promise<ProductEntity> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: images,
      });

      return toProductEntity(product);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Update only status fields for a single product
   */
  async updateStatus(
    id: string,
    displayStatus?: string,
    saleStatus?: string
  ): Promise<ProductEntity> {
    try {
      const updateData: any = {};
      
      if (displayStatus !== undefined) {
        updateData.displayStatus = displayStatus;
      }
      
      if (saleStatus !== undefined) {
        updateData.saleStatus = saleStatus;
      }

      const product = await this.prisma.product.update({
        where: { id },
        data: updateData,
      });

      return toProductEntity(product);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Bulk update status for multiple products
   */
  async bulkUpdateStatus(
    ids: string[],
    displayStatus?: string,
    saleStatus?: string
  ): Promise<number> {
    const updateData: any = {};
    
    if (displayStatus !== undefined) {
      updateData.displayStatus = displayStatus;
    }
    
    if (saleStatus !== undefined) {
      updateData.saleStatus = saleStatus;
    }

    const result = await this.prisma.product.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: updateData,
    });

    return result.count;
  }

  /**
   * Get product statistics
   */
  async getStats(): Promise<{
    totalProducts: number;
    bySaleStatus: Record<string, number>;
    byDisplayStatus: Record<string, number>;
    byCategory: Record<string, number>;
    averageSalePrice: number;
  }> {
    // Total count
    const totalProducts = await this.prisma.product.count();

    // Group by saleStatus
    const saleStatusGroups = await this.prisma.product.groupBy({
      by: ['saleStatus'],
      _count: {
        id: true,
      },
    });

    // Group by displayStatus
    const displayStatusGroups = await this.prisma.product.groupBy({
      by: ['displayStatus'],
      _count: {
        id: true,
      },
    });

    // Get all products with categories to count by category
    const productsWithCategories = await this.prisma.product.findMany({
      select: {
        productCategoryNumber: true,
      },
      where: {
        productCategoryNumber: {
          not: null,
        },
      },
    });

    // Calculate average sale price
    const avgResult = await this.prisma.product.aggregate({
      _avg: {
        salePrice: true,
      },
      where: {
        salePrice: {
          not: null,
        },
      },
    });

    // Format results
    const bySaleStatus: Record<string, number> = {};
    saleStatusGroups.forEach((group) => {
      bySaleStatus[group.saleStatus || 'null'] = group._count.id;
    });

    const byDisplayStatus: Record<string, number> = {};
    displayStatusGroups.forEach((group) => {
      byDisplayStatus[group.displayStatus || 'null'] = group._count.id;
    });

    const byCategory: Record<string, number> = {};
    // Count each category across all products
    productsWithCategories.forEach((product) => {
      if (product.productCategoryNumber !== null && product.productCategoryNumber !== undefined) {
        const key = String(product.productCategoryNumber);
        byCategory[key] = (byCategory[key] || 0) + 1;
      }
    });

    return {
      totalProducts,
      bySaleStatus,
      byDisplayStatus,
      byCategory,
      averageSalePrice: avgResult._avg.salePrice || 0,
    };
  }

  /**
   * Build Prisma orderBy clause from sort parameters
   */
  private buildOrderByClause(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Prisma.ProductOrderByWithRelationInput {
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'productName',
      'salePrice',
      'consumerPrice',
      'brand',
    ];

    // Default sort
    if (!sortBy || !allowedSortFields.includes(sortBy)) {
      return { createdAt: 'desc' };
    }

    return { [sortBy]: sortOrder };
  }

  async getProductSpecialOfferByProductId(productId: string): Promise<any> {
    const productSpecialOffer = await this.prisma.productSpecialOffer.findUnique({
      where: { productId },
    });
    return productSpecialOffer;
  }

  async createProductSpecialOffer(productId: string, data: CreateProductSpecialOfferDto): Promise<any> {
    const productSpecialOffer = await this.prisma.productSpecialOffer.create({
      data: {
        productId,
        status: data.status ?? false,
        discountAmount: data.discountAmount || 0,
        specialPriceApplied: data.specialPriceApplied ? data.specialPriceApplied : 0,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });
    return productSpecialOffer;
  }

  async updateProductSpecialOffer(productId: string, data: CreateProductSpecialOfferDto): Promise<any> {
    const productSpecialOffer = await this.prisma.productSpecialOffer.update({
      where: { productId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount }),
        ...(data.specialPriceApplied !== undefined && { specialPriceApplied: data.specialPriceApplied ? data.specialPriceApplied : 0 }),
        ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        updatedAt: new Date()
      },
    });
    return productSpecialOffer;
  }

  async deleteProductSpecialOffer(productId: string): Promise<any> {
    return await this.prisma.productSpecialOffer.delete({
      where: { productId },
    });
  }

  /**
   * Find products with active special offers
   */
  /**
   * Find products with special offers
   */
  async findManyWithSpecialOffer(
    pagination: ProductPagination
  ): Promise<ProductEntity[]> {
    const now = new Date();
    const orderBy = this.buildOrderByClause(pagination.sortBy, pagination.sortOrder);
    const skip = (pagination.page - 1) * pagination.limit;

    const products = await this.prisma.product.findMany({
      where: {
        productSpecialOffer: {
          status: true,
          OR: [
            {
              startDate: null,
              endDate: null,
            },
            {
              startDate: { lte: now },
              endDate: { gte: now },
            },
            {
              startDate: { lte: now },
              endDate: null,
            },
            {
              startDate: null,
              endDate: { gte: now },
            },
          ],
        },
      },
      orderBy,
      skip,
      take: pagination.limit,
      include: {
        productSpecialOffer: true,
        productDiscount: true,
        banner: true,
        productBadges: true,
      },
    });

    return products.map(product => toProductEntityWithRelations(product));
  }

  /**
   * Count products with active special offers
   */
  async countWithSpecialOffer(): Promise<number> {
    const now = new Date();
    return await this.prisma.product.count({
      where: {
        productSpecialOffer: {
          status: true,
          OR: [
            {
              startDate: null,
              endDate: null,
            },
            {
              startDate: { lte: now },
              endDate: { gte: now },
            },
            {
              startDate: { lte: now },
              endDate: null,
            },
            {
              startDate: null,
              endDate: { gte: now },
            },
          ],
        },
      },
    });
  }
}

