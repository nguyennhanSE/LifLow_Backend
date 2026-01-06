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
  UseFilters,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PointService } from './point.service';
import {
  CreatePointDto,
  PointFilterDto,
  UpdatePointDto,
} from './dto/point.dto';
import { paginationResponse } from '../../utils/responseFormatter';
import { ResponseModel } from '../../libs/models/response/response.model';
import { ERoleName } from '../roles/enums/role.enum';
import { Roles } from 'src/libs/decorator/roles.decorator';
import { PrismaExceptionFilter } from '../order/filters/prisma-exception.filter';
import { PointNotFoundException } from './exceptions/point-not-found.exception';
import { PointValidationException } from './exceptions/point-validation.exception';

@ApiTags('Point')
@ApiBearerAuth()
@UseFilters(PrismaExceptionFilter)
@Controller('point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Post()
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new point' })
  @ApiBody({ type: CreatePointDto })
  @ApiResponse({ status: 201, description: 'Point created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'User or Order not found' })
  async create(@Body() createPointDto: CreatePointDto) {
    const responseModel = new ResponseModel();

    try {
      const point = await this.pointService.create(createPointDto);
      responseModel.setData(point);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('/list')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get paginated list of points with filters' })
  @ApiResponse({ status: 200, description: 'Points retrieved successfully' })
  async findAll(@Query() filterDto: PointFilterDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.pointService.findAll(filterDto);
      const data = paginationResponse(
        result.points,
        result.pagination.total,
        result.pagination.page,
        result.pagination.limit,
        'Points retrieved successfully',
      );
      responseModel.setData(data);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('user/:userId')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get point by user ID' })
  @ApiResponse({ status: 200, description: 'Point retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async findByUserId(@Param('userId') userId: string) {
    const responseModel = new ResponseModel();

    try {
      const point = await this.pointService.findByUserId(userId);
      if (!point) {
        throw new PointNotFoundException(`Point for user ${userId} not found`);
      }
      responseModel.setData(point);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get('order/:orderNumber')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get point by order number' })
  @ApiResponse({ status: 200, description: 'Point retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    const responseModel = new ResponseModel();

    try {
      const point = await this.pointService.findByOrderNumber(orderNumber);
      if (!point) {
        throw new PointNotFoundException(`Point for order ${orderNumber} not found`);
      }
      responseModel.setData(point);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Get point by ID' })
  @ApiResponse({ status: 200, description: 'Point retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const point = await this.pointService.findOne(id);
      responseModel.setData(point);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Update an existing point' })
  @ApiBody({ type: UpdatePointDto })
  @ApiResponse({ status: 200, description: 'Point updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async update(
    @Param('id') id: string,
    @Body() updatePointDto: UpdatePointDto,
  ) {
    const responseModel = new ResponseModel();

    try {
      const point = await this.pointService.update(id, updatePointDto);
      responseModel.setData(point);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN)
  @ApiOperation({ summary: 'Delete a point' })
  @ApiResponse({ status: 200, description: 'Point deleted successfully' })
  @ApiResponse({ status: 404, description: 'Point not found' })
  async remove(@Param('id') id: string) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.pointService.remove(id);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }
}
