import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { CategoryEntity } from './entities/category.entity';
import {
  CategoryFilterDto,
  CategoryListResponse,
  CategoryResponseDto,
} from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DuplicateError } from '../../utils/customErrors';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  /**
   * Get categories with filtering, pagination, and sorting
   */
  async findAll(filterDto: CategoryFilterDto): Promise<CategoryListResponse> {
    // Process query parameters
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const sortBy = filterDto.sortBy || 'createdAt';
    const sortOrder = filterDto.sortOrder || 'desc';

    // Build filters
    const filters = {
      search: filterDto.search,
    };

    // Build pagination
    const pagination = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    // Get categories and count
    const [categories, total] = await Promise.all([
      this.categoryRepository.findMany(filters, pagination),
      this.categoryRepository.count(filters),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      categories: categories.map(cat => this.toResponseDto(cat)),
      pagination: paginationMeta,
    };
  }

  /**
   * Get single category by productCategoryNumber
   */
  async findOne(productCategoryNumber: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findByProductCategoryNumber(productCategoryNumber);

    if (!category) {
      throw new NotFoundException(`Category with productCategoryNumber ${productCategoryNumber} not found`);
    }

    return this.toResponseDto(category);
  }

  /**
   * Create a new category
   */
  async create(data: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check for duplicate productCategoryNumber
    const exists = await this.categoryRepository.existsByProductCategoryNumber(data.productCategoryNumber);
    if (exists) {
      throw new DuplicateError(`Category with productCategoryNumber ${data.productCategoryNumber} already exists`);
    }

    // Create category
    const category = await this.categoryRepository.create({
      productCategoryNumber: data.productCategoryNumber,
      name: data.name,
      description: data.description,
    });
    return this.toResponseDto(category);
  }

  /**
   * Update an existing category
   */
  async update(productCategoryNumber: string, data: UpdateCategoryDto): Promise<CategoryResponseDto> {
    // Check if category exists
    const existingCategory = await this.categoryRepository.findByProductCategoryNumber(productCategoryNumber);
    if (!existingCategory) {
      throw new NotFoundException(`Category with productCategoryNumber ${productCategoryNumber} not found`);
    }

    // Update category
    const category = await this.categoryRepository.update(productCategoryNumber, data);
    return this.toResponseDto(category);
  }

  /**
   * Delete a category
   */
  async remove(productCategoryNumber: string): Promise<{ message: string }> {
    // Verify category exists
    const category = await this.categoryRepository.findByProductCategoryNumber(productCategoryNumber);
    if (!category) {
      throw new NotFoundException(`Category with productCategoryNumber ${productCategoryNumber} not found`);
    }

    // Delete category
    await this.categoryRepository.delete(productCategoryNumber);

    return {
      message: `Category ${productCategoryNumber} deleted successfully`,
    };
  }

  /**
   * Convert CategoryEntity to CategoryResponseDto
   */
  private toResponseDto(category: CategoryEntity): CategoryResponseDto {
    // Helper function to safely convert Date to null if invalid
    const safeDate = (date: unknown): Date | null => {
      if (date === null || date === undefined) {
        return null;
      }
      // Check if it's a valid Date instance
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date;
      }
      return null;
    };

    return {
      productCategoryNumber: category.productCategoryNumber,
      name: category.name,
      description: category.description,
      createdAt: safeDate(category.createdAt),
      updatedAt: safeDate(category.updatedAt),
    };
  }
}
