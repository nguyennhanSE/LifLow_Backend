import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { RecipeCommentRepository, RecipeCommentWithRelations } from './repositories/recipe-comment.repository';
import { RecipeRepository } from '../repositories/recipe.repository';
import { PrismaService } from 'prisma/prisma.service';
import {
  CreateRecipeCommentDto,
  UpdateRecipeCommentDto,
  QueryRecipeCommentsDto,
  RecipeCommentResponseDto,
} from './dto';

@Injectable()
export class RecipeCommentService {
  constructor(
    private readonly recipeCommentRepository: RecipeCommentRepository,
    private readonly recipeRepository: RecipeRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a new recipe comment
   */
  async create(
    createDto: CreateRecipeCommentDto,
    userId: string,
  ): Promise<RecipeCommentResponseDto> {
    // Verify recipe exists
    const recipe = await this.recipeRepository.findById(createDto.recipeId);
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${createDto.recipeId} not found`);
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Create comment using repository
    const comment = await this.recipeCommentRepository.create(createDto, userId);

    // Transform to ResponseDto
    return plainToInstance(RecipeCommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all recipe comments with pagination
   */
  async findAll(
    query: QueryRecipeCommentsDto,
  ): Promise<{
    data: RecipeCommentResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Call repository.findAll
    const result = await this.recipeCommentRepository.findAll(query);

    // Transform results to ResponseDto array
    const data = result.data.map((comment) =>
      plainToInstance(RecipeCommentResponseDto, comment, {
        excludeExtraneousValues: true,
      }),
    );

    return {
      data,
      total: result.total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  }

  /**
   * Find a single recipe comment by ID
   */
  async findOne(id: string): Promise<RecipeCommentResponseDto> {
    // Call repository.findOne
    const comment = await this.recipeCommentRepository.findOne(id);

    // Throw NotFoundException if not found
    if (!comment) {
      throw new NotFoundException(`Recipe comment with id ${id} not found`);
    }

    // Transform to ResponseDto
    return plainToInstance(RecipeCommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Find all comments for a specific recipe
   */
  async findByRecipe(
    recipeId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<RecipeCommentResponseDto[]> {
    // Verify recipe exists
    const recipe = await this.recipeRepository.findById(recipeId);
    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${recipeId} not found`);
    }

    // Call repository.findByRecipeId
    const comments = await this.recipeCommentRepository.findByRecipeId(
      recipeId,
      page,
      limit,
    );

    // Transform to ResponseDto array
    return comments.map((comment) =>
      plainToInstance(RecipeCommentResponseDto, comment, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * Update a recipe comment
   */
  async update(
    id: string,
    updateDto: UpdateRecipeCommentDto,
    userId: string,
  ): Promise<RecipeCommentResponseDto> {
    // Find existing comment
    const existingComment = await this.recipeCommentRepository.findOne(id);
    if (!existingComment) {
      throw new NotFoundException(`Recipe comment with id ${id} not found`);
    }

    // Verify userId is the comment author
    if (existingComment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    // Update using repository
    const updatedComment = await this.recipeCommentRepository.update(id, updateDto);

    // Transform to ResponseDto
    return plainToInstance(RecipeCommentResponseDto, updatedComment, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Delete a recipe comment
   */
  async delete(id: string, userId: string): Promise<void> {
    // Find existing comment
    const existingComment = await this.recipeCommentRepository.findOne(id);
    if (!existingComment) {
      throw new NotFoundException(`Recipe comment with id ${id} not found`);
    }

    // Verify userId is the comment author
    if (existingComment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Delete using repository
    await this.recipeCommentRepository.delete(id);
  }

  /**
   * Get comment count for a recipe
   */
  async getCommentCount(recipeId: string): Promise<number> {
    // Call repository.countByRecipeId
    return await this.recipeCommentRepository.countByRecipeId(recipeId);
  }
}

