import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { RecipeCommentService } from './recipe-comment.service';
import {
  CreateRecipeCommentDto,
  UpdateRecipeCommentDto,
  QueryRecipeCommentsDto,
  RecipeCommentResponseDto,
} from './dto';
import { AuthGuard } from '../../../guard/auth.guard';
import { RolesGuard } from '../../../guard/role.guard';
import { Public } from '../../../libs/decorator/public.decorator';
import { Roles } from '../../../libs/decorator/roles.decorator';
import { ERoleName } from '../../roles/enums/role.enum';
import {
  successResponse,
  paginationResponse,
} from '../../../utils/responseFormatter';
import { ResponseModel } from '../../../libs/models/response/response.model';

/**
 * Interface for authenticated request with user info
 */
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    id?: string;
    email?: string;
    roles?: string[];
  };
}

@ApiBearerAuth()
@ApiTags('Recipe Comments')
@Controller('recipe-comments')
@UseGuards(AuthGuard, RolesGuard)
export class RecipeCommentController {
  constructor(private readonly recipeCommentService: RecipeCommentService) {}

  /**
   * Create a new recipe comment
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Create a new recipe comment',
    description: 'Creates a new comment on a recipe. Requires authentication.',
  })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: RecipeCommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - authorId must match authenticated user',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe or user not found',
  })
  async create(
    @Body() createDto: CreateRecipeCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const userId = req.user.sub || req.user.id;
      if (!userId) {
        throw new Error('User ID not found in request');
      }
      const comment = await this.recipeCommentService.create(createDto, userId);
      const result = successResponse(comment, 'Comment created successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all recipe comments with pagination and filters
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get paginated list of recipe comments',
    description: 'Retrieves a paginated list of recipe comments with optional filtering and sorting.',
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  async findAll(@Query() query: QueryRecipeCommentsDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.recipeCommentService.findAll(query);
      const data = paginationResponse(
        result.data,
        result.total,
        result.page,
        result.limit,
        'Comments retrieved successfully',
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all comments for a specific recipe
   * Note: This route must come before @Get(':id') to avoid route conflicts
   */
  @Get('recipes/:recipeId/comments')
  @Public()
  @ApiOperation({
    summary: 'Get comments for a recipe',
    description: 'Retrieves all comments for a specific recipe with pagination.',
  })
  @ApiParam({
    name: 'recipeId',
    type: String,
    description: 'Recipe UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async findByRecipe(
    @Param('recipeId', ParseUUIDPipe) recipeId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const responseModel = new ResponseModel();

    try {
      const comments = await this.recipeCommentService.findByRecipe(
        recipeId,
        page || 1,
        limit || 10,
      );
      const result = successResponse(
        comments,
        `Retrieved ${comments.length} comments for recipe`,
      );
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get a single recipe comment by ID
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get recipe comment by ID',
    description: 'Retrieves a single recipe comment by its ID.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Comment UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment retrieved successfully',
    type: RecipeCommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();

    try {
      const comment = await this.recipeCommentService.findOne(id);
      const result = successResponse(comment, 'Comment retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Update a recipe comment
   */
  @Patch(':id')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Update a recipe comment',
    description: 'Updates an existing comment. Only the comment author can update it.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Comment UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: RecipeCommentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or invalid UUID',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not own this comment',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateRecipeCommentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const userId = req.user.sub || req.user.id;
      if (!userId) {
        throw new Error('User ID not found in request');
      }
      const comment = await this.recipeCommentService.update(
        id,
        updateDto,
        userId,
      );
      const result = successResponse(comment, 'Comment updated successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Delete a recipe comment
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Delete a recipe comment',
    description: 'Deletes a comment. Only the comment author can delete it.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Comment UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not own this comment',
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const userId = req.user.sub || req.user.id;
      if (!userId) {
        throw new Error('User ID not found in request');
      }
      await this.recipeCommentService.delete(id, userId);
    } catch (error) {
      throw error;
    }
  }
}

