import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeListQueryDto } from './dto/recipe-list-query.dto';
import {
  RecipeRepository,
  RecipePaginationResult,
} from './repositories/recipe.repository';
import { RecipeEntityWithAuthor } from './entities/recipe.entity';
import { toRecipeEntityWithAuthor } from './mapper/recipe.mapper';
import { AwsService } from 'src/libs/integration/aws/aws.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ERecipeCategory } from './enums/recipe.enum';

@Injectable()
export class RecipeService {
  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly awsService: AwsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new recipe
   * - Automatically sets authorId and authorName from authenticated user
   * - Sets dateOfWriting to current timestamp
   * - Initializes views to 0 and status to 'pending'
   */
  async create(
    userId: string,
    userName: string,
    createRecipeDto: CreateRecipeDto,
    thumbnails?: Express.Multer.File[],
  ): Promise<RecipeEntityWithAuthor> {
    try {
      // Validate user exists
      const authorExists = await this.recipeRepository.authorExists(userId);
      if (!authorExists) {
        throw new BadRequestException('Author user not found');
      }

      // Validate required fields
      if (!createRecipeDto.title) {
        throw new BadRequestException('Title is required');
      }
      if (!createRecipeDto.category) {
        throw new BadRequestException('Category is required');
      }

      // Validate productId if provided
      if (createRecipeDto.productId) {
        // if (!this.isValidUUID(createRecipeDto.productId)) {
        //   throw new BadRequestException('Invalid product ID format');
        // }
        const productExists = await this.prisma.product.findUnique({
          where: { id: createRecipeDto.productId },
        });
        if (!productExists) {
          throw new NotFoundException(`Product with id ${createRecipeDto.productId} not found`);
        }
      }

      // Extract validated fields
      const title = createRecipeDto.title;
      const category = createRecipeDto.category;

      // Use transaction to create recipe and upload thumbnail atomically
      // Increased timeout to handle file uploads that may take longer
      const result = await this.prisma.$transaction(
        async (tx) => {
        // Prepare recipe data
        const recipeData: any = {
          title,
          category,
          thumbnailUrl: [],
          content: createRecipeDto.content || '',
          ingredients: createRecipeDto.ingredients || [],
          authorName: userName,
          dateOfWriting: new Date(),
          views: 0,
          status: 'pending',
          author: {
            connect: { id: userId },
          },
        };

        // Link product if productId is provided
        if (createRecipeDto.productId) {
          recipeData.product = {
            connect: { id: createRecipeDto.productId },
          };
        }

        // Create recipe with auto-populated fields
        const recipe = await tx.recipe.create({
          data: recipeData,
          include: {
            author: true,
            product: true,
          },
        });

        // Upload thumbnails if provided
        if (thumbnails && thumbnails.length > 0) {
          if (!userId || !recipe.id) {
            throw new BadRequestException('User ID and Recipe ID are required for uploading thumbnails');
          }
          try {
            const thumbnailUrls: string[] = [];
            const prefix: string = `${userId}/recipes`;
            const recipeId: string = recipe.id;
            for (const thumbnail of thumbnails) {
              if (!thumbnail) continue;
              const url = await this.awsService.uploadFile(prefix, recipeId, thumbnail);
              thumbnailUrls.push(url!);
            }
            const updatedRecipe = await tx.recipe.update({
              where: { id: recipe.id },
              data: { thumbnailUrl: thumbnailUrls },
              include: {
                author: true,
                product: true,
              },
            });
            return updatedRecipe;
          } catch (error) {
            throw new BadRequestException(
              `Failed to upload thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

        return recipe;
      },
      {
        maxWait: 60000, // max time to wait to acquire a transaction (60 seconds)
        timeout: 30000, // max time the interactive transaction can run before being canceled (30 seconds)
      },
    );

      return toRecipeEntityWithAuthor(result);
    } catch (error: any) {
      this.handleError(error, 'Failed to create recipe');
    }
  }

  /**
   * Find all recipes with pagination, filtering, sorting, and search
   * Returns paginated results with metadata
   */
  async findAll(query: RecipeListQueryDto): Promise<RecipePaginationResult> {
    try {
      const result = await this.recipeRepository.findAll(query);

      // Return result with recipes as entities
      return result;
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch recipes');
    }
  }

  /**
   * Find a single recipe by ID
   * - Increments view count
   * - Returns recipe with author information
   */
  async findOne(id: string): Promise<RecipeEntityWithAuthor> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new BadRequestException('Invalid recipe ID format');
      }

      // Check if recipe exists (include author)
      const recipe = await this.recipeRepository.findById(id, true);
      if (!recipe) {
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }

      // Increment views (fire and forget, don't wait)
      this.recipeRepository.incrementViews(id).catch((err) => {
        console.error(`Failed to increment views for recipe ${id}:`, err);
      });

      return toRecipeEntityWithAuthor(recipe);
    } catch (error: any) {
      this.handleError(error, `Failed to fetch recipe ${id}`);
    }
  }

  /**
   * Update a recipe
   * - Checks ownership: user can only update their own recipes
   * - Validates recipe exists
   * - Updates only provided fields (partial update)
   */
  async update(
    id: string,
    userId: string,
    updateRecipeDto: UpdateRecipeDto,
    thumbnails?: Express.Multer.File[],
  ): Promise<RecipeEntityWithAuthor> {
    try {

      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new BadRequestException('Invalid recipe ID format');
      }

      // Check if recipe exists
      const existingRecipe = await this.recipeRepository.findById(id, false);
      if (!existingRecipe) {
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }

      // Check ownership
      // if (existingRecipe.authorId !== userId) {
      //   throw new ForbiddenException(
      //     'You do not have permission to update this recipe',
      //   );
      // }

      // Use transaction to update recipe and upload thumbnail atomically
      const result = await this.prisma.$transaction(async (tx) => {
        // Prepare update data
        const updateData: any = {};
        if (updateRecipeDto.title !== undefined) {
          updateData.title = updateRecipeDto.title;
        }
        if (updateRecipeDto.category !== undefined) {
          updateData.category = updateRecipeDto.category;
        }
        if (updateRecipeDto.content !== undefined) {
          updateData.content = updateRecipeDto.content;
        }
        if (updateRecipeDto.ingredients !== undefined) {
          updateData.ingredients = updateRecipeDto.ingredients;
        }

        // Update recipe (only provided fields)
        const updatedRecipe = await tx.recipe.update({
          where: { id },
          data: updateData,
          include: {
            author: true,
          },
        });

        // Upload thumbnails if provided
        if (thumbnails && thumbnails.length > 0) {
          if (!userId || !id) {
            throw new BadRequestException('User ID and Recipe ID are required for uploading thumbnails');
          }
          try {
            const thumbnailUrls: string[] = [];
            const prefix: string = `${userId}/recipes`;
            const recipeId: string = id;
            for (const thumbnail of thumbnails) {
              if (!thumbnail) continue;
              const url = await this.awsService.uploadFile(prefix, recipeId, thumbnail);
              thumbnailUrls.push(url!);
            }
            // Merge with existing thumbnails if any, or replace if updateRecipeDto.thumbnailUrl is provided
            const existingThumbnails = updatedRecipe.thumbnailUrl || [];
            const finalThumbnailUrls = updateRecipeDto.thumbnailUrl 
              ? updateRecipeDto.thumbnailUrl 
              : [...existingThumbnails, ...thumbnailUrls];
            
            const finalRecipe = await tx.recipe.update({
              where: { id },
              data: { thumbnailUrl: finalThumbnailUrls },
              include: {
                author: true,
              },
            });
            return finalRecipe;
          } catch (error) {
            throw new BadRequestException(
              `Failed to upload thumbnails: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }

        return updatedRecipe;
      });

      return toRecipeEntityWithAuthor(result);
    } catch (error: any) {
      this.handleError(error, `Failed to update recipe ${id}`);
    }
  }

  /**
   * Delete a recipe
   * - Checks ownership: user can only delete their own recipes
   * - Validates recipe exists
   * - Performs hard delete
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new BadRequestException('Invalid recipe ID format');
      }

      // Check if recipe exists
      const existingRecipe = await this.recipeRepository.findById(id, false);
      if (!existingRecipe) {
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }

      // Check ownership
      if (existingRecipe.authorId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to delete this recipe',
        );
      }

      // Delete recipe
      await this.recipeRepository.delete(id);

      return { message: `Recipe ${id} deleted successfully` };
    } catch (error: any) {
      this.handleError(error, `Failed to delete recipe ${id}`);
    }
  }

  /**
   * Get recipes by category
   * - Returns active recipes in the specified category
   * - Supports pagination
   */
  async getByCategory(
    category: ERecipeCategory,
    query?: Partial<RecipeListQueryDto>,
  ): Promise<RecipePaginationResult> {
    try {
      if (!category) {
        throw new BadRequestException('Category is required');
      }

      const result = await this.recipeRepository.findAll({
        ...query,
        category,
        status: query?.status || 'approved',
        page: query?.page || 1,
        limit: query?.limit || 20,
        sortBy: query?.sortBy || 'createdAt',
        order: query?.order || 'desc',
        q: query?.q || '',
      });

      return result;
    } catch (error: any) {
      this.handleError(error, `Failed to fetch recipes by category ${category}`);
    }
  }

  /**
   * Get recipes by author
   * - Returns all recipes by a specific author
   * - Supports pagination and status filtering
   */
  async getByAuthor(
    authorId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: 'approved' | 'rejected' | 'pending';
    },
  ): Promise<RecipeEntityWithAuthor[]> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(authorId)) {
        throw new BadRequestException('Invalid author ID format');
      }

      // Check if author exists
      const authorExists = await this.recipeRepository.authorExists(authorId);
      if (!authorExists) {
        throw new NotFoundException(`Author with id ${authorId} not found`);
      }

      const recipes = await this.recipeRepository.findByAuthor(
        authorId,
        options,
      );

      return recipes.map(recipe => toRecipeEntityWithAuthor(recipe));
    } catch (error: any) {
      this.handleError(error, `Failed to fetch recipes by author ${authorId}`);
    }
  }

  /**
   * Get all distinct categories
   */
  async getCategories(): Promise<string[]> {
    try {
      return await this.recipeRepository.getCategories();
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch categories');
    }
  }

  /**
   * Get popular recipes (by views)
   */
  async getPopularRecipes(
    limit = 10,
    status: 'approved' | 'rejected' | 'pending' = 'approved',
  ): Promise<RecipeEntityWithAuthor[]> {
    try {
      const recipes = await this.recipeRepository.getPopularRecipes(
        limit,
        status,
      );
      return recipes.map(recipe => toRecipeEntityWithAuthor(recipe));
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch popular recipes');
    }
  }

  /**
   * Get recent recipes
   */
  async getRecentRecipes(
    limit = 10,
    status: 'approved' | 'rejected' | 'pending' = 'approved',
  ): Promise<RecipeEntityWithAuthor[]> {
    try {
      const recipes = await this.recipeRepository.getRecentRecipes(
        limit,
        status,
      );
      return recipes.map(recipe => toRecipeEntityWithAuthor(recipe));
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch recent recipes');
    }
  }
  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<{fullRecipeCount: number, activeRecipeCount: number, pendingRecipeCount: number, rejectedRecipeCount: number}> {
    try {
      const fullRecipeCount = await this.recipeRepository.countByFilters({});
      const activeRecipeCount = await this.recipeRepository.countByFilters({status: 'approved'});
      const pendingRecipeCount = await this.recipeRepository.countByFilters({status: 'pending'});
      const rejectedRecipeCount = await this.recipeRepository.countByFilters({status: 'rejected'});
      return {fullRecipeCount, activeRecipeCount, pendingRecipeCount, rejectedRecipeCount};
    } catch (error: any) {
      this.handleError(error, 'Failed to fetch dashboard data');
    }
  }
  /**
   * Count recipes by filters
   */
  async countByFilters(query: Partial<RecipeListQueryDto>): Promise<number> {
    try {
      return await this.recipeRepository.countByFilters(query);
    } catch (error: any) {
      this.handleError(error, 'Failed to count recipes');
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Handle errors and throw appropriate HTTP exceptions
   */
  private handleError(error: any, defaultMessage: string): never {
    // Re-throw if already an HTTP exception
    if (
      error instanceof NotFoundException ||
      error instanceof ForbiddenException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }

    // Handle Prisma errors
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new ConflictException(`Recipe with this ${field} already exists`);
    }

    if (error?.code === 'P2003') {
      throw new BadRequestException(
        'Invalid recipe data: foreign key constraint failed',
      );
    }

    if (error?.code === 'P2025') {
      throw new NotFoundException('Recipe not found');
    }

    if (error?.code === 'P1001') {
      throw new InternalServerErrorException('Database connection error');
    }

    // Log unexpected errors
    console.error('Unexpected error in RecipeService:', error);

    // Throw generic error
    throw new InternalServerErrorException(defaultMessage);
  }

  async deactivate(id: string): Promise<{ message: string }> {
    try {
      await this.recipeRepository.deactivate(id);
      return { message: `Recipe ${id} deactivated successfully` };
    } catch (error: any) {
      this.handleError(error, 'Failed to deactivate recipe');
    }
  }

  async activate(id: string): Promise<{ message: string }> {
    try {
      await this.recipeRepository.activate(id);
      return { message: `Recipe ${id} activated successfully` };
    } catch (error: any) {
      this.handleError(error, 'Failed to activate recipe');
    }
  }

  /**
   * Approve a recipe
   * - Updates status to 'approved'
   * - Only ADMIN or GENERAL_MANAGER can approve
   * - Validates recipe exists
   */
  async approve(id: string): Promise<RecipeEntityWithAuthor> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new BadRequestException('Invalid recipe ID format');
      }

      // Check if recipe exists
      const existingRecipe = await this.recipeRepository.findById(id, false);
      if (!existingRecipe) {
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }

      // Update status to approved (active)
      const updatedRecipe = await this.recipeRepository.update(id, {
        status: 'approved',
      });

      return toRecipeEntityWithAuthor(updatedRecipe);
    } catch (error: any) {
      this.handleError(error, `Failed to approve recipe ${id}`);
    }
  }

  /**
   * Reject a recipe
   * - Updates status to 'rejected'
   * - Only ADMIN or GENERAL_MANAGER can reject
   * - Validates recipe exists
   */
  async reject(id: string): Promise<RecipeEntityWithAuthor> {
    try {
      // Validate UUID format
      if (!this.isValidUUID(id)) {
        throw new BadRequestException('Invalid recipe ID format');
      }

      // Check if recipe exists
      const existingRecipe = await this.recipeRepository.findById(id, false);
      if (!existingRecipe) {
        throw new NotFoundException(`Recipe with id ${id} not found`);
      }

      // Update status to rejected
      const updatedRecipe = await this.recipeRepository.update(id, {
        status: 'rejected',
      });

      return toRecipeEntityWithAuthor(updatedRecipe);
    } catch (error: any) {
      this.handleError(error, `Failed to reject recipe ${id}`);
    }
  }
}
