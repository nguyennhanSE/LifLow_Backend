import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ProductDiscountService } from './product-discount.service';
import { CreateProductDiscountDto } from './dto/create-product-discount.dto';
import { UpdateProductDiscountDto } from './dto/update-product-discount.dto';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { successResponse } from '../../utils/responseFormatter';
import { ResponseModel } from '../../libs/models/response/response.model';

@ApiTags('Product Discount Management')
@Controller('product-discounts')
@ApiBearerAuth()
export class ProductDiscountController {
  constructor(private readonly productDiscountService: ProductDiscountService) {}

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Create a new product discount' })
  @ApiBody({ type: CreateProductDiscountDto })
  @ApiResponse({ status: 201, description: 'Product discount created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - discount already exists for this product' })
  async create(@Body() createProductDiscountDto: CreateProductDiscountDto) {
    const responseModel = new ResponseModel();

    try {
      const discount = await this.productDiscountService.create(createProductDiscountDto);
      const result = successResponse(discount, 'Product discount created successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get all product discounts' })
  @ApiResponse({ status: 200, description: 'Product discounts retrieved successfully' })
  async findAll() {
    const responseModel = new ResponseModel();

    try {
      const discounts = await this.productDiscountService.findAll();
      const result = successResponse(discounts, 'Product discounts retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('product/:productId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get product discount by product ID' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product discount retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product discount not found' })
  async findByProductId(@Param('productId') productId: string) {
    const responseModel = new ResponseModel();

    try {
      const discount = await this.productDiscountService.findByProductId(productId);
      const result = successResponse(discount, 'Product discount retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get product discount by ID' })
  @ApiParam({ name: 'id', description: 'Product discount ID' })
  @ApiResponse({ status: 200, description: 'Product discount retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product discount not found' })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const discount = await this.productDiscountService.findOne(id);
      const result = successResponse(discount, 'Product discount retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Update an existing product discount' })
  @ApiParam({ name: 'id', description: 'Product discount ID' })
  @ApiBody({ type: UpdateProductDiscountDto })
  @ApiResponse({ status: 200, description: 'Product discount updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Product discount not found' })
  async update(@Param('id') id: string, @Body() updateProductDiscountDto: UpdateProductDiscountDto) {
    const responseModel = new ResponseModel();

    try {
      const discount = await this.productDiscountService.update(id, updateProductDiscountDto);
      const result = successResponse(discount, 'Product discount updated successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Delete a product discount by ID' })
  @ApiParam({ name: 'id', description: 'Product discount ID' })
  @ApiResponse({ status: 200, description: 'Product discount deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product discount not found' })
  async remove(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productDiscountService.remove(id);
      const response = successResponse(result, result.message);
      responseModel.setData(response);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
}
