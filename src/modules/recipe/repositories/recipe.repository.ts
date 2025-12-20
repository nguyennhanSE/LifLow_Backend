import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Recipe, User } from '@prisma/client';
import { RecipeListQueryDto } from '../dto/recipe-list-query.dto';

export type RecipeWithAuthor = Recipe & { author?: User | null };

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
      where.status = status;
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

    // Build orderBy
    const orderBy: Prisma.RecipeOrderByWithRelationInput = {};
    
    switch (sortBy) {
      case 'createdAt':
        orderBy.createdAt = order;
        break;
      case 'updatedAt':
        orderBy.updatedAt = order;
        break;
      case 'dateOfWriting':
        orderBy.dateOfWriting = order;
        break;
      case 'views':
        orderBy.views = order;
        break;
      case 'title':
        orderBy.title = order;
        break;
      case 'category':
        orderBy.category = order;
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
        include: includeAuthor ? { author: true } : undefined,
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
      status?: string;
      includeAuthor?: boolean;
    },
  ): Promise<RecipeWithAuthor[]> {
    const { page = 1, limit = 20, status, includeAuthor = true } = options || {};

    const where: Prisma.RecipeWhereInput = { authorId };
    
    if (status) {
      where.status = status;
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
    const { category, status, authorId, q } = query;

    const where: Prisma.RecipeWhereInput = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
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
  async countByCategory(category: string): Promise<number> {
    return await this.prisma.recipe.count({ where: { category } });
  }

  /**
   * Count recipes by status
   */
  async countByStatus(status: string): Promise<number> {
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
  async getPopularRecipes(limit = 10, status = 'Active'): Promise<RecipeWithAuthor[]> {
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
  async getRecentRecipes(limit = 10, status = 'active'): Promise<RecipeWithAuthor[]> {
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
}

