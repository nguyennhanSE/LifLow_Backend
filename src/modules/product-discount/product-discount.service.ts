import { ProductDiscountCronjobService } from './cronjob/product-discount.cronjob.service';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ProductDiscountRepository } from './repositories/product-discount.repository';
import { ProductDiscountEntity } from './entities/product-discount.entity';
import { CreateProductDiscountDto } from './dto/create-product-discount.dto';
import { UpdateProductDiscountDto } from './dto/update-product-discount.dto';
import { DuplicateError } from '../../utils/customErrors';

@Injectable()
export class ProductDiscountService {
  constructor(private readonly productDiscountRepository: ProductDiscountRepository, private readonly productDiscountCronjobService: ProductDiscountCronjobService) {}

  /**
   * Create a new product discount
   */
  async create(createProductDiscountDto: CreateProductDiscountDto): Promise<ProductDiscountEntity> {
    // Check if discount already exists for this product
    const existingDiscount = await this.productDiscountRepository.findByProductId(createProductDiscountDto.productId);
    if (existingDiscount) {
      throw new DuplicateError(`Product discount for product ${createProductDiscountDto.productId} already exists`);
    }

    // Validate date range
    if (createProductDiscountDto.discountStartDate && createProductDiscountDto.discountEndDate) {
      if (createProductDiscountDto.discountStartDate >= createProductDiscountDto.discountEndDate) {
        throw new BadRequestException('Discount start date must be before end date');
      }
    }
    await this.productDiscountCronjobService.recalculateProductSalePricesById(createProductDiscountDto.productId);

    return await this.productDiscountRepository.create(createProductDiscountDto);
  }

  /**
   * Get all product discounts
   */
  async findAll(): Promise<ProductDiscountEntity[]> {
    return await this.productDiscountRepository.findMany();
  }

  /**
   * Get product discount by ID
   */
  async findOne(id: string): Promise<ProductDiscountEntity> {
    const productDiscount = await this.productDiscountRepository.findById(id);
    if (!productDiscount) {
      throw new NotFoundException(`Product discount with id ${id} not found`);
    }
    return productDiscount;
  }

  /**
   * Get product discount by product ID
   */
  async findByProductId(productId: string): Promise<ProductDiscountEntity> {
    const productDiscount = await this.productDiscountRepository.findByProductId(productId);
    if (!productDiscount) {
      throw new NotFoundException(`Product discount for product ${productId} not found`);
    }
    return productDiscount;
  }

  /**
   * Update product discount by ID
   */
  async update(id: string, updateProductDiscountDto: UpdateProductDiscountDto): Promise<ProductDiscountEntity> {
    // Check if product discount exists
    const existingDiscount = await this.productDiscountRepository.findById(id);
    if (!existingDiscount) {
      throw new NotFoundException(`Product discount with id ${id} not found`);
    }

    // Validate date range if both dates are provided
    if (updateProductDiscountDto.discountStartDate !== undefined && updateProductDiscountDto.discountEndDate !== undefined) {
      const startDate = updateProductDiscountDto.discountStartDate || existingDiscount.discountStartDate;
      const endDate = updateProductDiscountDto.discountEndDate || existingDiscount.discountEndDate;
      
      if (startDate && endDate && startDate >= endDate) {
        throw new BadRequestException('Discount start date must be before end date');
      }
    }

    // Note: productId cannot be updated. To change the product, delete and create a new discount.
    if (updateProductDiscountDto.productId !== undefined) {
      throw new BadRequestException('Product ID cannot be updated. Please delete and create a new discount for the new product.');
    }

    return await this.productDiscountRepository.update(id, updateProductDiscountDto);
  }

  /**
   * Update product discount by product ID
   */
  async updateByProductId(productId: string, updateProductDiscountDto: UpdateProductDiscountDto): Promise<ProductDiscountEntity> {
    // Check if product discount exists
    const existingDiscount = await this.productDiscountRepository.findByProductId(productId);
    if (!existingDiscount) {
      throw new NotFoundException(`Product discount for product ${productId} not found`);
    }

    // Validate date range if both dates are provided
    if (updateProductDiscountDto.discountStartDate !== undefined && updateProductDiscountDto.discountEndDate !== undefined) {
      const startDate = updateProductDiscountDto.discountStartDate || existingDiscount.discountStartDate;
      const endDate = updateProductDiscountDto.discountEndDate || existingDiscount.discountEndDate;
      
      if (startDate && endDate && startDate >= endDate) {
        throw new BadRequestException('Discount start date must be before end date');
      }
    }

    return await this.productDiscountRepository.updateByProductId(productId, updateProductDiscountDto);
  }

  /**
   * Delete product discount by ID
   */
  async remove(id: string): Promise<{ message: string }> {
    // Verify product discount exists
    const productDiscount = await this.productDiscountRepository.findById(id);
    if (!productDiscount) {
      throw new NotFoundException(`Product discount with id ${id} not found`);
    }

    await this.productDiscountRepository.delete(id);

    return {
      message: `Product discount ${id} deleted successfully`,
    };
  }

  /**
   * Delete product discount by product ID
   */
  async removeByProductId(productId: string): Promise<{ message: string }> {
    // Verify product discount exists
    const productDiscount = await this.productDiscountRepository.findByProductId(productId);
    if (!productDiscount) {
      throw new NotFoundException(`Product discount for product ${productId} not found`);
    }

    await this.productDiscountRepository.deleteByProductId(productId);

    return {
      message: `Product discount for product ${productId} deleted successfully`,
    };
  }

  /**
   * Bulk delete product discounts
   */
  async bulkDelete(ids: string[]): Promise<{ message: string; deletedCount: number }> {
    // Validate ids array
    if (!ids || ids.length === 0) {
      throw new BadRequestException('Product discount IDs array must not be empty');
    }

    // Delete product discounts
    const deletedCount = await this.productDiscountRepository.deleteMany(ids);

    return {
      message: `${deletedCount} product discount(s) deleted successfully`,
      deletedCount,
    };
  }

  /**
   * Get count of all product discounts
   */
  async count(): Promise<number> {
    return await this.productDiscountRepository.count();
  }
}
