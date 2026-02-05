import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Recipe, User, Product } from '@prisma/client';
import { RecipeListQueryDto } from '../dto/recipe-list-query.dto';
import { ERecipeCategory } from '../enums/recipe.enum';

export type RecipeWithAuthor = Recipe & {
  author?: User | null;
  product?: Product | null;
  _count?: { recipeLikes: number; recipeComments: number };
};

export interface RecipeCountResult {
  total: number;
}

export interface RecipePaginationResult {
  recipes: RecipeWithAuthor[] | any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

@Injectable()
export class RecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new recipe
   */
  async create(
    data: Prisma.RecipeCreateInput,
    includeAuthor = true,
  ): Promise<RecipeWithAuthor> {
    try {
      return await this.prisma.recipe.create({
        data,
        include: includeAuthor ? { author: true } : undefined,
      });
    } catch (error: any) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Find all recipes with pagination and filtering
   */
  async findAll(query: RecipeListQueryDto): Promise<RecipePaginationResult> {
    const {
      page = 1,
      limit = 20,
      category,
      status,
      isActive,
      authorId,
      sortBy = 'createdAt',
      order = 'desc',
      q
    } = query;

    // Build where clause
    const where: Prisma.RecipeWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      // Validate status is one of the allowed values
      if (status === 'approved' || status === 'rejected' || status === 'pending') {
        where.status = status;
      } else {
        throw new BadRequestException('Status must be either "approved", "pending" or "rejected"');
      }
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { author: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy (must match RecipeListQueryDto.sortBy: createdAt | views | alphabetical)
    const orderBy: Prisma.RecipeOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'createdAt':
        orderBy.createdAt = order;
        break;
      case 'views':
        orderBy.views = order;
        break;
      case 'alphabetical':
        orderBy.title = order;
        break;
      default:
        orderBy.createdAt = order;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries
    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { author: true },
      }),
      this.prisma.recipe.count({ where }),
    ]);
    

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      recipes,
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * Find a recipe by ID
   */
  async findById(id: string, includeAuthor = true): Promise<RecipeWithAuthor | null> {
    try {
      return await this.prisma.recipe.findUnique({
        where: { id },
        include: includeAuthor
          ? {
              author: true,
              product: true,
              _count: { select: { recipeLikes: true, recipeComments: true } },
            }
          : undefined,
      });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Find a recipe by ID or throw exception
   */
  async findByIdOrThrow(id: string, includeAuthor = true): Promise<RecipeWithAuthor> {
    const recipe = await this.findById(id, includeAuthor);
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }
    return recipe;
  }

  /**
   * Find recipes by author
   */
  async findByAuthor(
    authorId: string,
    options?: {
      page?: number;
      limit?: number;
      isActive?: boolean;
      includeAuthor?: boolean;
    },
  ): Promise<RecipeWithAuthor[]> {
    const { page = 1, limit = 20, isActive, includeAuthor = true } = options || {};

    const where: Prisma.RecipeWhereInput = { authorId };

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const skip = (page - 1) * limit;

    return await this.prisma.recipe.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: includeAuthor ? { author: true } : undefined,
    });
  }

  /**
   * Update a recipe
   */
  async update(
    id: string,
    data: Prisma.RecipeUpdateInput,
    includeAuthor = true,
  ): Promise<RecipeWithAuthor> {
    try {
      return await this.prisma.recipe.update({
        where: { id },
        data,
        include: includeAuthor ? { author: true } : undefined,
      });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Delete a recipe
   */
  async delete(id: string): Promise<void> {
    try {
      await this.prisma.recipe.delete({ where: { id } });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Increment recipe views
   */
  async incrementViews(id: string): Promise<RecipeWithAuthor> {
    try {
      return await this.prisma.recipe.update({
        where: { id },
        data: {
          views: { increment: 1 },
        },
        include: { author: true },
      });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Count recipes by filters
   */
  async countByFilters(query: Partial<RecipeListQueryDto>): Promise<number> {
    const { category, status, isActive, authorId, q } = query;

    const where: Prisma.RecipeWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      // Validate status is one of the allowed values
      if (status === 'approved' || status === 'rejected' || status === 'pending') {
        where.status = status;
      } else {
        throw new BadRequestException('Status must be either "approved", "pending" or "rejected"');
      }
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { author: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    return await this.prisma.recipe.count({ where });
  }

  /**
   * Count recipes by category
   */
  async countByCategory(category: ERecipeCategory): Promise<number> {
    return await this.prisma.recipe.count({ where: { category } });
  }

  /**
   * Count recipes by status
   */
  async countByStatus(status: 'approved' | 'rejected' | 'pending'): Promise<number> {
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      throw new BadRequestException('Status must be either "approved", "pending" or "rejected"');
    }
    return await this.prisma.recipe.count({ where: { status } });
  }

  /**
   * Count recipes by author
   */
  async countByAuthor(authorId: string): Promise<number> {
    return await this.prisma.recipe.count({ where: { authorId } });
  }

  /**
   * Check if author exists
   */
  async authorExists(authorId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: authorId } });
    return !!user;
  }

  /**
   * Get all categories (distinct)
   */
  async getCategories(): Promise<string[]> {
    const categories = await this.prisma.recipe.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return categories.map((c) => c.category);
  }

  /**
   * Get popular recipes (by views)
   */
  async getPopularRecipes(limit = 10, status: 'approved' | 'rejected' | 'pending' = 'approved'): Promise<RecipeWithAuthor[]> {
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      throw new BadRequestException('Status must be either "approved", "pending" or "rejected"');
    }
    return await this.prisma.recipe.findMany({
      where: { status },
      orderBy: { views: 'desc' },
      take: limit,
      include: { author: true },
    });
  }

  /**
   * Get recent recipes
   */
  async getRecentRecipes(limit = 10, status: 'approved' | 'rejected' | 'pending' = 'approved'): Promise<RecipeWithAuthor[]> {
    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      throw new BadRequestException('Status must be either "approved", "pending" or "rejected"');
    }
    return await this.prisma.recipe.findMany({
      where: { status },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { author: true },
    });
  }

  /**
   * Handle Prisma errors
   */
  private handlePrismaError(error: any, id?: string): never {
    if (error?.code === 'P2025') {
      throw new NotFoundException(`Recipe with id ${id ?? ''} not found`.trim());
    }
    if (error?.code === 'P2003') {
      throw new BadRequestException('Invalid recipe data: foreign key constraint failed');
    }
    if (error?.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      throw new BadRequestException(`Recipe with this ${field} already exists`);
    }
    throw error;
  }
  async deactivate(id: string): Promise<void> {
    try {
      await this.prisma.recipe.update({ where: { id }, data: { updatedAt: new Date(), isActive: false } });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }
  async activate(id: string): Promise<void> {
    try {
      await this.prisma.recipe.update({ where: { id }, data: { updatedAt: new Date(), isActive: true } });
    } catch (error: any) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Check if a user has liked a recipe
   * @param recipeId - Recipe ID
   * @param userId - User ID
   * @returns true if user has liked the recipe
   */
  async hasUserLikedRecipe(recipeId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.recipeLikes.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId,
        },
      },
    });
    return !!like;
  }

  /**
   * Like a recipe
   * @param recipeId - Recipe ID
   * @param userId - User ID
   * @returns Updated recipe
   */
  async likeRecipe(recipeId: string, userId: string): Promise<RecipeWithAuthor> {
    try {
      // Use transaction to create like and increment count atomically
      return await this.prisma.$transaction(async (tx) => {
        // Create the like record
        await tx.recipeLikes.create({
          data: {
            userId,
            recipeId,
          },
        });

        // Increment the likes count on the recipe
        const updatedRecipe = await tx.recipe.update({
          where: { id: recipeId },
          data: {
            likes: { increment: 1 },
          },
          include: { author: true, product: true },
        });

        return updatedRecipe;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('You have already liked this recipe');
      }
      this.handlePrismaError(error, recipeId);
    }
  }

  /**
   * Unlike a recipe
   * @param recipeId - Recipe ID
   * @param userId - User ID
   * @returns Updated recipe
   */
  async unlikeRecipe(recipeId: string, userId: string): Promise<RecipeWithAuthor> {
    try {
      // Use transaction to delete like and decrement count atomically
      return await this.prisma.$transaction(async (tx) => {
        // Delete the like record
        await tx.recipeLikes.delete({
          where: {
            userId_recipeId: {
              userId,
              recipeId,
            },
          },
        });

        // Decrement the likes count on the recipe (ensure it doesn't go below 0)
        const currentRecipe = await tx.recipe.findUnique({ where: { id: recipeId } });
        const newLikes = Math.max((currentRecipe?.likes ?? 0) - 1, 0);

        const updatedRecipe = await tx.recipe.update({
          where: { id: recipeId },
          data: {
            likes: newLikes,
          },
          include: { author: true, product: true },
        });

        return updatedRecipe;
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new BadRequestException('You have not liked this recipe');
      }
      this.handlePrismaError(error, recipeId);
    }
  }

  /**
   * Toggle like on a recipe
   * @param recipeId - Recipe ID
   * @param userId - User ID
   * @returns Object with updated recipe and whether it's now liked
   */
  async toggleLike(recipeId: string, userId: string): Promise<{ recipe: RecipeWithAuthor; liked: boolean }> {
    const hasLiked = await this.hasUserLikedRecipe(recipeId, userId);
    
    if (hasLiked) {
      const recipe = await this.unlikeRecipe(recipeId, userId);
      return { recipe, liked: false };
    } else {
      const recipe = await this.likeRecipe(recipeId, userId);
      return { recipe, liked: true };
    }
  }
}

