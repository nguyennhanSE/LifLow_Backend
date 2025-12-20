import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProductEntity } from '../entities/product.entity';
import { Prisma } from '@prisma/client';
import { DuplicateError } from '../../../utils/customErrors';

export interface ProductFilters {
  search?: string;
  category?: string;
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
    });

    return products as ProductEntity[];
  }

  /**
   * Find product by ID
   */
  async findById(id: string): Promise<ProductEntity | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    return product as ProductEntity | null;
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
    if (filters.search) {
      where.OR = [
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
      ];
    }

    // Category filter
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
    if (filters.displayStatus) {
      where.displayStatus = filters.displayStatus;
    }

    return where;
  }

  /**
   * Create a new product
   */
  async create(data: Partial<ProductEntity>): Promise<ProductEntity> {
    try {
      const product = await this.prisma.product.create({
        data: data as Prisma.ProductCreateInput,
      });

      return product as ProductEntity;
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
  async update(id: string, data: Partial<ProductEntity>): Promise<ProductEntity> {
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: data as Prisma.ProductUpdateInput,
      });

      return product as ProductEntity;
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

      return product as ProductEntity;
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

      return product as ProductEntity;
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

    // Group by category
    const categoryGroups = await this.prisma.product.groupBy({
      by: ['productCategoryNumber'],
      _count: {
        id: true,
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
    categoryGroups.forEach((group) => {
      byCategory[group.productCategoryNumber || 'null'] = group._count.id;
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
}

