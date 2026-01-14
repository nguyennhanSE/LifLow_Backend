import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CategoryType, Prisma } from '@prisma/client';
import { CategoryEntity } from '../entities/category.entity';
import { toCategoryEntity } from '../mapper/category.mapper';
import { DuplicateError } from '../../../utils/customErrors';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find many categories with filters and pagination
   */
  async findMany(
    filters?: {
      search?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<CategoryEntity[]> {
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(pagination?.sortBy, pagination?.sortOrder);

    const skip = pagination?.page && pagination?.limit 
      ? (pagination.page - 1) * pagination.limit 
      : undefined;
    const take = pagination?.limit;

    const categories = await this.prisma.category.findMany({
      where,
      orderBy,
      skip,
      take,
    });

    return categories.map(category => toCategoryEntity(category));
  }

  /**
   * Find category by productCategoryNumber
   */
  async findByProductCategoryNumber(productCategoryNumber: number): Promise<CategoryEntity> {
    const category = await this.prisma.category.findUnique({
      where: { productCategoryNumber },
    });

    if (!category) {  
      throw new NotFoundException(`Category with productCategoryNumber ${productCategoryNumber} not found`);
    }

    return toCategoryEntity(category);
  }

  /**
   * Count categories matching filters
   */
  async count(filters?: { search?: string }): Promise<number> {
    const where = this.buildWhereClause(filters);
    return await this.prisma.category.count({ where });
  }

  /**
   * Build Prisma where clause from filters
   */
  private buildWhereClause(filters?: { search?: string }): Prisma.CategoryWhereInput {
    const where: Prisma.CategoryWhereInput = {};

    // Search: searches name and description
    if (filters?.search) {
      where.OR = [
        {
          name: {
            equals: filters.search as CategoryType,
          },
        },
        {
          description: {
            contains: filters.search,
          },
        },
      ];
    }

    return where;
  }

  /**
   * Build Prisma orderBy clause from sort parameters
   */
  private buildOrderByClause(
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Prisma.CategoryOrderByWithRelationInput {
    const allowedSortFields = [
      'productCategoryNumber',
      'name',
      'createdAt',
      'updatedAt',
    ];

    // Default sort
    if (!sortBy || !allowedSortFields.includes(sortBy)) {
      return { createdAt: 'desc' };
    }

    return { [sortBy]: sortOrder };
  }

  /**
   * Create a new category
   */
  async create(data: {
    productCategoryNumber?: number;
    name: CategoryType;
    description?: string | null;
  }): Promise<CategoryEntity> {
    try {
      const category = await this.prisma.category.create({
        data,
      });

      return toCategoryEntity(category);
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        throw new DuplicateError(`Category with this ${field} already exists`);
      }
      throw error;
    }
  }

  /**
   * Update an existing category
   */
  async update(
    productCategoryNumber: number,
    data: {
      name?: CategoryType;
      description?: string | null;
    }
  ): Promise<CategoryEntity> {
    try {
      const category = await this.prisma.category.update({
        where: { productCategoryNumber },
        data: {
          name: data.name,
          description: data.description,
        },
      });

      return toCategoryEntity(category);
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Category with productCategoryNumber ${productCategoryNumber} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete a category by productCategoryNumber
   */
  async delete(productCategoryNumber: number): Promise<void> {
    try {
      await this.prisma.category.delete({
        where: { productCategoryNumber },
      });
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Category with productCategoryNumber ${productCategoryNumber} not found`);
      }
      throw error;
    }
  }

  /**
   * Check if category exists by productCategoryNumber
   */
  async existsByProductCategoryNumber(productCategoryNumber: number): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { productCategoryNumber },
    });
    return count > 0;
  }
}

