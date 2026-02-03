import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Prisma, ProductReviews, Recipe } from '@prisma/client';
import { CreateProductReviewDto } from '../dto/create-product-review.dto';
import { UpdateProductReviewDto } from '../dto/update-product-review.dto';
import { QueryProductReviewsDto } from '../dto/query-product-reviews.dto';
import { ProductReviewEntity } from '../entities/product-review.entity';
import { ProductReviewMapper } from '../mapper/product-review.mapper';

/**
 * Type for ProductReview with all relations
 * Using any due to Prisma type generation complexity
 */
export type ProductReviewWithRelations = any;

/** Item type for merged reviews + recipes list (findByProductId), sorted by createdAt */
export type FindByProductIdItem =
  | { type: 'review'; createdAt: Date; data: ProductReviewEntity }
  | { type: 'recipe'; createdAt: Date; data: Recipe };

/**
 * Repository for ProductReviews entity
 * Handles all database operations for product reviews
 */
@Injectable()
export class ProductReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new product review
   * @param createDto - Data for creating the review
   * @returns Created ProductReviewEntity with relations
   */
  async create(createDto: CreateProductReviewDto): Promise<ProductReviewEntity> {
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

      // Create the review with relations
      const review = await this.prisma.productReviews.create({
        data: {
          productId: createDto.productId,
          authorId: createDto.authorId ?? '',
          review: createDto.review,
          rating: createDto.rating,
        },
        include: {
          user: true,
          product: true,
        },
      });

      return ProductReviewMapper.toEntityWithRelations(review);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new BadRequestException('A review with this configuration already exists');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Product or User not found');
        }
      }
      throw error;
    }
  }

  /**
   * Find all product reviews with filtering and pagination
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Object with data array and total count
   */
  async findAll(
    queryDto: QueryProductReviewsDto,
  ): Promise<{ data: ProductReviewEntity[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      productId,
      authorId,
      minRating,
      maxRating,
      search,
    } = queryDto;

    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause
    const where: Prisma.ProductReviewsWhereInput = {};

    // Filter by productId
    if (productId) {
      where.productId = productId;
    }

    // Filter by authorId
    if (authorId) {
      where.authorId = authorId;
    }

    // Filter by rating range
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    // Search in review content
    if (search) {
      where.review = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Build orderBy clause
    const orderBy: Prisma.ProductReviewsOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries in parallel
    const [reviews, total] = await Promise.all([
      this.prisma.productReviews.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: true,
          product: true,
        },
      }),
      this.prisma.productReviews.count({ where }),
    ]);

    const data = reviews.map((review) =>
      ProductReviewMapper.toEntityWithRelations(review),
    );
    return { data, total };
  }

  /**
   * Find a single product review by ID
   * @param id - Review ID
   * @returns ProductReviewEntity or null if not found
   */
  async findOne(id: string): Promise<ProductReviewEntity> {
    const review = await this.prisma.productReviews.findUnique({
      where: { id },
      include: {
        user: true,
        product: true,
      },
    }) as ProductReviewWithRelations;
    return ProductReviewMapper.toEntityWithRelations(review);
  }

  /**
   * Find all reviews for a specific product (with user only) and recipes linked to the product.
   * Returns a single list merged and sorted by createdAt (newest first), with pagination.
   */
  async findByProductId(
    productId: string,
    queryDto?: Partial<QueryProductReviewsDto>,
  ): Promise<{ items: FindByProductIdItem[]; total: number }> {
    const {
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minRating,
      maxRating,
      page = 1,
      limit = 10,
    } = queryDto || {};

    const where: Prisma.ProductReviewsWhereInput = {
      productId,
    };

    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = minRating;
      }
      if (maxRating !== undefined) {
        where.rating.lte = maxRating;
      }
    }

    const orderBy: Prisma.ProductReviewsOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [reviews, recipes] = await Promise.all([
      this.prisma.productReviews.findMany({
        where,
        orderBy,
        include: {
          user: true,
        },
      }),
      this.prisma.recipe.findMany({
        where: { productId },
      }),
    ]);

    const reviewEntities = reviews.map((review) =>
      ProductReviewMapper.toEntityWithUser(review),
    );

    const combined: Array<
      | { type: 'review'; createdAt: Date; data: ProductReviewEntity }
      | { type: 'recipe'; createdAt: Date; data: Recipe }
    > = [
      ...reviewEntities.map((data) => ({
        type: 'review' as const,
        createdAt: data.createdAt ?? new Date(0),
        data,
      })),
      ...recipes.map((data) => ({
        type: 'recipe' as const,
        createdAt: data.createdAt,
        data,
      })),
    ];

    combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = combined.length;
    const skip = (page - 1) * limit;
    const items = combined.slice(skip, skip + limit);

    return { items, total };
  }

  /**
   * Find all reviews by a specific author
   * @param authorId - User ID who authored the reviews
   * @returns Array of ProductReviewEntity
   */
  async findByAuthorId(authorId: string): Promise<ProductReviewEntity[]> {
    const reviews = await this.prisma.productReviews.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        product: true,
      },
    });

    return reviews.map((review) =>
      ProductReviewMapper.toEntityWithRelations(review),
    );
  }

  /**
   * Update a product review
   * @param id - Review ID
   * @param updateDto - Data to update
   * @returns Updated ProductReviewEntity
   */
  async update(
    id: string,
    updateDto: UpdateProductReviewDto,
  ): Promise<ProductReviewEntity> {
    try {
      // Check if review exists
      const existingReview = await this.findOne(id);
      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Build update data object
      const data: Prisma.ProductReviewsUpdateInput = {};

      if (updateDto.review !== undefined) {
        data.review = updateDto.review;
      }
      if (updateDto.rating !== undefined) {
        data.rating = updateDto.rating;
      }

      // Update the review
      const review = await this.prisma.productReviews.update({
        where: { id },
        data,
        include: {
          user: true,
          product: true,
        },
      });

      return ProductReviewMapper.toEntityWithRelations(review);
    } catch (error) {
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Review with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Delete a product review
   * @param id - Review ID
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.productReviews.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`Review with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  /**
   * Get average rating for a product
   * @param productId - Product ID
   * @returns Average rating (0 if no reviews)
   */
  async getAverageRating(productId: string): Promise<number> {
    const result = await this.prisma.productReviews.aggregate({
      where: { productId },
      _avg: {
        rating: true,
      },
    });

    return result._avg.rating ?? 0;
  }

  /**
   * Get review count for a product
   * @param productId - Product ID
   * @returns Number of reviews
   */
  async getReviewCount(productId: string): Promise<number> {
    return await this.prisma.productReviews.count({
      where: { productId },
    });
  }

  /**
   * Get rating distribution for a product
   * Useful for displaying rating breakdown (e.g., 5 stars: 10, 4 stars: 5, etc.)
   * @param productId - Product ID
   * @returns Object with rating counts
   */
  async getRatingDistribution(
    productId: string,
  ): Promise<Record<number, number>> {
    const reviews = await this.prisma.productReviews.findMany({
      where: { productId },
      select: { rating: true },
    });

    // Initialize distribution object
    const distribution: Record<number, number> = {
        0: 0,
        1: 0,
        1.5: 0,
        2: 0,
        2.5: 0,
        3: 0,
        3.5: 0,
        4: 0,
        4.5: 0,
        5: 0,
    };

    // Count ratings
    reviews.forEach((review) => {
      if (review.rating >= 0 && review.rating <= 5) {
        distribution[review.rating as 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5] = (distribution[review.rating as 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5] ?? 0) + 0.5;
      }
    });

    return distribution;
  }

  /**
   * Check if a user has already reviewed a product
   * Useful for preventing duplicate reviews
   * @param productId - Product ID
   * @param authorId - User ID
   * @returns true if user has already reviewed the product
   */
  async hasUserReviewedProduct(
    productId: string,
    authorId: string,
  ): Promise<boolean> {
    const review = await this.prisma.productReviews.findFirst({
      where: {
        productId,
        authorId,
      },
    });

    return !!review;
  }

  /**
   * Get user's review for a specific product
   * @param productId - Product ID
   * @param authorId - User ID
   * @returns ProductReviewEntity or null
   */
  async getUserReviewForProduct(
    productId: string,
    authorId: string,
  ): Promise<ProductReviewEntity> {
    const review = await this.prisma.productReviews.findFirst({
      where: {
        productId,
        authorId,
      },
      include: {
        user: true,
        product: true,
      },
    }) as ProductReviewWithRelations;

    return ProductReviewMapper.toEntityWithRelations(review);
  }

  /**
   * Get product statistics including review count and average rating
   * @param productId - Product ID
   * @returns Object with review count and average rating
   */
  async getProductReviewStats(productId: string): Promise<{
    reviewCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    const [reviewCount, averageRating, ratingDistribution] = await Promise.all([
      this.getReviewCount(productId),
      this.getAverageRating(productId),
      this.getRatingDistribution(productId),
    ]);

    return {
      reviewCount,
      averageRating,
      ratingDistribution,
    };
  }

  /**
   * Bulk delete reviews by product ID
   * Useful when a product is deleted
   * @param productId - Product ID
   * @returns Number of deleted reviews
   */
  async bulkDeleteByProductId(productId: string): Promise<number> {
    const result = await this.prisma.productReviews.deleteMany({
      where: { productId },
    });

    return result.count;
  }

  /**
   * Bulk delete reviews by author ID
   * Useful when a user is deleted
   * @param authorId - User ID
   * @returns Number of deleted reviews
   */
  async bulkDeleteByAuthorId(authorId: string): Promise<number> {
    const result = await this.prisma.productReviews.deleteMany({
      where: { authorId },
    });

    return result.count;
  }

  /**
   * Get length of product reviews
   * @returns Number of reviews
   */
  async getLengthOfProductReviews(productId: string): Promise<number> {
    return await this.prisma.productReviews.count({
      where: { productId },
    });
  }
}

