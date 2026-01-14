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
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RecipeService } from './recipe.service';
import {
  CreateRecipeDto,
  UpdateRecipeDto,
  RecipeListQueryDto,
} from './dto';
import { Public } from '../../libs/decorator/public.decorator';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import {
  successResponse,
  paginationResponse,
} from '../../utils/responseFormatter';
import { ResponseModel } from '../../libs/models/response/response.model';
import { RecipeUserInterceptor } from './interceptors/recipe.interceptor';
import { ERecipeCategory } from './enums/recipe.enum';

/**
 * Interface for authenticated request with user info
 * Note: Adjust based on your JWT payload structure
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    name: string;
    email?: string;
    roles?: string[];
  };
}
@ApiBearerAuth()
@ApiTags('Recipes')
@Controller('recipe')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  /**
   * Create a new recipe (authenticated users only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @UseInterceptors(
    RecipeUserInterceptor,
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
    ])
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new recipe',
    description: 'Creates a new recipe. Requires authentication. Author information is automatically set from the authenticated user.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create recipe with optional thumbnail image',
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Recipe title (required)',
          example: 'Delicious Homemade Pasta Recipe',
          maxLength: 255,
        },
        category: {
          type: 'enum',
          enum: Object.values(ERecipeCategory),
          description: 'Recipe category (required)',
          example: ERecipeCategory.RECIPE,
        },
        content: {
          type: 'string',
          description: 'Recipe content (detailed instructions and ingredients)',
          example: 'This is the full recipe content with ingredients and instructions...',
        },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recipe ingredients',
          example: ['Pasta', 'Tomato', 'Garlic', 'Cheese'],
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Recipe thumbnail image (max 5MB, jpg/jpeg/png/webp)',
        },
      },
      required: ['title', 'category'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Recipe created successfully',
    type: CreateRecipeDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @Roles(ERoleName.ADMIN, ERoleName.USER)
  async create(
    @Body() createRecipeDto: CreateRecipeDto,
    @UploadedFiles() files: {
      thumbnail?: Express.Multer.File[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const thumbnail = files?.thumbnail?.[0];
      const recipe = await this.recipeService.create(
        req.user.id,
        req.user.name,
        createRecipeDto,
        thumbnail,
      );
      const result = successResponse(recipe, 'Recipe created successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all recipes with pagination and filters (public)
   */
  @Get('/list')
  @Public()
  @ApiOperation({
    summary: 'Get paginated list of recipes',
    description: 'Retrieves a paginated list of recipes with optional filtering, sorting, and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipes retrieved successfully',
  })
  async findAll(@Query() query: RecipeListQueryDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.recipeService.findAll(query);
      const data = paginationResponse(
        result.recipes,
        result.total,
        result.page,
        result.limit,
        'Recipes retrieved successfully',
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  // Get data for dashboard
  @Get('meta/dashboard')
  @Public()
  @ApiOperation({
    summary: 'Get data for dashboard',
    description: 'Retrieves data for dashboard.',
  })
  async getDashboardData() {
    const responseModel = new ResponseModel();
    try {
      const result = await this.recipeService.getDashboardData();
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
  /**
   * Get all categories (public)
   */
  @Get('meta/categories')
  @Public()
  @ApiOperation({
    summary: 'Get all recipe categories',
    description: 'Retrieves a list of all distinct recipe categories.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    const responseModel = new ResponseModel();

    try {
      const categories = await this.recipeService.getCategories();
      const result = successResponse(categories, 'Categories retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get popular recipes (public)
   */
  @Get('meta/popular')
  @Public()
  @ApiOperation({
    summary: 'Get popular recipes',
    description: 'Retrieves the most viewed recipes.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recipes to return (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Popular recipes retrieved successfully',
  })
  async getPopularRecipes(@Query('limit') limit?: number) {
    const responseModel = new ResponseModel();

    try {
      const recipes = await this.recipeService.getPopularRecipes(
        limit || 10,
        'Active',
      );
      const result = successResponse(recipes, 'Popular recipes retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get recent recipes (public)
   */
  @Get('meta/recent')
  @Public()
  @ApiOperation({
    summary: 'Get recent recipes',
    description: 'Retrieves the most recently created recipes.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of recipes to return (default: 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Recent recipes retrieved successfully',
  })
  async getRecentRecipes(@Query('limit') limit?: number) {
    const responseModel = new ResponseModel();

    try {
      const recipes = await this.recipeService.getRecentRecipes(
        limit || 10,
        'active',
      );
      const result = successResponse(recipes, 'Recent recipes retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get recipes by author (public)
   */
  @Get('author/:authorId')
  @Public()
  @ApiOperation({
    summary: 'Get recipes by author',
    description: 'Retrieves all recipes created by a specific author.',
  })
  @ApiParam({
    name: 'authorId',
    type: String,
    description: 'Author user UUID',
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
    description: 'Items per page (default: 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Active', 'Hidden'],
    description: 'Filter by status',
    example: 'Active',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipes retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid author ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Author not found',
  })
  async getByAuthor(
    @Param('authorId') authorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const responseModel = new ResponseModel();

    try {
      const recipes = await this.recipeService.getByAuthor(authorId, {
        page: page || 1,
        limit: limit || 20,
        status,
      });
      const result = successResponse(
        recipes,
        `Retrieved ${recipes.length} recipes by author`,
      );
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get recipes by category (public)
   */
  @Get('category/:category')
  @Public()
  @ApiOperation({
    summary: 'Get recipes by category',
    description: 'Retrieves all recipes in a specific category with pagination.',
  })
  @ApiParam({
    name: 'category',
    type: String,
    description: 'Recipe category',
    example: 'Italian',
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
    description: 'Items per page (default: 20)',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['Active', 'Hidden'],
    description: 'Filter by status (default: Active)',
    example: 'Active',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt', 'dateOfWriting', 'views', 'title'],
    description: 'Sort field (default: createdAt)',
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
    example: 'desc',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipes retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - category is required',
  })
  async getByCategory(
    @Param('category') category: ERecipeCategory,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.recipeService.getByCategory(category, {
        page: page || 1,
        limit: limit || 20,
        status,
        sortBy: sortBy as any,
        order,
      });
      const data = paginationResponse(
        result.recipes,
        result.total,
        result.page,
        result.limit,
        `Retrieved recipes in category: ${category}`,
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get a single recipe by ID (public, increments views)
   */
  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get recipe by ID',
    description: 'Retrieves a single recipe by its ID. Automatically increments the view count.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Recipe UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const recipe = await this.recipeService.findOne(id);
      const result = successResponse(recipe, 'Recipe retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Update a recipe (owner only)
   */
  @Patch(':id')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
    ])
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a recipe',
    description: 'Updates an existing recipe. Only the recipe owner can update it. Supports partial updates.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Recipe UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update recipe with optional thumbnail image',
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Recipe title',
          example: 'Delicious Homemade Pasta Recipe',
          maxLength: 255,
        },
        category: {
          type: 'string',
          description: 'Recipe category',
          example: 'Italian',
          maxLength: 50,
        },
        content: {
          type: 'string',
          description: 'Recipe content (detailed instructions and ingredients)',
          example: 'This is the full recipe content with ingredients and instructions...',
        },
        ingredients: {
          type: 'array',
          items: { type: 'string' },
          description: 'Recipe ingredients',
          example: ['Pasta', 'Tomato', 'Garlic', 'Cheese'],
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Recipe thumbnail image (max 5MB, jpg/jpeg/png/webp)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe updated successfully',
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
    description: 'Forbidden - you do not own this recipe',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
    @UploadedFiles() files: {
      thumbnail?: Express.Multer.File[];
    },
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const thumbnail = files?.thumbnail?.[0];
      const recipe = await this.recipeService.update(
        id,
        req.user.id,
        updateRecipeDto,
        thumbnail,
      );
      const result = successResponse(recipe, 'Recipe updated successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Delete a recipe (owner only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a recipe',
    description: 'Deletes a recipe. Only the recipe owner can delete it. This is a hard delete.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Recipe UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not own this recipe',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.recipeService.remove(id, req.user.id);
      const data = successResponse(result, result.message);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':id/deactivate')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Deactivate a recipe',
    description: 'Deactivates a recipe. Only the recipe owner can deactivate it.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Recipe UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe deactivated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not own this recipe',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async deactivate(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.recipeService.deactivate(id);
      const data = successResponse(result, result.message);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

  @Patch(':id/activate')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Activate a recipe',
    description: 'Activates a recipe. Only the recipe owner can activate it.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Recipe UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Recipe activated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid UUID format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - you do not own this recipe',
  })
  @ApiResponse({
    status: 404,
    description: 'Recipe not found',
  })
  async activate(@Param('id') id: string) {
    const responseModel = new ResponseModel();
    try {
      const result = await this.recipeService.activate(id);
      const data = successResponse(result, result.message);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
}
