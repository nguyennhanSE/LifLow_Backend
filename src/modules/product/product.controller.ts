import { Controller, Get, Post, Patch, Delete, Query, Param, Body, UseInterceptors, UploadedFiles, Res, Put, UploadedFile, Logger, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

/** JWT user on @Public() routes when Bearer token is valid (AuthGuard) */
interface AuthenticatedRequest extends Request {
  user?: { sub: string; email?: string; roles?: string[] };
}
import { ProductService } from './product.service';
import { ProductListQueryDto, CreateProductDto, UpdateProductDto, BulkDeleteProductDto, UpdateProductStatusDto, ProductBulkUpdateStatusDto,CreateProductSpecialOfferDto } from './dto/product.dto';
import { paginationResponse } from '../../utils/responseFormatter';
import { Roles } from '../../libs/decorator/roles.decorator';
import { Public } from '../../libs/decorator/public.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { uploadProductImages } from '../../middlewares/uploadMiddleware';
import { ResponseModel } from '../../libs/models/response/response.model';
import { NotificationsService } from '../notifications/notifications.service';

@ApiTags('Product Management')
@Controller('products')
@ApiBearerAuth()
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(
    private readonly productService: ProductService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('/list')
  @Public()
  @ApiOperation({ summary: 'Get paginated list of products with filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid query parameters' })
  async getProducts(@Query() query: ProductListQueryDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productService.getProducts(query);
      // this.logger.debug(`getProducts query: ${JSON.stringify(query)}, result count: ${result.products.length}`);
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

  @Get('special-offers')
  @Public()
  @ApiOperation({ summary: 'Get paginated list of products with active special offers' })
  @ApiResponse({ status: 200, description: 'Special offers retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid query parameters' })
  async getSpecialOffers(@Query() query: ProductListQueryDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.productService.getSpecialOffers(query);
      
      const data = paginationResponse(
        result.products,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Special offers retrieved successfully',
        {
          inProgress: result.inProgress,
          isOutDated: result.isOutDated,
        },
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiQuery({
    name: 'notifyTest',
    required: false,
    description:
      'FCM test only: use notifyTest=1 or true. Requires Authorization: Bearer; userId = JWT sub. No push if omitted.',
  })
  @ApiResponse({ status: 200, description: 'Product retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.getProductById(id);
      responseModel.setData(product);

      if (req.user?.sub) {
        const name = product.productName ?? id;
        this.logger.log(
          `[getProductById] FCM test → userId=${req.user?.sub}, productId=${id}`,
        );
        void this.notificationsService
          .sendToUser(
            req.user?.sub,
            '상품 조회 테스트',
            `상품 "${name}" 조회 알림 (FCM 테스트)`,
            'GENERAL',
            { productId: id },
          )
          .then((result) => {
            this.logger.log(`[getProductById] FCM test done: ${JSON.stringify(result)}`);
          })
          .catch((err: unknown) => {
            this.logger.warn(
              `[getProductById] FCM test failed: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      } else if (!req.user?.sub) {
        this.logger.debug(
          `[getProductById] no JWT — add Authorization: Bearer`,
        );
      }
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imageRegistrationThumbnail', maxCount: 1 },
      { name: 'imageRegistrationDetail', maxCount: 1 },
      { name: 'additionalImages', maxCount: 14 },
    ])
  )
  @ApiOperation({ summary: 'Create a new product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Create product with optional thumbnail image',
    schema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          description: 'Product name (required)',
          example: 'Organic Apple',
          maxLength: 128,
        },
        productCode: {
          type: 'string',
          description: 'Product code',
          example: 'PROD001',
        },
        category: {
          type: 'number',
          description: 'Category number',
          example: 1,
        },
        brand: {
          type: 'string',
          description: 'Brand name',
          example: 'Juwangsan',
        },
        manufacturer: {
          type: 'string',
          description: 'Manufacturer',
          example: 'ABC Company',
        },
        origin: {
          type: 'string',
          description: 'Origin',
          example: 'Korea',
        },
        productVolume: {
          type: 'string',
          description: 'Product volume',
          example: '100ml',
        },
        consumerPrice: {
          type: 'number',
          description: 'Consumer price (원)',
          example: 15000,
          minimum: 0,
        },
        supplyPrice: {
          type: 'number',
          description: 'Supply price (원)',
          example: 12000,
          minimum: 0,
        },
        productPrice: {
          type: 'number',
          description: 'Product price (원)',
          example: 13000,
          minimum: 0,
        },
        salePrice: {
          type: 'number',
          description: 'Sale price (원)',
          example: 10000,
          minimum: 0,
        },
        discountRate: {
          type: 'number',
          description: 'Discount rate',
          example: 10,
          minimum: 0,
        },
        discountStartDate: {
          type: 'string',
          format: 'date',
          description: 'Discount start date',
          example: '2025-01-01',
        },
        discountEndDate: {
          type: 'string',
          format: 'date',
          description: 'Discount end date',
          example: '2025-01-01',
        },
        deliveryMethod: {
          type: 'string',
          description: 'Delivery method',
          example: '택배',
        },
        deliveryFeeInput: {
          type: 'string',
          description: 'Delivery fee input',
          example: '10000',
        },
        productBriefExplanation: {
          type: 'string',
          description: 'Brief explanation',
          example: 'This is a brief explanation of the product',
        },
        seoDescription: {
          type: 'string',
          description: 'Seo description',
          example: 'This is a seo description of the product',
        },
        seoKeywords: {
          type: 'string',
          description: 'Seo keywords',
          example: 'This is a list of seo keywords for the product',
        },
        saleStatus: {
          type: 'string',
          description: 'Sale status',
          example: '판매중',
        },
        imageRegistrationThumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Image registration thumbnail (max 5MB, jpg/jpeg/png/webp)',
        },
        imageRegistrationDetail: {
          type: 'string',
          format: 'binary',
          description: 'Image registration detail (max 5MB, jpg/jpeg/png/webp)',
        },
      },
      required: ['productName'],
    },
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 409, description: 'Conflict - duplicate product code' })
  async createProduct(
    @Body() createProductDto: CreateProductDto, 
    @UploadedFiles() files: {
      imageRegistrationThumbnail?: Express.Multer.File[];
      imageRegistrationDetail?: Express.Multer.File[];
      additionalImages?: Express.Multer.File[];
    },
  ) {
    const responseModel = new ResponseModel();

    try {
      const imageRegistrationThumbnail = files?.imageRegistrationThumbnail?.[0];
      const imageRegistrationDetail = files?.imageRegistrationDetail?.[0];
      const additionalImages = files?.additionalImages;
      const product = await this.productService.createProduct(createProductDto, imageRegistrationThumbnail, imageRegistrationDetail, additionalImages);
      responseModel.setData(product);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER, ERoleName.MANAGER, ERoleName.MD)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imageRegistrationThumbnail', maxCount: 1 },
      { name: 'imageRegistrationDetail', maxCount: 1 },
      { name: 'additionalImages', maxCount: 14 },
    ])
  )
  @ApiOperation({ summary: 'Update an existing product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Update product with optional thumbnail and detail images',
    schema: {
      type: 'object',
      properties: {
        productName: {
          type: 'string',
          description: 'Product name',
          example: 'Organic Apple',
          maxLength: 128,
        },
        productCode: {
          type: 'string',
          description: 'Product code',
          example: 'PROD001',
        },
        category: {
          type: 'number',
          description: 'Category number',
          example: 1,
        },
        brand: {
          type: 'string',
          description: 'Brand name',
          example: 'Juwangsan',
        },
        manufacturer: {
          type: 'string',
          description: 'Manufacturer',
          example: 'ABC Company',
        },
        origin: {
          type: 'string',
          description: 'Origin',
          example: 'Korea',
        },
        productVolume: {
          type: 'string',
          description: 'Product volume',
          example: '100ml',
        },
        consumerPrice: {
          type: 'number',
          description: 'Consumer price (원)',
          example: 15000,
          minimum: 0,
        },
        supplyPrice: {
          type: 'number',
          description: 'Supply price (원)',
          example: 12000,
          minimum: 0,
        },
        productPrice: {
          type: 'number',
          description: 'Product price (원)',
          example: 13000,
          minimum: 0,
        },
        salePrice: {
          type: 'number',
          description: 'Sale price (원)',
          example: 10000,
          minimum: 0,
        },
        discountRate: {
          type: 'number',
          description: 'Discount rate',
          example: 10,
          minimum: 0,
        },
        discountStartDate: {
          type: 'string',
          format: 'date',
          description: 'Discount start date',
          example: '2025-01-01',
        },
        discountEndDate: {
          type: 'string',
          format: 'date',
          description: 'Discount end date',
          example: '2025-01-01',
        },
        deliveryMethod: {
          type: 'string',
          description: 'Delivery method',
          example: '택배',
        },
        deliveryFeeInput: {
          type: 'string',
          description: 'Delivery fee input',
          example: '10000',
        },
        productBriefExplanation: {
          type: 'string',
          description: 'Brief explanation',
          example: 'This is a brief explanation of the product',
        },
        seoDescription: {
          type: 'string',
          description: 'Seo description',
          example: 'This is a seo description of the product',
        },
        seoKeywords: {
          type: 'string',
          description: 'Seo keywords',
          example: 'This is a list of seo keywords for the product',
        },
        saleStatus: {
          type: 'string',
          description: 'Sale status',
          example: '판매중',
        },
        imageRegistrationThumbnail: {
          type: 'string',
          format: 'binary',
          description: 'Image registration thumbnail (max 5MB, jpg/jpeg/png/webp)',
        },
        imageRegistrationDetail: {
          type: 'string',
          format: 'binary',
          description: 'Image registration detail (max 5MB, jpg/jpeg/png/webp)',
        },
        additionalImages: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Additional images (max 14 images, max 5MB each, jpg/jpeg/png/webp)',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Conflict - duplicate product code' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files: {
      imageRegistrationThumbnail?: Express.Multer.File[];
      imageRegistrationDetail?: Express.Multer.File[];
      additionalImages?: Express.Multer.File[];
    },
  ) {
    const responseModel = new ResponseModel();

    try {
      const imageRegistrationThumbnail = files?.imageRegistrationThumbnail?.[0];
      const imageRegistrationDetail = files?.imageRegistrationDetail?.[0];
      const additionalImages = files?.additionalImages;
      const product = await this.productService.updateProduct(
        id,
        updateProductDto,
        imageRegistrationThumbnail,
        imageRegistrationDetail,
        additionalImages,
      );
      responseModel.setData(product);
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
      responseModel.setData(result);
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
      responseModel.setData(result);
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
      responseModel.setData(product);
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
      responseModel.setData(result);
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
      responseModel.setData(stats);
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
      responseModel.setData(product);
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
      storageMethod: query.storageMethod,
      saleStatus: query.saleStatus,
      displayStatus: query.displayStatus,
    };

    const csv = await this.productService.exportProductsToCSV(filters);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=products-${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 support
  }

  @Put(':id/special-offer')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Update product special offer' })
  @ApiBody({ type: CreateProductSpecialOfferDto })
  @ApiResponse({ status: 200, description: 'Product special offer updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProductSpecialOffer(@Param('id') id: string, @Body() createProductSpecialOfferDto: CreateProductSpecialOfferDto) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.updateProductSpecialOffer(id, createProductSpecialOfferDto);
      responseModel.setData(product);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id/special-offer')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({ summary: 'Delete product special offer' })
  @ApiResponse({ status: 200, description: 'Special offer deleted, product salePrice restored to origin' })
  @ApiResponse({ status: 404, description: 'Product not found or has no special offer' })
  async deleteProductSpecialOffer(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const product = await this.productService.deleteProductSpecialOffer(id);
      responseModel.setData(product);
      return responseModel;
    } catch (error) {
      throw error;
    }
  }

  @Get('brands/list')
  @Public()
  @ApiOperation({ summary: 'Get all brands' })
  @ApiResponse({ status: 200, description: 'Brands retrieved successfully' })
  async getBrands() {
    const responseModel = new ResponseModel();
    try {
      const result = await this.productService.getBrands();
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
  }
}
