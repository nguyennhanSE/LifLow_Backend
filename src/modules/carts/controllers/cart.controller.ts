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
  ParseUUIDPipe,
  Req,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import { UpdateCartDto } from '../dto/update-cart.dto';
import { QueryCartDto } from '../dto/query-cart.dto';
import { CartResponseDto } from '../dto/cart-response.dto';
import { ResponseModel } from '../../../libs/models/response/response.model';
import { paginationResponse } from '../../../utils/responseFormatter';
import { Roles } from '../../../libs/decorator/roles.decorator';
import { ERoleName } from '../../roles/enums/role.enum';
import { Request } from 'express';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { CartUserInterceptor } from '../interceptors/cart.interceptor';

/**
 * Controller for managing shopping carts
 */
@ApiTags('Carts')
@ApiBearerAuth()
@Controller('carts')
@UseInterceptors(CartUserInterceptor)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Create a new cart
   * POST /carts
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new cart',
    description: 'Creates a new shopping cart for a user. If user already has an active cart, returns the existing cart.',
  })
  @ApiResponse({
    status: 201,
    description: 'Cart created successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  async create(@Req() req: Request & { user: { id: string } }) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.createCart(req.user.id);
    responseModel.setData(cart);
    return responseModel;
  }

  @Post('/add-item')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  async addItem(@Req() req: Request & { user: { id: string } }, @Body() addItemDto: CreateCartItemDto) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.addItemToCart(req.user.id, addItemDto);
    responseModel.setData(cart);
    return responseModel;
  }

  /**
   * List all carts with pagination and filters
   * GET /carts
   */
  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'List all carts',
    description: 'Retrieve a paginated list of carts with optional filters for userId and status.',
  })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'CHECKED_OUT'], description: 'Filter by cart status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'sortBy', required: false, type: String, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order (default: desc)' })
  @ApiResponse({
    status: 200,
    description: 'Carts retrieved successfully',
  })
  async findAll(@Query() queryDto: QueryCartDto) {
    const responseModel = new ResponseModel();
    const result = await this.cartService.listCarts(queryDto);
    const data = paginationResponse(
      result.data,
      result.total,
      result.page,
      result.limit,
      'Carts retrieved successfully',
    );
    responseModel.setData(data);
    return responseModel;
  }

  /**
   * Get user's active cart
   * GET /carts/me
   */
  @Get('/me')
  @ApiOperation({
    summary: "Get user's active cart",
    description: "Retrieve the active cart for a specific user. Returns null if no active cart exists.",
  })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findByUserId(@Req() req: Request & { user: { id: string } }) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.getCartByUserId(req.user.id);
    responseModel.setData(cart);
    return responseModel;
  }

  /**
   * Get number of active cart items for current user
   * GET /carts/number-of-items
   */
  @Get('/number-of-items')
  @Roles(ERoleName.USER, ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Get number of active cart items',
    description: 'Get the number of active cart items in the current user\'s cart.',
  })
  @ApiResponse({
    status: 200,
    description: 'Number of items retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        numberOfItems: { type: 'number', example: 5 },
      },
    },
  })
  async getNumberOfItems(@Req() req: Request & { user: { id: string } }) {
    const responseModel = new ResponseModel();
    const numberOfItems = await this.cartService.getNumberOfItems(req.user.id);
    responseModel.setData(numberOfItems);
    return responseModel;
  }

  /**
   * Get cart by ID
   * GET /carts/:id
   */

  @Get(':id')
  @ApiOperation({
    summary: 'Get cart by ID',
    description: 'Retrieve a cart by its ID with all items and user information.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart retrieved successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.getCartById(id);
    responseModel.setData(cart);
    return responseModel;
  }

  /**
   * Update cart
   * PATCH /carts/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update cart',
    description: 'Update cart information such as status. Cannot update checked out carts.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  @ApiBody({ type: UpdateCartDto })
  @ApiResponse({
    status: 200,
    description: 'Cart updated successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or business rule violation' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCartDto: UpdateCartDto,
  ) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.updateCart(id, updateCartDto);
    responseModel.setData(cart);
    return responseModel;
  }

  /**
   * Delete cart
   * DELETE /carts/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete cart',
    description: 'Delete a cart and all its items. This operation cannot be undone.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    await this.cartService.deleteCart(id);
    responseModel.setData({ message: 'Cart deleted successfully' });
    return responseModel;
  }

  /**
   * Checkout cart
   * POST /carts/:id/checkout
   */
  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Checkout cart',
    description: 'Change cart status to CHECKED_OUT. Cart must have items and be in ACTIVE status.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart checked out successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - cart is empty or already checked out' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async checkout(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.checkoutCart(id);
    responseModel.setData(cart);
    return responseModel;
  }

  /**
   * Clear all items from cart
   * POST /carts/:id/clear
   */
  @Post(':id/clear')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear cart',
    description: 'Remove all items from a cart. Cart total will be set to 0.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart cleared successfully',
    type: CartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - cannot clear checked out cart' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async clear(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    const cart = await this.cartService.clearCart(id);
    responseModel.setData(cart);
    return responseModel;
  }

  /**
   * Get cart total amount
   * GET /carts/:id/total
   */
  @Get(':id/total')
  @ApiOperation({
    summary: 'Get cart total',
    description: 'Calculate and return the total amount of all items in the cart.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart total retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 58000 },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async getTotal(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    const total = await this.cartService.calculateCartTotal(id);
    responseModel.setData({ total });
    return responseModel;
  }

  
}

