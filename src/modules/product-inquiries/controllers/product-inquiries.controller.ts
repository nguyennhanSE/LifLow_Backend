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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ProductInquiriesService } from '../services/product-inquiries.service';
import { ProductInquiryAnswersService } from '../services/product-inquiry-answers.service';
import {
  CreateProductInquiryDto,
  UpdateProductInquiryDto,
  QueryProductInquiriesDto,
  ProductInquiryResponseDto,
  CreateProductInquiryAnswerDto,
  UpdateProductInquiryAnswerDto,
  ProductInquiryAnswerStandaloneResponseDto,
} from '../dto';
import { ResponseModel } from '../../../libs/models/response/response.model';
import { Roles } from '../../../libs/decorator/roles.decorator';
import { Public } from '../../../libs/decorator/public.decorator';
import { ERoleName } from '../../roles/enums/role.enum';

/**
 * Interface for authenticated request with user info
 */
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    name: string;
    email?: string;
    roles?: string[];
  };
}

/**
 * Controller for managing product inquiries and their answers
 */
@ApiBearerAuth()
@ApiTags('Product Inquiries')
@Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
@Controller('product-inquiries')
export class ProductInquiriesController {
  constructor(
    private readonly productInquiriesService: ProductInquiriesService,
    private readonly productInquiryAnswersService: ProductInquiryAnswersService,
  ) {}

  // ==================== PRODUCT INQUIRY ENDPOINTS ====================

  /**
   * Create a new product inquiry
   * Requires authentication
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product inquiry',
    description:
      'Creates a new product inquiry. Requires authentication. Users can ask questions about products.',
  })
  @ApiBody({ type: CreateProductInquiryDto })
  @ApiResponse({
    status: 201,
    description: 'Inquiry created successfully',
    type: ProductInquiryResponseDto,
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
    status: 404,
    description: 'Product or user not found',
  })
  async create(
    @Body() createDto: CreateProductInquiryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      // Override authorId with authenticated user's ID for security
      createDto.authorId = req.user.sub;

      const inquiry = await this.productInquiriesService.create(createDto);
      responseModel.setData(inquiry);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all product inquiries with filtering and pagination
   * Public endpoint
   */
  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all product inquiries',
    description:
      'Retrieves all product inquiries with optional filtering and pagination. Public endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inquiries retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async findAll(@Query() queryDto: QueryProductInquiriesDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productInquiriesService.findAll(queryDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Dashboard stats for product inquiries by status
   */
  @Get('dashboard')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product inquiries dashboard stats',
    description:
      'Returns product inquiry counts by status for dashboard usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 120 },
        pending: { type: 'number', example: 45 },
        completed: { type: 'number', example: 75 },
      },
    },
  })
  async getDashboard() {
    const responseModel = new ResponseModel();

    try {
      const stats = await this.productInquiriesService.getDashboardStats();
      responseModel.setData(stats);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/number-of-inquiries')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER)
  @ApiOperation({ 
    summary: 'Get total number of product inquiries',
    description: 'Returns statistics about product inquiries including total count, pending (unanswered), and completed (answered) inquiries.'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns inquiry statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 150, description: 'Total number of inquiries' },
            pending: { type: 'number', example: 25, description: 'Number of unanswered inquiries' },
            completed: { type: 'number', example: 125, description: 'Number of answered inquiries' }
          }
        }
      }
    }
  })
  @HttpCode(HttpStatus.OK)
  async getNumberOfInquiries() {
    const responseModel = new ResponseModel();
    
    try {
      const stats = await this.productInquiriesService.getDashboardStats();
      responseModel.setData(stats);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  /**
   * Get a single product inquiry by ID with all answers
   * Public endpoint
   */
  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product inquiry by ID',
    description: 'Retrieves a single product inquiry with all answers and relations. Public endpoint.',
  })
  @ApiParam({
    name: 'id',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Inquiry retrieved successfully',
    type: ProductInquiryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Inquiry not found',
  })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const inquiry = await this.productInquiriesService.findOne(id);
      responseModel.setData(inquiry);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all inquiries for a specific product
   * Public endpoint
   */
  @Get('product/:productId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all inquiries for a product',
    description:
      'Retrieves all inquiries for a specific product with optional filtering. Public endpoint.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Inquiries retrieved successfully',
    type: [ProductInquiryResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async findByProduct(
    @Param('productId') productId: string,
    @Query() queryDto: Partial<QueryProductInquiriesDto>,
  ) {
    const responseModel = new ResponseModel();

    try {
      const inquiries = await this.productInquiriesService.findByProduct(
        productId,
        queryDto,
      );
      responseModel.setData(inquiries);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('product/:productId/count')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get count of product inquiries',
    description: 'Retrieves the count of product inquiries. Public endpoint.',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: 200,
    description: 'Count of product inquiries retrieved successfully',
    type: Number,
  })
  async getInquiryCount(@Param('productId') productId: string) {
    const responseModel = new ResponseModel();
    try {
      const count = await this.productInquiriesService.getInquiryCount(productId);
      responseModel.setData(count);
    } catch (error) {
      throw error;
    }
    return responseModel;
  }
  /**
   * Get product inquiry statistics
   * Public endpoint
   */
  @Get('product/:productId/stats')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product inquiry statistics',
    description:
      'Retrieves inquiry statistics including total, answered, and unanswered counts for a product. Public endpoint.',
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
        totalInquiries: {
          type: 'number',
          description: 'Total number of inquiries',
          example: 42,
        },
        answeredInquiries: {
          type: 'number',
          description: 'Number of inquiries with at least one answer',
          example: 35,
        },
        unansweredInquiries: {
          type: 'number',
          description: 'Number of inquiries without answers',
          example: 7,
        },
      },
    },
  })
  async getProductStats(@Param('productId') productId: string) {
    const responseModel = new ResponseModel();

    try {
      const stats = await this.productInquiriesService.getProductStats(productId);
      responseModel.setData(stats);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all inquiries by a specific user
   * Requires authentication
   */
  @Get('user/:authorId')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all inquiries by a user',
    description: 'Retrieves all inquiries authored by a specific user. Requires authentication.',
  })
  @ApiParam({
    name: 'authorId',
    description: 'User ID (author)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Inquiries retrieved successfully',
    type: [ProductInquiryResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async findByUser(@Param('authorId') authorId: string) {
    const responseModel = new ResponseModel();

    try {
      const inquiries = await this.productInquiriesService.findByUser(authorId);
      responseModel.setData(inquiries);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Update a product inquiry
   * Only the inquiry author can update their inquiry
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a product inquiry',
    description:
      'Updates a product inquiry. Only the author can update their own inquiry.',
  })
  @ApiParam({
    name: 'id',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiBody({ type: UpdateProductInquiryDto })
  @ApiResponse({
    status: 200,
    description: 'Inquiry updated successfully',
    type: ProductInquiryResponseDto,
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
    description: 'Forbidden - user is not the author of this inquiry',
  })
  @ApiResponse({
    status: 404,
    description: 'Inquiry not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProductInquiryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const inquiry = await this.productInquiriesService.update(
        id,
        updateDto,
        req.user.sub,
      );
      responseModel.setData(inquiry);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Delete a product inquiry
   * Only the inquiry author can delete their inquiry
   * Cascade deletes all associated answers
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a product inquiry',
    description:
      'Deletes a product inquiry and all its answers. Only the author can delete their own inquiry.',
  })
  @ApiParam({
    name: 'id',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Inquiry deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - user is not the author of this inquiry',
  })
  @ApiResponse({
    status: 404,
    description: 'Inquiry not found',
  })
  async delete(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      await this.productInquiriesService.delete(id, req.user.sub);
      responseModel.setData({ message: 'Inquiry deleted successfully' });
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  // ==================== PRODUCT INQUIRY ANSWER ENDPOINTS ====================

  /**
   * Create an answer for a product inquiry
   * Admin only
   */
  @Post(':inquiryId/answers')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an answer for a product inquiry',
    description:
      'Creates a new answer for a product inquiry. Admin only.',
  })
  @ApiParam({
    name: 'inquiryId',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiBody({ type: CreateProductInquiryAnswerDto })
  @ApiResponse({
    status: 201,
    description: 'Answer created successfully',
    type: ProductInquiryAnswerStandaloneResponseDto,
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
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Inquiry not found',
  })
  async createAnswer(
    @Request() req: AuthenticatedRequest,
    @Param('inquiryId') inquiryId: string,
    @Body() createDto: CreateProductInquiryAnswerDto,
  ) {
    const responseModel = new ResponseModel();

    try {
      const answer = await this.productInquiryAnswersService.create(inquiryId, createDto, req.user.sub);
      responseModel.setData(answer);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get all answers for a specific inquiry
   * Public endpoint
   */
  @Get(':inquiryId/answers')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all answers for an inquiry',
    description:
      'Retrieves all answers for a specific inquiry. Public endpoint.',
  })
  @ApiParam({
    name: 'inquiryId',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiResponse({
    status: 200,
    description: 'Answers retrieved successfully',
  })
  async findAnswersByInquiry(@Param('inquiryId') inquiryId: string) {
    const responseModel = new ResponseModel();

    try {
      const answers = await this.productInquiryAnswersService.findByInquiry(inquiryId);
      responseModel.setData(answers);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Get a single answer by ID
   * Public endpoint
   */
  @Get(':inquiryId/answers/:answerId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a single answer by ID',
    description: 'Retrieves a single answer with inquiry information. Public endpoint.',
  })
  @ApiParam({
    name: 'inquiryId',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiParam({
    name: 'answerId',
    description: 'Answer ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer retrieved successfully',
    type: ProductInquiryAnswerStandaloneResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Answer not found',
  })
  async findOneAnswer(@Param('answerId') answerId: string) {
    const responseModel = new ResponseModel();

    try {
      const answer = await this.productInquiryAnswersService.findOne(answerId);
      responseModel.setData(answer);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Update an answer
   * Admin only
   */
  @Patch(':inquiryId/answers/:answerId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an answer',
    description:
      'Updates an answer for a product inquiry. Admin only.',
  })
  @ApiParam({
    name: 'inquiryId',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiParam({
    name: 'answerId',
    description: 'Answer ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiBody({ type: UpdateProductInquiryAnswerDto })
  @ApiResponse({
    status: 200,
    description: 'Answer updated successfully',
    type: ProductInquiryAnswerStandaloneResponseDto,
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
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Answer not found',
  })
  async updateAnswer(
    @Param('answerId') answerId: string,
    @Body() updateDto: UpdateProductInquiryAnswerDto,
  ) {
    const responseModel = new ResponseModel();

    try {
      const answer = await this.productInquiryAnswersService.update(
        answerId,
        updateDto,
      );
      responseModel.setData(answer);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  /**
   * Delete an answer
   * Admin only
   */
  @Delete(':inquiryId/answers/:answerId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.CS_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an answer',
    description:
      'Deletes an answer for a product inquiry. Admin only.',
  })
  @ApiParam({
    name: 'inquiryId',
    description: 'Inquiry ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
  })
  @ApiParam({
    name: 'answerId',
    description: 'Answer ID',
    example: '123e4567-e89b-12d3-a456-426614174003',
  })
  @ApiResponse({
    status: 200,
    description: 'Answer deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'Answer not found',
  })
  async deleteAnswer(@Param('answerId') answerId: string) {
    const responseModel = new ResponseModel();

    try {
      await this.productInquiryAnswersService.delete(answerId);
      responseModel.setData({ message: 'Answer deleted successfully' });
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  
}

