import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateProductBadgeDto } from './dto/create-product-badge.dto';
import { UpdateProductBadgeDto } from './dto/update-product-badge.dto';
import { ProductBadgeResponseDto } from './dto/product-badge-response.dto';
import { ProductBadgeRepository } from './repositories/product-badge.repository';
import { ProductBadgeMapper } from './mappers/product-badge.mapper';

@Injectable()
export class ProductBadgesService {
  constructor(private readonly productBadgeRepository: ProductBadgeRepository) {}

  /**
   * Create a new product badge
   */
  async create(createDto: CreateProductBadgeDto): Promise<ProductBadgeResponseDto> {
    // Check if badge already exists for the product
    const existingBadge = await this.productBadgeRepository.findByProductId(createDto.productId);
    if (existingBadge) {
      throw new ConflictException(`Product badge for product ${createDto.productId} already exists`);
    }

    // Create the badge
    const productBadge = await this.productBadgeRepository.create(createDto);

    // Return mapped response
    return ProductBadgeMapper.toResponseDto(productBadge);
  }

  /**
   * Get all product badges
   */
  async findAll(): Promise<ProductBadgeResponseDto[]> {
    const productBadges = await this.productBadgeRepository.findAll();
    return ProductBadgeMapper.toResponseDtoArray(productBadges);
  }

  /**
   * Get product badge by ID
   */
  async findOne(id: string): Promise<ProductBadgeResponseDto> {
    const productBadge = await this.productBadgeRepository.findOne(id);
    if (!productBadge) {
      throw new NotFoundException(`Product badge with id ${id} not found`);
    }
    return ProductBadgeMapper.toResponseDto(productBadge);
  }

  /**
   * Get product badge by product ID
   */
  async findByProductId(productId: string): Promise<ProductBadgeResponseDto> {
    const productBadge = await this.productBadgeRepository.findByProductId(productId);
    if (!productBadge) {
      throw new NotFoundException(`Product badge for product ${productId} not found`);
    }
    return ProductBadgeMapper.toResponseDto(productBadge);
  }

  /**
   * Update product badge by ID
   */
  async update(id: string, updateDto: UpdateProductBadgeDto): Promise<ProductBadgeResponseDto> {
    // Check existence first
    const exists = await this.productBadgeRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Product badge with id ${id} not found`);
    }

    // Update the badge
    const productBadge = await this.productBadgeRepository.update(id, updateDto);

    // Return mapped response
    return ProductBadgeMapper.toResponseDto(productBadge);
  }

  /**
   * Remove product badge by ID
   */
  async remove(id: string): Promise<void> {
    // Check existence first
    const exists = await this.productBadgeRepository.exists(id);
    if (!exists) {
      throw new NotFoundException(`Product badge with id ${id} not found`);
    }

    // Delete the badge
    await this.productBadgeRepository.remove(id);
  }
}
