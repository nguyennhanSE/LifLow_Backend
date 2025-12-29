import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { ProductDiscountEntity } from '../entities/product-discount.entity';
import { Prisma } from '@prisma/client';
import { DuplicateError } from '../../../utils/customErrors';
import { toProductDiscountEntity } from '../mapper/product-discount.mapper';
import { CreateProductDiscountDto } from '../dto/create-product-discount.dto';
import { UpdateProductDiscountDto } from '../dto/update-product-discount.dto';

@Injectable()
export class ProductDiscountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all product discounts
   */
  async findMany(): Promise<ProductDiscountEntity[]> {
    const productDiscounts = await this.prisma.productDiscount.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return productDiscounts.map(discount => toProductDiscountEntity(discount));
  }

  /**
   * Find product discount by ID
   */
  async findById(id: string): Promise<ProductDiscountEntity | null> {
    const productDiscount = await this.prisma.productDiscount.findUnique({
      where: { id },
    });

    if (!productDiscount) {
      return null;
    }

    return toProductDiscountEntity(productDiscount);
  }

  /**
   * Find product discount by product ID
   */
  async findByProductId(productId: string): Promise<ProductDiscountEntity | null> {
    const productDiscount = await this.prisma.productDiscount.findUnique({
      where: { productId },
    });

    if (!productDiscount) {
      return null;
    }

    return toProductDiscountEntity(productDiscount);
  }

  /**
   * Create a new product discount
   */
  async create(data: CreateProductDiscountDto): Promise<ProductDiscountEntity> {
    try {
      const productDiscount = await this.prisma.productDiscount.create({
        data: {
          productId: data.productId,
          discountRate: data.discountRate,
          status: data.status ?? false,
          discountStartDate: data.discountStartDate ?? null,
          discountEndDate: data.discountEndDate ?? null,
        },
      });

      return toProductDiscountEntity(productDiscount);
    } catch (error: any) {
      // Handle Prisma unique constraint violation
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'field';
        if (field === 'productId') {
          throw new DuplicateError(`Product discount for product ${data.productId} already exists`);
        }
        throw new DuplicateError(`Product discount with this ${field} already exists`);
      }
      // Handle foreign key constraint violation
      if (error.code === 'P2003') {
        throw new NotFoundException(`Product with id ${data.productId} not found`);
      }
      throw error;
    }
  }

  /**
   * Update an existing product discount
   * Note: productId cannot be updated. To change the product, delete and create a new discount.
   */
  async update(id: string, data: UpdateProductDiscountDto): Promise<ProductDiscountEntity> {
    try {
      const updateData: Prisma.ProductDiscountUpdateInput = {};

      if (data.discountRate !== undefined) {
        updateData.discountRate = data.discountRate;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.discountStartDate !== undefined) {
        updateData.discountStartDate = data.discountStartDate ?? null;
      }
      if (data.discountEndDate !== undefined) {
        updateData.discountEndDate = data.discountEndDate ?? null;
      }

      const productDiscount = await this.prisma.productDiscount.update({
        where: { id },
        data: updateData,
      });

      return toProductDiscountEntity(productDiscount);
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product discount with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Update product discount by product ID
   */
  async updateByProductId(productId: string, data: UpdateProductDiscountDto): Promise<ProductDiscountEntity> {
    try {
      const updateData: Prisma.ProductDiscountUpdateInput = {};

      if (data.discountRate !== undefined) {
        updateData.discountRate = data.discountRate;
      }
      if (data.status !== undefined) {
        updateData.status = data.status;
      }
      if (data.discountStartDate !== undefined) {
        updateData.discountStartDate = data.discountStartDate ?? null;
      }
      if (data.discountEndDate !== undefined) {
        updateData.discountEndDate = data.discountEndDate ?? null;
      }

      const productDiscount = await this.prisma.productDiscount.update({
        where: { productId },
        data: updateData,
      });

      return toProductDiscountEntity(productDiscount);
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product discount for product ${productId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete a product discount by ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.productDiscount.delete({
        where: { id },
      });
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product discount with id ${id} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete a product discount by product ID
   */
  async deleteByProductId(productId: string): Promise<void> {
    try {
      await this.prisma.productDiscount.delete({
        where: { productId },
      });
    } catch (error: any) {
      // Handle record not found
      if (error.code === 'P2025') {
        throw new NotFoundException(`Product discount for product ${productId} not found`);
      }
      throw error;
    }
  }

  /**
   * Delete multiple product discounts by IDs
   */
  async deleteMany(ids: string[]): Promise<number> {
    const result = await this.prisma.productDiscount.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return result.count;
  }

  /**
   * Count all product discounts
   */
  async count(): Promise<number> {
    return await this.prisma.productDiscount.count();
  }
}

