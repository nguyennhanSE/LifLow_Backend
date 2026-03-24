import { AwsService } from './../../libs/integration/aws/aws.service';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { UpdateProductReviewDto } from './dto/update-product-review.dto';
import { QueryProductReviewsDto } from './dto/query-product-reviews.dto';
import { ProductReviewsRepository } from './repositories/product-reviews.repository';
import { ProductReviewMapper } from './mapper/product-review.mapper';
import {
  ProductReviewResponseDto,
} from './dto/product-review-response.dto';
import {
  ProductReviewsByProductResponseDto,
  ProductReviewOrRecipeItemDto,
  RecipeSummaryDto,
} from './dto/product-reviews-by-product-response.dto';
import { PaginatedResponseDto } from '../../libs/models/response/paginated-response.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { RecipeRepository } from '../recipe/repositories/recipe.repository';

/**
 * Service for managing product reviews
 * Handles business logic and validation for product reviews
 */
@Injectable()
export class ProductReviewsService {
  private readonly logger = new Logger(ProductReviewsService.name);

  constructor(
    private readonly productReviewsRepository: ProductReviewsRepository,
    private readonly awsService: AwsService,
    private readonly prisma: PrismaService,
    private readonly recipeRepository: RecipeRepository,
  ) {}

  /**
   * Create a new product review
   * Validates that the user hasn't already reviewed the product
   * @param createDto - Data for creating the review
   * @param imageFile - Optional image file to upload
   * @returns Created review with relations
   */
  async create(
    createDto: CreateProductReviewDto,
    imageFile?: Express.Multer.File,
  ): Promise<ProductReviewResponseDto> {
    try {
      this.logger.log(
        `Creating review for product ${createDto.productId} by user ${createDto.authorId}`,
      );

      // Validate rating is within range (0.0 to 5.0)
      if (createDto.rating < 0 || createDto.rating > 5) {
        throw new BadRequestException('Rating must be between 0.0 and 5.0');
      }
      // Use transaction to ensure atomicity
      const reviewEntity = await this.prisma.$transaction(async (tx) => {
        // Check if user has already reviewed this product
        // const existingReview = await tx.productReviews.findFirst({
        //   where: {
        //     productId: createDto.productId,
        //     authorId: createDto.authorId,
        //   },
        // });

        // if (existingReview) {
        //   throw new BadRequestException(
        //     'You have already reviewed this product. Please update your existing review instead.',
        //   );
        // }

        // Verify product exists
        const product = await tx.product.findUnique({
          where: { id: createDto.productId },
        });
        if (!product) {
          throw new NotFoundException(
            `Product with ID ${createDto.productId} not found`,
          );
        }

          // Upload image file if provided
        let imageUrl: string | undefined;

        if (imageFile) {
          const key = `${createDto.authorId}/${imageFile.originalname?.split('.').pop()}`;
          try {
            imageUrl = await this.awsService.uploadFile(
              'product-reviews',
              key,
              imageFile,
            );
            this.logger.log(`Image uploaded successfully: ${imageUrl}`);
          } catch (uploadError) {
            this.logger.error(
              `Failed to upload image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
            );
            throw new BadRequestException(
              'Failed to upload image. Please try again.',
            );
          }
        }
        // Verify user exists
        const user = await tx.user.findUnique({
          where: { id: createDto.authorId },
        });
        if (!user) {
          throw new NotFoundException(
            `User with ID ${createDto.authorId} not found`,
          );
        }

        // Create the review with imageUrl if provided
        const review = await tx.productReviews.create({
          data: {
            productId: createDto.productId,
            authorId: createDto.authorId ?? '',
            review: createDto.review,
            rating: createDto.rating,
            imageUrl: imageUrl,
          },
          include: {
            user: true,
            product: true,
          },
        });

        return ProductReviewMapper.toEntityWithRelations(review);
      });

      // Convert to response DTO
      const responseDto = ProductReviewMapper.toResponseDto(reviewEntity);

      this.logger.log(`Review created successfully: ID=${reviewEntity.id}`);
      return responseDto;
    } catch (error) {
      this.logger.error(
        `Failed to create review: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all product reviews with filtering and pagination
   * @param queryDto - Query parameters for filtering and pagination
   * @returns Paginated list of reviews
   */
  async findAll(
    queryDto: QueryProductReviewsDto,
  ): Promise<PaginatedResponseDto<ProductReviewResponseDto>> {
    try {
      this.logger.log('Fetching product reviews with filters');

      // Set defaults
      const page = queryDto.page ?? 1;
      const limit = queryDto.limit ?? 10;
      const sortBy = queryDto.sortBy ?? 'createdAt';
      const sortOrder = queryDto.sortOrder ?? 'desc';

      const query: QueryProductReviewsDto = {
        ...queryDto,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      // Get reviews from repository
      const { data, total } = await this.productReviewsRepository.findAll(query);

      // Convert to paginated response
      return ProductReviewMapper.toListResponseDto(data, total, page, limit);
    } catch (error) {
      this.logger.error(
        `Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find a single product review by ID
   * @param id - Review ID
   * @param userId - Optional user ID to check if user has liked this review
   * @returns Review with relations
   */
  async findOne(id: string, userId?: string): Promise<ProductReviewResponseDto> {
    try {
      this.logger.log(`Fetching review by ID: ${id}`);

      const reviewEntity = await this.productReviewsRepository.findOne(id);

      if (!reviewEntity) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Check if user has liked this review
      if (userId) {
        reviewEntity.likedByMe = await this.productReviewsRepository.hasUserLikedReview(id, userId);
      }

      return ProductReviewMapper.toResponseDto(reviewEntity);
    } catch (error) {
      this.logger.error(
        `Failed to fetch review ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all reviews for a specific product (with user only) and recipes linked to the product
   * @param productId - Product ID
   * @param queryDto - Optional query parameters for filtering
   * @returns Product reviews (with user) and recipes linked to the product
   */
  async findByProduct(
    productId: string,
    queryDto?: Partial<QueryProductReviewsDto>,
    userId?: string,
  ): Promise<ProductReviewsByProductResponseDto> {
    try {
      this.logger.log(`Fetching reviews and recipes for product: ${productId}`);

      const page = queryDto?.page ?? 1;
      const limit = queryDto?.limit ?? 10;

      const { items: rawItems, total } =
        await this.productReviewsRepository.findByProductId(productId, queryDto);

      const result = new ProductReviewsByProductResponseDto();
      result.items = await Promise.all(
        rawItems.map(async (item) => {
          const dto = new ProductReviewOrRecipeItemDto();
          dto.type = item.type;
          dto.createdAt = item.createdAt;

          if (item.type === 'review') {
            const reviewEntity = item.data;
            reviewEntity.likedByMe = userId
              ? await this.productReviewsRepository.hasUserLikedReview(
                  reviewEntity.id,
                  userId,
                )
              : false;
            dto.likes = reviewEntity.likes ?? 0;
            dto.likedByMe = reviewEntity.likedByMe ?? false;
            dto.review = ProductReviewMapper.toResponseDtoForMergedList(reviewEntity);
          } else {
            const r = item.data;
            const recipeDto = new RecipeSummaryDto();
            recipeDto.id = r.id;
            recipeDto.title = r.title;
            recipeDto.content = r.content;
            recipeDto.authorName = r.authorName;
            recipeDto.category = r.category as RecipeSummaryDto['category'];
            recipeDto.dateOfWriting = r.dateOfWriting;
            recipeDto.views = r.views;
            recipeDto.thumbnailUrl = Array.isArray(r.thumbnailUrl)
              ? r.thumbnailUrl
              : r.thumbnailUrl
                ? [r.thumbnailUrl]
                : [];
            recipeDto.status = r.status;

            dto.likes = r.likes ?? 0;
            dto.likedByMe = userId
              ? await this.recipeRepository.hasUserLikedRecipe(r.id, userId)
              : false;
            dto.recipe = recipeDto;
          }
          return dto;
        }),
      );

      const totalPages = Math.ceil(total / limit);
      result.meta = {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch reviews for product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Find all reviews by a specific user
   * @param authorId - User ID who authored the reviews
   * @returns Array of reviews by the user
   */
  async findByUser(authorId: string): Promise<ProductReviewResponseDto[]> {
    try {
      this.logger.log(`Fetching reviews by user: ${authorId}`);

      const reviewEntities = await this.productReviewsRepository.findByAuthorId(
        authorId,
      );

      return reviewEntities.map((entity) =>
        ProductReviewMapper.toResponseDto(entity),
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch reviews by user ${authorId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Update a product review
   * Verifies that the user owns the review before updating
   * @param id - Review ID
   * @param updateDto - Data to update
   * @param userId - ID of the user making the request
   * @returns Updated review
   */
  async update(
    id: string,
    updateDto: UpdateProductReviewDto,
    userId: string,
  ): Promise<ProductReviewResponseDto> {
    try {
      this.logger.log(`Updating review ${id} by user ${userId}`);

      // Verify review exists
      const existingReview = await this.productReviewsRepository.findOne(id);

      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Verify ownership - only the author can update their review
      if (existingReview.authorId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to update this review',
        );
      }

      // Validate rating if provided
      if (updateDto.rating !== undefined) {
        if (updateDto.rating < 1 || updateDto.rating > 5) {
          throw new BadRequestException('Rating must be between 1.0 and 5.0');
        }
      }

      // Update the review
      const updatedEntity = await this.productReviewsRepository.update(
        id,
        updateDto,
      );

      this.logger.log(`Review updated successfully: ID=${id}`);
      return ProductReviewMapper.toResponseDto(updatedEntity);
    } catch (error) {
      this.logger.error(
        `Failed to update review ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete a product review
   * Verifies that the user owns the review before deleting
   * @param id - Review ID
   * @param userId - ID of the user making the request
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      this.logger.log(`Deleting review ${id} by user ${userId}`);

      // Verify review exists
      const existingReview = await this.productReviewsRepository.findOne(id);

      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      // Verify ownership - only the author can delete their review
      if (existingReview.authorId !== userId) {
        throw new ForbiddenException(
          'You are not authorized to delete this review',
        );
      }

      // Delete the review
      await this.productReviewsRepository.delete(id);

      this.logger.log(`Review deleted successfully: ID=${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete review ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get product review statistics
   * @param productId - Product ID
   * @returns Object with review count, average rating, and rating distribution
   */
  async getProductStats(productId: string): Promise<{
    reviewCount: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    try {
      this.logger.log(`Fetching review stats for product: ${productId}`);

      const stats = await this.productReviewsRepository.getProductReviewStats(
        productId,
      );

      return stats;
    } catch (error) {
      this.logger.error(
        `Failed to fetch stats for product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get user's review for a specific product
   * Useful for checking if a user has already reviewed a product
   * @param productId - Product ID
   * @param userId - User ID
   * @returns User's review or null if not found
   */
  async getUserReviewForProduct(
    productId: string,
    userId: string,
  ): Promise<ProductReviewResponseDto | null> {
    try {
      this.logger.log(
        `Fetching review for product ${productId} by user ${userId}`,
      );

      const reviewEntity = await this.productReviewsRepository.getUserReviewForProduct(
        productId,
        userId,
      );

      if (!reviewEntity) {
        return null;
      }

      return ProductReviewMapper.toResponseDto(reviewEntity);
    } catch (error) {
      this.logger.error(
        `Failed to fetch user review: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Check if user has reviewed a product
   * @param productId - Product ID
   * @param userId - User ID
   * @returns true if user has reviewed the product
   */
  async hasUserReviewedProduct(
    productId: string,
    userId: string,
  ): Promise<boolean> {
    try {
      return await this.productReviewsRepository.hasUserReviewedProduct(
        productId,
        userId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to check user review status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get average rating for a product
   * @param productId - Product ID
   * @returns Average rating
   */
  async getAverageRating(productId: string): Promise<number> {
    try {
      return await this.productReviewsRepository.getAverageRating(productId);
    } catch (error) {
      this.logger.error(
        `Failed to get average rating: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get review count for a product
   * @param productId - Product ID
   * @returns Number of reviews
   */
  async getReviewCount(productId: string): Promise<number> {
    try {
      return await this.productReviewsRepository.getReviewCount(productId);
    } catch (error) {
      this.logger.error(
        `Failed to get review count: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get length of product reviews
   * @param productId - Product ID
   * @returns Number of reviews
   */
  async getLengthOfProductReviews(productId: string): Promise<number> {
    return await this.productReviewsRepository.getLengthOfProductReviews(productId);
  }

  /**
   * Toggle like on a product review
   * @param reviewId - Review ID
   * @param userId - User ID
   * @returns Object with updated review and liked status
   */
  async toggleLike(reviewId: string, userId: string): Promise<{ review: ProductReviewResponseDto; liked: boolean }> {
    try {
      this.logger.log(`Toggling like on review ${reviewId} by user ${userId}`);
      if (!userId) {
        throw new UnauthorizedException ('Need to login to like a review');
      }
      // Check if review exists
      const existingReview = await this.productReviewsRepository.findOne(reviewId);
      if (!existingReview) {
        throw new NotFoundException(`Review with ID ${reviewId} not found`);
      }

      // Toggle like
      const result = await this.productReviewsRepository.toggleLike(reviewId, userId);
      
      // Add likedByMe to entity
      result.review.likedByMe = result.liked;

      this.logger.log(`Like toggled on review ${reviewId}: ${result.liked ? 'liked' : 'unliked'}`);
      
      return {
        review: ProductReviewMapper.toResponseDto(result.review),
        liked: result.liked,
      };
    } catch (error) {
      this.logger.error(
        `Failed to toggle like on review ${reviewId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
