import { Controller, Get, Post, Patch, Delete, Query, Param, Body, UseInterceptors, UploadedFiles, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ProductService } from './product.service';
import { ProductListQueryDto, CreateProductDto, UpdateProductDto, BulkDeleteProductDto, UpdateProductStatusDto, ProductBulkUpdateStatusDto } from './dto/product.dto';
import { successResponse, paginationResponse } from '../../utils/responseFormatter';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { uploadProductImages } from '../../middlewares/uploadMiddleware';
import { ResponseModel } from '../../libs/models/response/response.model';

@ApiTags('Product Management')
@Controller('product')
@ApiBearerAuth()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid query parameters' })
  async getProducts(@Query() query: ProductListQueryDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productService.getProducts(query);
      
      const data = paginationResponse(
        result.products,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Products retrieved successfully'
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD, ERoleName.CS_MANAGER, ERoleName.USER)
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.getProductById(id);
      const result = successResponse(product, 'Product retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - duplicate product code' })
  async createProduct(@Body() createProductDto: CreateProductDto) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.createProduct(createProductDto);
      const result = successResponse(product, 'Product created successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiBody({ type: UpdateProductDto })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Conflict - duplicate product code' })
  async updateProduct(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.updateProduct(id, updateProductDto);
      const result = successResponse(product, 'Product updated successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productService.deleteProduct(id);
      const data = successResponse(result, result.message);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Post('bulk-delete')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Bulk delete products' })
  @ApiBody({ type: BulkDeleteProductDto })
  @ApiResponse({ status: 200, description: 'Products deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid or empty IDs array' })
  async bulkDeleteProducts(@Body() bulkDeleteDto: BulkDeleteProductDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productService.bulkDeleteProducts(bulkDeleteDto.productIds);
      const data = successResponse(result, result.message);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch('status/:id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Update product status (displayStatus and/or saleStatus only)' })
  @ApiBody({ type: UpdateProductStatusDto })
  @ApiResponse({ status: 200, description: 'Product status updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProductStatus(@Param('id') id: string, @Body() statusDto: UpdateProductStatusDto) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.updateProductStatus(id, statusDto);
      const result = successResponse(product, 'Product status updated successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch('bulk-status')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Bulk update product status for multiple products' })
  @ApiBody({ type: ProductBulkUpdateStatusDto })
  @ApiResponse({ status: 200, description: 'Product statuses updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  async bulkUpdateStatus(@Body() bulkStatusDto: ProductBulkUpdateStatusDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productService.bulkUpdateProductStatus(
        bulkStatusDto.productIds,
        {
          displayStatus: bulkStatusDto.displayStatus,
          saleStatus: bulkStatusDto.saleStatus,
        }
      );
      const data = successResponse(result, result.message);
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('stats')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Get product statistics' })
  @ApiResponse({ status: 200, description: 'Product statistics retrieved successfully' })
  async getProductStats() {
    const responseModel = new ResponseModel();

    try {
      const stats = await this.productService.getProductStats();
      const result = successResponse(stats, 'Product statistics retrieved successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Post(':id/images')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'detail', maxCount: 1 },
      { name: 'list', maxCount: 1 },
      { name: 'smallList', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ])
  )
  @ApiOperation({ summary: 'Upload product images to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Product images (detail, list, smallList, thumbnail)',
    schema: {
      type: 'object',
      properties: {
        detail: {
          type: 'string',
          format: 'binary',
          description: 'Detail image (max 5MB, jpg/jpeg/png/webp)',
        },
        list: {
          type: 'string',
          format: 'binary',
          description: 'List image (max 5MB, jpg/jpeg/png/webp)',
        },
        smallList: {
          type: 'string',
          format: 'binary',
          description: 'Small list image (max 5MB, jpg/jpeg/png/webp)',
        },
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Thumbnail image (max 5MB, jpg/jpeg/png/webp)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Images uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid file type or size' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async uploadProductImages(
    @Param('id') id: string,
    @UploadedFiles() files: {
      detail?: Express.Multer.File[];
      list?: Express.Multer.File[];
      smallList?: Express.Multer.File[];
      thumbnail?: Express.Multer.File[];
    },
  ) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.uploadProductImages(id, files);
      const result = successResponse(product, 'Product images uploaded successfully');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('export/csv')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @ApiOperation({ summary: 'Export products to CSV file' })
  @ApiResponse({ status: 200, description: 'CSV file generated successfully' })
  async exportProducts(
    @Query() query: ProductListQueryDto,
    @Res() res: Response,
  ) {
    // Extract filters from query
    const filters = {
      search: query.search,
      category: query.category,
      brand: query.brand,
      saleStatus: query.saleStatus,
      displayStatus: query.displayStatus,
    };

    const csv = await this.productService.exportProductsToCSV(filters);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=products-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  }
}
