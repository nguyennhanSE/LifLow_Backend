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
  UsePipes,
  ValidationPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { BannerBulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { EBannerType } from './enums/banner.enum';
import { BannerTasksService } from './tasks/banner-tasks.service';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';
import { BannerEntity } from './entities/banner.entity';

@ApiTags('Banners')
@Controller('banners')
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class BannerController {
  constructor(
    private readonly bannerService: BannerService,
    private readonly bannerTasksService: BannerTasksService,
  ) {}

  /**
   * Create a new banner
   * POST /banners
   */
  @Post()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Create a new banner',
    description:
      'Creates a new banner with optional product association. If productId is provided, product data will be denormalized into the banner.',
  })
  @ApiBody({
    type: CreateBannerDto,
    description: 'Banner creation data',
    examples: {
      productBanner: {
        summary: 'Product Banner Example',
        value: {
          type: 'MAIN_PRODUCTS',
          status: 'ACTIVE',
          productId: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Summer Sale Banner',
          badgeText: 'New Member Special',
          mainText: 'Get 20% off on your first purchase',
          ctaButtonText: 'Shop Now',
          ctaButtonUrl: '/products/summer-collection',
          imageUrl: 'https://example.com/banner.jpg',
          mobileImageUrl: 'https://example.com/banner-mobile.jpg',
          displayOrder: 1,
          startDate: '2024-06-01T00:00:00Z',
          endDate: '2024-08-31T23:59:59Z',
        },
      },
      simpleBanner: {
        summary: 'Simple Banner (No Product)',
        value: {
          type: 'FOOTER',
          status: 'ACTIVE',
          title: 'Subscribe to Newsletter',
          mainText: 'Get 10% off your next order',
          ctaButtonText: 'Subscribe',
          ctaButtonUrl: '/newsletter',
          imageUrl: 'https://example.com/newsletter-banner.jpg',
          displayOrder: 0,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Banner created successfully',
    type: BannerEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found (if productId provided)',
  })
  @ApiResponse({
    status: 409,
    description: 'Product already has a banner (unique constraint)',
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async create(
    @Body() createBannerDto: CreateBannerDto,
  ): Promise<BannerEntity> {
    return await this.bannerService.create(createBannerDto);
  }

  /**
   * Get all banners with filtering and pagination
   * GET /banners
   */
  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Get all banners with filtering and pagination',
    description:
      'Retrieve a paginated list of banners with optional filters for type, status, product, date ranges, and search.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: EBannerType,
    description: 'Filter by banner type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by banner status (ACTIVE, INACTIVE, SCHEDULED)',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product ID (UUID)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in title and badge text',
  })
  @ApiQuery({
    name: 'startDateFrom',
    required: false,
    type: String,
    description: 'Filter banners starting from this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'startDateTo',
    required: false,
    type: String,
    description: 'Filter banners starting up to this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDateFrom',
    required: false,
    type: String,
    description: 'Filter banners ending from this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'endDateTo',
    required: false,
    type: String,
    description: 'Filter banners ending up to this date (ISO 8601)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort field (default: displayOrder)',
    enum: ['displayOrder', 'createdAt', 'startDate', 'endDate'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    description: 'Sort order (default: asc)',
    enum: ['asc', 'desc'],
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of banners retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/BannerEntity' },
        },
        total: {
          type: 'number',
          example: 100,
        },
        page: {
          type: 'number',
          example: 1,
        },
        limit: {
          type: 'number',
          example: 10,
        },
        totalPages: {
          type: 'number',
          example: 10,
        },
      },
    },
  })
  async findAll(
    @Query() queryDto: QueryBannerDto,
  ): Promise<PaginatedResponseDto<BannerEntity>> {
    return await this.bannerService.findAll(queryDto);
  }

  /**
   * Get active banners by type (for frontend display)
   * GET /banners/type/:type
   */
  @Get('type/:type')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Get active banners by type for frontend display',
    description:
      'Retrieve all active banners of a specific type, ordered by displayOrder. Useful for frontend banner carousels.',
  })
  @ApiParam({
    name: 'type',
    enum: EBannerType,
    description: 'Banner type',
    example: 'MAIN_PRODUCTS',
  })
  @ApiResponse({
    status: 200,
    description: 'Active banners retrieved successfully',
    type: [BannerEntity],
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid banner type',
  })
  async findActiveByType(
    @Param('type', new ParseEnumPipe(EBannerType))
    type: EBannerType,
  ): Promise<BannerEntity[]> {
    return await this.bannerService.findActiveByType(type);
  }

  /**
   * Get single banner by ID
   * GET /banners/:id
   */
  @Get(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Get banner by ID',
    description: 'Retrieve a single banner by its UUID, including product details if associated.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Banner UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Banner retrieved successfully',
    type: BannerEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Banner not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BannerEntity> {
    return await this.bannerService.findOne(id);
  }

  /**
   * Update banner by ID
   * PATCH /banners/:id
   */
  @Patch(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Update banner by ID',
    description:
      'Update a banner. If productId is changed, denormalized product data will be updated automatically.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Banner UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateBannerDto,
    description: 'Banner update data (all fields optional)',
    examples: {
      updateStatus: {
        summary: 'Update Status',
        value: {
          status: 'INACTIVE',
        },
      },
      updateContent: {
        summary: 'Update Content',
        value: {
          title: 'New Banner Title',
          mainText: 'Updated promotional text',
          ctaButtonText: 'Learn More',
          displayOrder: 5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Banner updated successfully',
    type: BannerEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'Banner not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Product already has another banner (if productId updated)',
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBannerDto: UpdateBannerDto,
  ): Promise<BannerEntity> {
    return await this.bannerService.update(id, updateBannerDto);
  }

  /**
   * Sync product data for a banner
   * PATCH /banners/:id/sync-product
   */
  @Patch(':id/sync-product')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Sync denormalized product data with latest product info',
    description:
      'Fetch the latest product data and update the denormalized fields in the banner. Useful when product details change.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Banner UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Product data synced successfully',
    type: BannerEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Banner has no product associated',
  })
  @ApiResponse({
    status: 404,
    description: 'Banner or product not found',
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async syncProductData(
    @Param('id', ParseUUIDPipe) id: string,
    ): Promise<BannerEntity> {
    return await this.bannerService.syncProductData(id);
  }

  /**
   * Bulk update status for multiple banners
   * PATCH /banners/bulk/update-status
   */
  @Patch('bulk/update-status')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Update status for multiple banners',
    description:
      'Bulk update the status of multiple banners in a single operation.',
  })
  @ApiBody({
    type: BannerBulkUpdateStatusDto,
    description: 'Bulk status update data',
    examples: {
      activateMultiple: {
        summary: 'Activate Multiple Banners',
        value: {
          ids: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
          ],
          status: 'ACTIVE',
        },
      },
      deactivateAll: {
        summary: 'Deactivate Banners',
        value: {
          ids: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
            '123e4567-e89b-12d3-a456-426614174002',
          ],
          status: 'INACTIVE',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Banners updated successfully',
    schema: {
      type: 'object',
      properties: {
        updated: {
          type: 'number',
          example: 3,
        },
        message: {
          type: 'string',
          example: 'Successfully updated 3 banners',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more banners not found',
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async bulkUpdateStatus(
    @Body() dto: BannerBulkUpdateStatusDto,
  ): Promise<{ updated: number; message: string }> {
    const result = await this.bannerService.bulkUpdateStatus(dto);
    return {
      updated: result.updated,
      message: `Successfully updated ${result.updated} banner${result.updated !== 1 ? 's' : ''}`,
    };
  }

  /**
   * Reorder banners
   * PATCH /banners/reorder
   */
  @Patch('reorder')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Reorder banners by updating displayOrder',
    description:
      'Update the displayOrder of multiple banners in a single atomic transaction. Useful for drag-and-drop reordering in admin UI.',
  })
  @ApiBody({
    type: ReorderBannersDto,
    description: 'Banner reordering data',
    examples: {
      reorderExample: {
        summary: 'Reorder Three Banners',
        value: {
          bannerOrders: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              displayOrder: 0,
            },
            {
              id: '123e4567-e89b-12d3-a456-426614174001',
              displayOrder: 1,
            },
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              displayOrder: 2,
            },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Banners reordered successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Banners reordered successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
  })
  @ApiResponse({
    status: 404,
    description: 'One or more banners not found',
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async reorderBanners(
    @Body() dto: ReorderBannersDto,
  ): Promise<{ message: string }> {
    await this.bannerService.reorderBanners(dto);
    return {
      message: 'Banners reordered successfully',
    };
  }

  /**
   * Manual trigger: Activate scheduled banners
   * POST /banners/tasks/activate-scheduled
   */
  @Post('tasks/activate-scheduled')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Manually trigger activation of scheduled banners',
    description:
      'Immediately activates all scheduled banners that meet the activation criteria (startDate <= now and endDate >= now or null). Normally this runs automatically every hour.',
  })
  @ApiResponse({
    status: 200,
    description: 'Task executed successfully',
    schema: {
      type: 'object',
      properties: {
        activated: {
          type: 'number',
          example: 3,
        },
        bannerIds: {
          type: 'array',
          items: { type: 'string' },
          example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
          ],
        },
        message: {
          type: 'string',
          example: 'Activated 3 scheduled banner(s)',
        },
      },
    },
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async triggerActivateScheduled(): Promise<{
    activated: number;
    bannerIds: string[];
    message: string;
  }> {
    const result =
      await this.bannerTasksService.manualActivateScheduledBanners();
    return {
      ...result,
      message: `Activated ${result.activated} scheduled banner${result.activated !== 1 ? 's' : ''}`,
    };
  }

  /**
   * Manual trigger: Deactivate expired banners
   * POST /banners/tasks/deactivate-expired
   */
  @Post('tasks/deactivate-expired')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Manually trigger deactivation of expired banners',
    description:
      'Immediately deactivates all active banners that have passed their endDate. Normally this runs automatically every hour.',
  })
  @ApiResponse({
    status: 200,
    description: 'Task executed successfully',
    schema: {
      type: 'object',
      properties: {
        deactivated: {
          type: 'number',
          example: 2,
        },
        bannerIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['123e4567-e89b-12d3-a456-426614174000'],
        },
        message: {
          type: 'string',
          example: 'Deactivated 2 expired banner(s)',
        },
      },
    },
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async triggerDeactivateExpired(): Promise<{
    deactivated: number;
    bannerIds: string[];
    message: string;
  }> {
    const result =
      await this.bannerTasksService.manualDeactivateExpiredBanners();
    return {
      ...result,
      message: `Deactivated ${result.deactivated} expired banner${result.deactivated !== 1 ? 's' : ''}`,
    };
  }

  /**
   * Manual trigger: Sync product data for all product banners
   * POST /banners/tasks/sync-product-data
   */
  @Post('tasks/sync-product-data')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Manually trigger product data sync for all product banners',
    description:
      'Fetches the latest product data and updates denormalized fields for all banners with associated products. Normally this runs automatically daily at 2 AM.',
  })
  @ApiResponse({
    status: 200,
    description: 'Task executed successfully',
    schema: {
      type: 'object',
      properties: {
        synced: {
          type: 'number',
          example: 15,
        },
        failed: {
          type: 'number',
          example: 0,
        },
        bannerIds: {
          type: 'array',
          items: { type: 'string' },
          example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '123e4567-e89b-12d3-a456-426614174001',
          ],
        },
        message: {
          type: 'string',
          example: 'Synced 15 banner(s), 0 failed',
        },
      },
    },
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async triggerSyncProductData(): Promise<{
    synced: number;
    failed: number;
    bannerIds: string[];
    message: string;
  }> {
    const result = await this.bannerTasksService.manualSyncAllProductBanners();
    return {
      ...result,
      message: `Synced ${result.synced} banner${result.synced !== 1 ? 's' : ''}, ${result.failed} failed`,
    };
  }

  /**
   * Get status of scheduled tasks
   * GET /banners/tasks/status
   */
  @Get('tasks/status')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @ApiOperation({
    summary: 'Get status of all scheduled banner tasks',
    description:
      'Returns information about all scheduled tasks including their schedules and whether tasks are enabled.',
  })
  @ApiResponse({
    status: 200,
    description: 'Task status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tasksEnabled: {
          type: 'boolean',
          example: true,
        },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              schedule: { type: 'string' },
            },
          },
        },
      },
    },
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async getTasksStatus(): Promise<{
    tasksEnabled: boolean;
    tasks: {
      name: string;
      description: string;
      schedule: string;
    }[];
  }> {
    return await this.bannerTasksService.getTasksStatus();
  }

  /**
   * Delete banner by ID
   * DELETE /banners/:id
   */
  @Delete(':id')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete banner by ID',
    description:
      'Permanently delete a banner. This operation cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Banner UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Banner deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Banner deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Banner not found',
  })
  // TODO: Add authentication guard
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('admin')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.bannerService.remove(id);
    return {
      message: 'Banner deleted successfully',
    };
  }
}
