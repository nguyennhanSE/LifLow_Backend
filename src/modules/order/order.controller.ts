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
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'User not found (ordererId)' })
  async create(@Body() createOrderDto: CreateOrderDto) {
    const responseModel = new ResponseModel();

    try {
      const order = await this.ordersService.create(createOrderDto);
      responseModel.setData(order);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/list')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get paginated list of orders with filters' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll(@Query() filterDto: OrderFilterDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.ordersService.findAll(filterDto);
      const data = paginationResponse(
        result.orders,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Orders retrieved successfully',
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('stats/dashboard')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Dashboard statistics for orders' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats() {
    const responseModel = new ResponseModel();

    try {
      const stats = await this.ordersService.getDashboardStats();
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
      'Dashboard UI statistics (daily sales, sales last 7 days, order status counts)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard UI statistics retrieved successfully',
  })
  async getDashboardUiStats(@Query('days') days?: string) {
    const responseModel = new ResponseModel();

    try {
      const parsedDays = days ? parseInt(days, 10) : 7;
      const stats = await this.ordersService.getDashboardUiStats(
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
  @ApiOperation({ summary: 'Advanced search for orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async search(@Query() filterDto: OrderFilterDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.ordersService.advancedSearch(filterDto);
      const data = paginationResponse(
        result.orders,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Orders retrieved successfully',
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('export')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Export filtered orders to CSV' })
  @ApiResponse({ status: 200, description: 'CSV exported successfully' })
  async export(@Query() filterDto: OrderFilterDto, @Res() res: Response) {
    const csv = await this.ordersService.exportToCSV(filterDto);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=orders-${new Date().toISOString().split('T')[0]}.csv`,
    );
    res.send('\uFEFF' + csv);
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const order = await this.ordersService.findOne(id);
      responseModel.setData(order);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Update an existing order' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    const responseModel = new ResponseModel();

    try {
      const order = await this.ordersService.update(id, updateOrderDto);
      // const result = successResponse(order, 'Order updated successfully');
      responseModel.setData(order);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, description: 'Order deleted successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async remove(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.ordersService.remove(id);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
}

