import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { ProductReviewsService } from './product-reviews.service';
import {
  CreateProductReviewDto,
  UpdateProductReviewDto,
  QueryProductReviewsDto,
  ProductReviewResponseDto,
} from './dto';
import { ResponseModel } from '../../libs/models/response/response.model';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { tokenType } from 'src/common/enums';

/**
 * Interface for authenticated request with user info
 */
interface AuthenticatedRequest extends Request {
  user : {
    sub : string;
    email: string;
    tokenType: tokenType;
    roles: string[];
  }
}

/**
 * Controller for managing product reviews
 */
@ApiBearerAuth()
@ApiTags('Product Reviews')
@Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
@Controller('product-reviews')
export class ProductReviewsController {
  constructor(
    private readonly productReviewsService: ProductReviewsService,
  ) {}

  /**
   * Create a new product review
   * Requires authentication
   */
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('imageUrl'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product review',
    description:
      'Creates a new product review. Requires authentication. User can only review each product once.',
  })
  @ApiBody({
    description: 'Create product review with optional image',
    schema: {
      type: 'object',
      required: ['productId', 'review', 'rating'],
      properties: {
        productId: { 
          type: 'string', 
          format: 'uuid',
          description: 'Product ID' 
        },
        authorId: { 
          type: 'string', 
          format: 'uuid',
          description: 'Author ID (optional, will be overridden by authenticated user)' 
        },
        review: { 
          type: 'string', 
          description: 'Review content (max 2000 characters)' 
        },
        rating: { 
          type: 'number', 
          minimum: 1,
          maximum: 5,
          description: 'Rating (1-5)' 
        },
        imageUrl: { 
          type: 'string', 
          format: 'binary', 
          description: 'Image file (optional)' 
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Review created successfully',
    type: ProductReviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or user already reviewed this product',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Product or user not found',
  })
  async create(
    @Body() createDto: CreateProductReviewDto,
    @Request() req: AuthenticatedRequest,
    @UploadedFile() imageUrl?: Express.Multer.File,
  ) {
    const responseModel = new ResponseModel();

    try {
      console.log('req.user', req);
      // Override authorId with authenticated user's ID for security
      createDto.authorId = req.user.sub;

      const review = await this.productReviewsService.create(createDto, imageUrl);
      responseModel.setData(review);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
  // get length of product reviews
  @Get('/count/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get length of product reviews',
    description: 'Retrieves the length of product reviews.',
  })
  @ApiResponse({
    status: 200,
    description: 'Length of product reviews retrieved successfully',
  })

  async getLengthOfProductReviews(@Param('productId') productId: string) {
    const responseModel = new ResponseModel();
    try {
      const length = await this.productReviewsService.getLengthOfProductReviews(productId);
      responseModel.setData(length);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all product reviews with filtering and pagination
   * Public endpoint
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all product reviews',
    description:
      'Retrieves all product reviews with optional filtering and pagination. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async findAll(@Query() queryDto: QueryProductReviewsDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productReviewsService.findAll(queryDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get a single product review by ID
   * Public endpoint
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product review by ID',
    description: 'Retrieves a single product review with relations. Public endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully',
    type: ProductReviewResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const review = await this.productReviewsService.findOne(id);
      responseModel.setData(review);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all reviews for a specific product
   * Public endpoint
   */
  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all reviews for a product',
    description:
      'Retrieves all reviews for a specific product with optional filtering. Public endpoint.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: [ProductReviewResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async findByProduct(
    @Param('productId') productId: string,
    @Query() queryDto: Partial<QueryProductReviewsDto>,
  ) {
    const responseModel = new ResponseModel();

    try {
      const reviews = await this.productReviewsService.findByProduct(
        productId,
        queryDto,
      );
      responseModel.setData(reviews);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get product review statistics
   * Public endpoint
   */
  @Get('product/:productId/stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product review statistics',
    description:
      'Retrieves review count, average rating, and rating distribution for a product. Public endpoint.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        reviewCount: {
          type: 'number',
          description: 'Total number of reviews',
          example: 42,
        },
        averageRating: {
          type: 'number',
          description: 'Average rating (0-5)',
          example: 4.5,
        },
        ratingDistribution: {
          type: 'object',
          description: 'Count of reviews per rating',
          example: { '1': 2, '2': 3, '3': 5, '4': 12, '5': 20 },
        },
      },
    },
  })
  async getProductStats(@Param('productId') productId: string) {
    const responseModel = new ResponseModel();

    try {
      const stats = await this.productReviewsService.getProductStats(productId);
      responseModel.setData(stats);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all reviews by a specific user
   * Requires authentication
   */
  @Get('user/:authorId')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all reviews by a user',
    description: 'Retrieves all reviews authored by a specific user. Requires authentication.',
  })
  @ApiParam({
    name: 'authorId',
    description: 'User ID (author)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Reviews retrieved successfully',
    type: [ProductReviewResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async findByUser(@Param('authorId') authorId: string) {
    const responseModel = new ResponseModel();

    try {
      const reviews = await this.productReviewsService.findByUser(authorId);
      responseModel.setData(reviews);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get current user's review for a specific product
   * Requires authentication
   */
  @Get('user/me/product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get current user\'s review for a product',
    description: 'Retrieves the authenticated user\'s review for a specific product if it exists.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Review retrieved successfully (or null if not found)',
    type: ProductReviewResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async getUserReviewForProduct(
    @Param('productId') productId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const review = await this.productReviewsService.getUserReviewForProduct(
        productId,
        req.user.sub,
      );
      responseModel.setData(review);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Update a product review
   * Only the review author can update their review
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a product review',
    description:
      'Updates a product review. Only the author can update their own review.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiBody({ type: UpdateProductReviewDto })
  @ApiResponse({
    status: 200,
    description: 'Review updated successfully',
    type: ProductReviewResponseDto,
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
    description: 'Forbidden - user is not the author of this review',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const review = await this.productReviewsService.update(
        id,
        updateDto,
        req.user.sub,
      );
      responseModel.setData(review);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Delete a product review
   * Only the review author can delete their review
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a product review',
    description:
      'Deletes a product review. Only the author can delete their own review.',
  })
  @ApiParam({
    name: 'id',
    description: 'Review ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Review deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the author of this review',
  })
  @ApiResponse({
    status: 404,
    description: 'Review not found',
  })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      await this.productReviewsService.delete(id, req.user.sub);
      responseModel.setData({ message: 'Review deleted successfully' });
    } catch (error) {
      throw error;
    }
    return responseModel;
  }

}
