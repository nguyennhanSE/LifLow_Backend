import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma, Recipe, User } from '@prisma/client';
import { CreateRecipeCommentDto } from '../dto/create-recipe-comment.dto';
import { UpdateRecipeCommentDto } from '../dto/update-recipe-comment.dto';
import { QueryRecipeCommentsDto } from '../dto/query-recipe-comments.dto';

// Note: RecipeComments type will be available after running: npx prisma generate
// The Prisma client method is: prisma.recipeComments (camelCase)
type RecipeComments = {
  id: string;
  recipeId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RecipeCommentWithRelations = RecipeComments & {
  author?: Pick<User, 'id' | 'name' | 'email'> | null;
  recipe?: Pick<Recipe, 'id' | 'title'> | null;
};

@Injectable()
export class RecipeCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Type assertion helper for Prisma client
  // Note: This will work correctly once Prisma client is generated with: npx prisma generate
  // The model name in schema is "RecipeComments", so Prisma generates: prisma.recipeComments
  private get recipeComments() {
    return (this.prisma as any).recipeComments;
  }

  /**
   * Create a new recipe comment
   */
  async create(data: CreateRecipeCommentDto): Promise<RecipeCommentWithRelations> {
    try {
      return await this.recipeComments.create({
        data: {
          recipeId: data.recipeId,
          authorId: data.authorId,
          content: data.content,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipe: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  /**
   * Find all recipe comments with pagination, filtering, and sorting
   */
  async findAll(query: QueryRecipeCommentsDto): Promise<{ data: RecipeCommentWithRelations[]; total: number }> {
    const {
      recipeId,
      authorId,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    // Note: Prisma.RecipeCommentsWhereInput will be available after running: npx prisma generate
    const where: any = {};

    if (recipeId) {
      where.recipeId = recipeId;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    // Build orderBy
    // Note: Prisma.RecipeCommentsOrderByWithRelationInput will be available after running: npx prisma generate
    const orderBy: any = {};
    
    switch (sortBy) {
      case 'createdAt':
        orderBy.createdAt = sortOrder;
        break;
      case 'updatedAt':
        orderBy.updatedAt = sortOrder;
        break;
      default:
        orderBy.createdAt = sortOrder;
    }

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [data, total] = await Promise.all([
      this.recipeComments.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipe: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.recipeComments.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Find a recipe comment by ID
   */
  async findOne(id: string): Promise<RecipeCommentWithRelations | null> {
    try {
      return await this.recipeComments.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipe: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Find all comments for a specific recipe
   */
  async findByRecipeId(
    recipeId: string,
    page?: number,
    limit?: number,
  ): Promise<RecipeCommentWithRelations[]> {
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit;

    return await this.recipeComments.findMany({
      where: { recipeId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Update a recipe comment by ID
   */
  async update(id: string, data: UpdateRecipeCommentDto): Promise<RecipeCommentWithRelations> {
    try {
      // Build update data
      // Note: Prisma.RecipeCommentsUpdateInput will be available after running: npx prisma generate
      const updateData: any = {};

      if (data.recipeId !== undefined) {
        updateData.recipeId = data.recipeId;
      }

      if (data.authorId !== undefined) {
        updateData.authorId = data.authorId;
      }

      if (data.content !== undefined) {
        updateData.content = data.content;
      }

      return await this.recipeComments.update({
        where: { id },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          recipe: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Delete a recipe comment by ID
   */
  async delete(id: string): Promise<RecipeCommentWithRelations> {
    try {
      // First, get the comment to return it after deletion
      const comment = await this.findOne(id);
      
      if (!comment) {
        throw new NotFoundException(`Recipe comment with id ${id} not found`);
      }

      // Delete the comment
      await this.recipeComments.delete({
        where: { id },
      });

      return comment;
    } catch (error: unknown) {
      this.handlePrismaError(error, id);
    }
  }

  /**
   * Count total comments for a recipe
   */
  async countByRecipeId(recipeId: string): Promise<number> {
    return await this.recipeComments.count({
      where: { recipeId },
    });
  }

  /**
   * Handle Prisma errors
   */
  private handlePrismaError(error: unknown, id?: string): never {
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] } };
      
      if (prismaError.code === 'P2025') {
        throw new NotFoundException(`Recipe comment with id ${id ?? ''} not found`.trim());
      }
      if (prismaError.code === 'P2003') {
        throw new BadRequestException('Invalid recipe comment data: foreign key constraint failed');
      }
      if (prismaError.code === 'P2002') {
        const field = prismaError.meta?.target?.[0] || 'field';
        throw new BadRequestException(`Recipe comment with this ${field} already exists`);
      }
    }
    throw error;
  }
}

