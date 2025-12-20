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

@Injectable()
export class RecipeService {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  /**
   * Create a new recipe
   * - Automatically sets authorId and authorName from authenticated user
   * - Sets dateOfWriting to current timestamp
   * - Initializes views to 0 and status to 'active'
   */
  async create(
    userId: string,
    userName: string,
    createRecipeDto: CreateRecipeDto,
  ): Promise<RecipeEntityWithAuthor> {
    try {
      // Validate user exists
      const authorExists = await this.recipeRepository.authorExists(userId);
      if (!authorExists) {
        throw new BadRequestException('Author user not found');
      }

      // Create recipe with auto-populated fields
      const recipe = await this.recipeRepository.create(
        {
          title: createRecipeDto.title,
          category: createRecipeDto.category,
          thumbnailUrl: createRecipeDto.thumbnailUrl || null,
          content: createRecipeDto.content,
          ingredients: createRecipeDto.ingredients,
          authorName: userName,
          dateOfWriting: new Date(),
          views: 0,
          status: 'active',
          author: {
            connect: { id: userId },
          },
        },
        true,
      );

      return toRecipeEntityWithAuthor(recipe);
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
      if (existingRecipe.authorId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to update this recipe',
        );
      }

      // Update recipe (only provided fields)
      const updatedRecipe = await this.recipeRepository.update(
        id,
        {
          ...(updateRecipeDto.title && { title: updateRecipeDto.title }),
          ...(updateRecipeDto.category && { category: updateRecipeDto.category }),
          ...(updateRecipeDto.thumbnailUrl !== undefined && {
            thumbnailUrl: updateRecipeDto.thumbnailUrl || null,
          }),
          ...(updateRecipeDto.content && { content: updateRecipeDto.content }),
          ...(updateRecipeDto.ingredients && { ingredients: updateRecipeDto.ingredients }),
        },
        true,
      );

      return toRecipeEntityWithAuthor(updatedRecipe);
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
    category: string,
    query?: Partial<RecipeListQueryDto>,
  ): Promise<RecipePaginationResult> {
    try {
      if (!category || category.trim() === '') {
        throw new BadRequestException('Category is required');
      }

      const result = await this.recipeRepository.findAll({
        ...query,
        category: category.trim(),
        status: query?.status || 'active',
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
      status?: string;
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
    status = 'active',
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
    status = 'active',
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
  async getDashboardData(): Promise<{fullRecipeCount: number, activeRecipeCount: number, hiddenRecipeCount: number}> {
    try {
      const fullRecipeCount = await this.recipeRepository.countByFilters({});
      const activeRecipeCount = await this.recipeRepository.countByFilters({status: 'active'});
      const hiddenRecipeCount = await this.recipeRepository.countByFilters({status: 'hidden'});
      return {fullRecipeCount, activeRecipeCount, hiddenRecipeCount};
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
}
