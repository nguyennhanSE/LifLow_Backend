import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './order.service';
import {
  CreateOrderDto,
  OrderFilterDto,
  UpdateOrderDto,
  CreateOrderGroupDto,
  UpdateOrderGroupDto,
  OrderGroupFilterDto,
} from './dto/order.dto';
import { paginationResponse, successResponse } from '../../utils/responseFormatter';
import type { Response } from 'express';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';
import { OrderExceptionFilter } from './filters/order-exception.filter';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { ResponseModel } from '../../libs/models/response/response.model';
import { ApiBearerAuth } from '@nestjs/swagger';
import { ERoleName } from '../roles/enums/role.enum';
import { Roles } from 'src/libs/decorator/roles.decorator';

@ApiTags('Order')
@ApiBearerAuth()
@UseFilters(PrismaExceptionFilter, OrderExceptionFilter)
// @UseInterceptors(ResponseTransformInterceptor)
@Controller('order')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order with points and coupons' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'User or Coupon not found' })
  async create(
    @Req() req: Request & { user: { id: string } }, 
    @Body() createOrderDto: CreateOrderDto[], 
    @Body() points: number,
    @Body() couponIds: string[], // Array of coupon IDs to apply
  ) {
    const responseModel = new ResponseModel();

    try {
      const order = await this.ordersService.create(createOrderDto, points, req.user.id, couponIds || []);
      responseModel.setData(order);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/list')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get paginated list of order groups with filters' })
  @ApiResponse({ status: 200, description: 'Order groups retrieved successfully' })
  async findAllOrderGroups(@Query() filterDto: OrderGroupFilterDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.ordersService.findAllOrderGroups(filterDto);
      if (result && result.orderGroups && result.pagination) {
        const orderGroups: unknown[] = Array.isArray(result.orderGroups) ? (result.orderGroups as unknown[]) : [];
        const total: number = typeof result.pagination.total === 'number' ? result.pagination.total : 0;
        const page: number = typeof result.pagination.page === 'number' ? result.pagination.page : 1;
        const limit: number = typeof result.pagination.limit === 'number' ? result.pagination.limit : 10;
        const data = paginationResponse(
          orderGroups,
          total,
          page,
          limit,
          'Order groups retrieved successfully',
        );
        responseModel.setData(data);
      }
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch('/group/:id')
  @ApiOperation({ summary: 'Update an existing order group' })
  @ApiBody({ type: UpdateOrderGroupDto })
  @ApiResponse({ status: 200, description: 'Order group updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Order group not found' })
  async updateOrderGroup(@Param('id') id: string, @Body() updateOrderGroupDto: UpdateOrderGroupDto) {
    const responseModel = new ResponseModel();

    try {
      const orderGroup = await this.ordersService.updateOrderGroup(id, updateOrderGroupDto);
      responseModel.setData(orderGroup);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('group/:id')
  @Roles(ERoleName.ADMIN, ERoleName.USER)
  @ApiOperation({ summary: 'Get an order group by id' })
  @ApiResponse({ status: 200, description: 'Order group retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order group not found' })
  async getOrderGroup(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const orderGroup = await this.ordersService.getOrderGroupByOrderGroupNumber(id);
      responseModel.setData(orderGroup);
    } catch (error) {
        throw error;
      }
  
      return responseModel;
    }

  @Get('stats/dashboard')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Dashboard statistics for order groups' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats() {
    const responseModel = new ResponseModel();

    try {
      const stats = await this.ordersService.getOrderGroupDashboardStats();
      responseModel.setData(stats);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('stats/dashboard-ui')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({
    summary:
      'Dashboard UI statistics for order groups (daily sales, sales last 7 days, order status counts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard UI statistics retrieved successfully',
  })
  async getDashboardUiStats(@Query('days') days?: string) {
    const responseModel = new ResponseModel();

    try {
      const parsedDays = days ? parseInt(days, 10) : 7;
      const stats = await this.ordersService.getOrderGroupDashboardUiStats(
        Number.isFinite(parsedDays) ? parsedDays : 7,
      );
      responseModel.setData(stats);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('search')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Advanced search for order groups' })
  @ApiResponse({ status: 200, description: 'Order groups retrieved successfully' })
  async search(@Query() filterDto: OrderGroupFilterDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.ordersService.findAllOrderGroups(filterDto);
      if (result && result.orderGroups && result.pagination) {
        const orderGroups: unknown[] = Array.isArray(result.orderGroups) ? (result.orderGroups as unknown[]) : [];
        const total: number = typeof result.pagination.total === 'number' ? result.pagination.total : 0;
        const page: number = typeof result.pagination.page === 'number' ? result.pagination.page : 1;
        const limit: number = typeof result.pagination.limit === 'number' ? result.pagination.limit : 10;
        const data = paginationResponse(
          orderGroups,
          total,
          page,
          limit,
          'Order groups retrieved successfully',
        );
        responseModel.setData(data);
      }
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('export')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Export filtered order groups to CSV' })
  @ApiResponse({ status: 200, description: 'CSV exported successfully' })
  async export(@Query() filterDto: OrderGroupFilterDto, @Res() res: Response) {
    const csv = await this.ordersService.exportOrderGroupsToCSV(filterDto);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=order-groups-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send('\uFEFF' + csv);
  }

  @Get(':orderGroupNumber')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get order group by order group number' })
  @ApiResponse({ status: 200, description: 'Order group retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order group not found' })
  async findOneOrderGroup(@Param('orderGroupNumber') orderGroupNumber: string) {
    const responseModel = new ResponseModel();

    try {
      const orderGroup = await this.ordersService.findOneOrderGroup(orderGroupNumber);
      responseModel.setData(orderGroup);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  // @Patch(':orderGroupNumber')
  // @Roles(ERoleName.ADMIN)
  // @ApiOperation({ summary: 'Update an existing order group' })
  // @ApiBody({ type: UpdateOrderGroupDto })
  // @ApiResponse({ status: 200, description: 'Order group updated successfully' })
  // @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  // @ApiResponse({ status: 404, description: 'Order group not found' })
  // async updateOrderGroup(
  //   @Param('orderGroupNumber') orderGroupNumber: string,
  //   @Body() updateOrderGroupDto: UpdateOrderGroupDto,
  // ) {
  //   const responseModel = new ResponseModel();

  //   try {
  //     const orderGroup = await this.ordersService.updateOrderGroup(
  //       orderGroupNumber,
  //       updateOrderGroupDto,
  //     );
  //     responseModel.setData(orderGroup);
  //   } catch (error) {
  //     throw error;
  //   }

  //   return responseModel;
  // }

  @Delete(':orderGroupNumber')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Delete an order group' })
  @ApiResponse({ status: 200, description: 'Order group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order group not found' })
  async removeOrderGroup(@Param('orderGroupNumber') orderGroupNumber: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.ordersService.removeOrderGroup(orderGroupNumber);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Post('group')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order group' })
  @ApiBody({ type: CreateOrderGroupDto })
  @ApiResponse({ status: 201, description: 'Order group created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createOrderGroup(
    @Req() req: Request & { user: { id: string } },
    @Body() createOrderGroupDto: CreateOrderGroupDto,
  ) {
    const responseModel = new ResponseModel();

    try {
      const orderGroup = await this.ordersService.createOrderGroup(
        createOrderGroupDto,
        req.user.id,
      );
      responseModel.setData(orderGroup);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
}

