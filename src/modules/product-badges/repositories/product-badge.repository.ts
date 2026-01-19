import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { productBadges } from '@prisma/client';
import { CreateProductBadgeDto } from '../dto/create-product-badge.dto';
import { UpdateProductBadgeDto } from '../dto/update-product-badge.dto';

@Injectable()
export class ProductBadgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new product badge
   */
  async create(data: CreateProductBadgeDto): Promise<productBadges> {
    return this.prisma.productBadges.create({
      data: {
        productId: data.productId,
        isHotDeal: data.isHotDeal ?? false,
        isNewProduct: data.isNewProduct ?? false,
        isBestSeller: data.isBestSeller ?? false,
      },
    });
  }

  /**
   * Find all product badges
   */
  async findAll(): Promise<productBadges[]> {
    return this.prisma.productBadges.findMany();
  }

  /**
   * Find a product badge by ID
   */
  async findOne(id: string): Promise<productBadges | null> {
    return this.prisma.productBadges.findUnique({
      where: { id },
    });
  }

  /**
   * Find a product badge by product ID
   */
  async findByProductId(productId: string): Promise<productBadges | null> {
    return this.prisma.productBadges.findFirst({
      where: { productId },
    });
  }

  /**
   * Update a product badge by ID
   */
  async update(id: string, data: UpdateProductBadgeDto): Promise<productBadges> {
    const updateData: {
      productId?: string;
      isHotDeal?: boolean;
      isNewProduct?: boolean;
      isBestSeller?: boolean;
    } = {};

    if (data.productId !== undefined) {
      updateData.productId = data.productId;
    }
    if (data.isHotDeal !== undefined) {
      updateData.isHotDeal = data.isHotDeal;
    }
    if (data.isNewProduct !== undefined) {
      updateData.isNewProduct = data.isNewProduct;
    }
    if (data.isBestSeller !== undefined) {
      updateData.isBestSeller = data.isBestSeller;
    }

    return this.prisma.productBadges.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Remove a product badge by ID
   */
  async remove(id: string): Promise<productBadges> {
    return this.prisma.productBadges.delete({
      where: { id },
    });
  }

  /**
   * Check if a product badge exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const productBadge = await this.prisma.productBadges.findUnique({
      where: { id },
      select: { id: true },
    });
    return productBadge !== null;
  }
}
