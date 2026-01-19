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
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductBadgesService } from './product-badges.service';
import { CreateProductBadgeDto } from './dto/create-product-badge.dto';
import { UpdateProductBadgeDto } from './dto/update-product-badge.dto';
import { ProductBadgeResponseDto } from './dto/product-badge-response.dto';

@ApiTags('Product Badges')
@ApiBearerAuth()
@Controller('product-badges')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ProductBadgesController {
  constructor(private readonly productBadgesService: ProductBadgesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product badge' })
  @ApiBody({ type: CreateProductBadgeDto })
  @ApiResponse({
    status: 201,
    description: 'Product badge created successfully',
    type: ProductBadgeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - badge already exists for this product',
  })
  async create(@Body() createDto: CreateProductBadgeDto): Promise<ProductBadgeResponseDto> {
    return this.productBadgesService.create(createDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all product badges' })
  @ApiResponse({
    status: 200,
    description: 'Product badges retrieved successfully',
    type: [ProductBadgeResponseDto],
  })
  async findAll(): Promise<ProductBadgeResponseDto[]> {
    return this.productBadgesService.findAll();
  }

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a product badge by product ID' })
  @ApiParam({
    name: 'productId',
    description: 'Product ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Product badge retrieved successfully',
    type: ProductBadgeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product badge not found',
  })
  async findByProductId(
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
  ): Promise<ProductBadgeResponseDto> {
    return this.productBadgesService.findByProductId(productId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a product badge by ID' })
  @ApiParam({
    name: 'id',
    description: 'Product badge ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Product badge retrieved successfully',
    type: ProductBadgeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Product badge not found',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<ProductBadgeResponseDto> {
    return this.productBadgesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing product badge' })
  @ApiParam({
    name: 'id',
    description: 'Product badge ID (UUID)',
    type: String,
  })
  @ApiBody({ type: UpdateProductBadgeDto })
  @ApiResponse({
    status: 200,
    description: 'Product badge updated successfully',
    type: ProductBadgeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Product badge not found',
  })
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateDto: UpdateProductBadgeDto,
  ): Promise<ProductBadgeResponseDto> {
    return this.productBadgesService.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product badge by ID' })
  @ApiParam({
    name: 'id',
    description: 'Product badge ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Product badge deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Product badge not found',
  })
  async remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<void> {
    return this.productBadgesService.remove(id);
  }
}
