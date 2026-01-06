import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CartItemService } from '../services/cart-item.service';
import { CreateCartItemDto } from '../dto/create-cart-item.dto';
import { UpdateCartItemDto } from '../dto/update-cart-item.dto';
import { CartItemResponseDto } from '../dto/cart-response.dto';
import { ResponseModel } from '../../../libs/models/response/response.model';

/**
 * Controller for managing cart items
 */
@ApiTags('Cart Items')
@ApiBearerAuth()
@Controller('cart-items')
export class CartItemController {
  constructor(private readonly cartItemService: CartItemService) {}

  /**
   * Add item to cart
   * POST /cart-items/:cartId
   */
  @Post(':cartId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Add a product to a cart. If the product already exists in the cart, the quantity will be updated.',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart ID (UUID)' })
  @ApiBody({ type: CreateCartItemDto })
  @ApiResponse({
    status: 201,
    description: 'Item added to cart successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or product unavailable' })
  @ApiResponse({ status: 404, description: 'Cart or product not found' })
  async create(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() createCartItemDto: CreateCartItemDto,
  ) {
    const responseModel = new ResponseModel();
    const cartItem = await this.cartItemService.addItem(cartId, createCartItemDto);
    responseModel.setData(cartItem);
    return responseModel;
  }

  /**
   * Get cart item by ID
   * GET /cart-items/:id
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get cart item by ID',
    description: 'Retrieve a cart item by its ID with product information.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart item ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart item retrieved successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    const cartItem = await this.cartItemService.getItemById(id);
    responseModel.setData(cartItem);
    return responseModel;
  }

  /**
   * Get all items in a cart
   * GET /cart-items/cart/:cartId
   */
  @Get('cart/:cartId')
  @ApiOperation({
    summary: 'Get all items in cart',
    description: 'Retrieve all items in a specific cart with product information.',
  })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart items retrieved successfully',
    type: [CartItemResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async findByCartId(@Param('cartId', ParseUUIDPipe) cartId: string) {
    const responseModel = new ResponseModel();
    const cartItems = await this.cartItemService.getItemsByCartId(cartId);
    responseModel.setData(cartItems);
    return responseModel;
  }

  /**
   * Update cart item
   * PATCH /cart-items/:id
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update cart item',
    description: 'Update cart item properties such as quantity or sale price. Cannot update items in checked out carts.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart item ID (UUID)' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({
    status: 200,
    description: 'Cart item updated successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or business rule violation' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const responseModel = new ResponseModel();
    const cartItem = await this.cartItemService.updateItem(id, updateCartItemDto);
    responseModel.setData(cartItem);
    return responseModel;
  }

  /**
   * Remove cart item
   * DELETE /cart-items/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove cart item',
    description: 'Remove an item from a cart. Cart total will be recalculated automatically.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart item ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Cart item removed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - cannot remove items from checked out cart' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    const responseModel = new ResponseModel();
    await this.cartItemService.removeItem(id);
    responseModel.setData({ message: 'Cart item removed successfully' });
    return responseModel;
  }

  /**
   * Update cart item quantity
   * PATCH /cart-items/:id/quantity
   */
  @Patch(':id/quantity')
  @ApiOperation({
    summary: 'Update cart item quantity',
    description: 'Update the quantity of a cart item. Quantity must be at least 1.',
  })
  @ApiParam({ name: 'id', type: String, description: 'Cart item ID (UUID)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { type: 'number', example: 3, minimum: 1 },
      },
      required: ['quantity'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cart item quantity updated successfully',
    type: CartItemResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or business rule violation' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  async updateQuantity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('quantity') quantity: number,
  ) {
    const responseModel = new ResponseModel();
    const cartItem = await this.cartItemService.updateItemQuantity(id, quantity);
    responseModel.setData(cartItem);
    return responseModel;
  }
}

