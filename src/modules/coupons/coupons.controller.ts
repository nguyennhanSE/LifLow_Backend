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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { ResponseModel } from '../../libs/models/response/response.model';
import { ERoleName } from '../roles/enums/role.enum';
import { Roles } from 'src/libs/decorator/roles.decorator';
@ApiTags('Coupons')
@Controller('coupons')
@ApiBearerAuth()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new coupon',
    description: 'Creates a new coupon with the provided details. Validates coupon code uniqueness and date ranges.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Coupon successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data (e.g., invalid dates, missing required fields)',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Coupon code already exists',
  })

  async create(@Body() createCouponDto: CreateCouponDto) {
    const result = await this.couponsService.create(createCouponDto);
    const responseModel = new ResponseModel();
    responseModel.setData(result);
    return responseModel;
  }

  @Get()
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all coupons',
    description: 'Retrieves a paginated list of coupons with optional filtering and sorting',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of coupons retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            name: 'VIP 할인 쿠폰',
            code: 'VIP2024WELCOME',
            type: 'PERCENT',
            discountRate: 10,
            discountAmount: null,
            minPurchaseAmount: 50000,
            maxDiscountAmount: 50000,
            imageUrl: 'https://example.com/image.jpg',
            startDate: '2024-01-01T00:00:00Z',
            endDate: '2024-12-31T23:59:59Z',
            isActive: true,
            isAutoIssue: false,
            autoIssueDayOfMonth: null,
            targetGrades: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            _count: {
              histories: 10,
            },
          },
        ],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
        },
      },
    },
  })
  async findAll(@Query() queryDto: QueryCouponDto) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponsService.findAll(queryDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get('code/:code')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get coupon by code',
    description: 'Retrieves a single coupon by its unique code',
  })
  @ApiParam({
    name: 'code',
    description: 'Coupon code',
    example: 'VIP2024WELCOME',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon not found',
  })
  async findByCode(@Param('code') code: string) {
    const responseModel = new ResponseModel();
    
    try {
      const coupon = await this.couponsService.findByCode(code);
      responseModel.setData(coupon);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get(':id')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get coupon by ID',
    description: 'Retrieves a single coupon by its unique ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon not found',
  })
  async findOne(@Param('id') id: string) {
    const responseModel = new ResponseModel();
    
    try {
      const coupon = await this.couponsService.findOne(id);
      responseModel.setData(coupon);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Patch(':id')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a coupon',
    description: 'Updates an existing coupon with the provided details. All fields are optional.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon successfully updated',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Coupon code already exists',
  })
  async update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    const responseModel = new ResponseModel();
    
    try {
      const coupon = await this.couponsService.update(id, updateCouponDto);
      responseModel.setData(coupon);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Delete(':id')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a coupon',
    description: 'Deletes a coupon by its ID. This will also cascade delete related coupon histories.',
  })
  @ApiParam({
    name: 'id',
    description: 'Coupon UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon successfully deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon not found',
  })
  async remove(@Param('id') id: string) {
    const responseModel = new ResponseModel();
    
    try {
      const coupon = await this.couponsService.remove(id);
      responseModel.setData(coupon);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  // meta/dashboard
  @Get('meta/dashboard')
  @Roles(ERoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard data',
    description: 'Retrieves dashboard data',
  })
  async getMetaDashboard() {
    const responseModel = new ResponseModel();
    try {
      const dashboard = await this.couponsService.getMetaDashboard();
      responseModel.setData(dashboard);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }
}
