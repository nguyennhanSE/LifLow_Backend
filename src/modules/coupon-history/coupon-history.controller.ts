import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CouponHistoryService } from './coupon-history.service';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { UseCouponDto } from './dto/use-coupon.dto';
import { CancelCouponDto } from './dto/cancel-coupon.dto';
import { QueryCouponHistoryDto } from './dto/query-coupon-history.dto';
import { ResponseModel } from '../../libs/models/response/response.model';
import { Roles } from '../../libs/decorator/roles.decorator';
import { ERoleName } from '../roles/enums/role.enum';

@ApiTags('Coupon History')
@Controller('coupon-history')
@ApiBearerAuth()
export class CouponHistoryController {
  constructor(private readonly couponHistoryService: CouponHistoryService) {}

  @Post('issue')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Issue coupon to users',
    description: 'Issues a coupon to one or more users. Validates coupon exists, is active, and within valid date range. Supports bulk issuance.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Coupon(s) successfully issued',
    schema: {
      example: {
        message: 'Successfully issued 3 coupon(s)',
        count: 3,
        coupon: {
          id: 'uuid',
          name: 'VIP 할인 쿠폰',
          code: 'VIP2024',
          type: 'PERCENT',
        },
        histories: [
          {
            id: 'uuid',
            couponId: 'uuid',
            userId: 'user1',
            status: 'ISSUED',
            issuedAt: '2024-01-01T00:00:00.000Z',
            expiredAt: '2024-12-31T23:59:59.000Z',
            coupon: {},
            user: {
              id: 'user1',
              name: 'John Doe',
              email: 'john@example.com',
            },
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Coupon is inactive or expired',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon not found',
  })
  async issueCoupon(@Body() dto: IssueCouponDto) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.issueCoupon(dto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Post('use')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Use a coupon for an order',
    description: 'Applies a coupon to an order. Validates coupon status, expiration, minimum purchase amount, and calculates discount.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon successfully applied',
    schema: {
      example: {
        message: 'Coupon successfully applied',
        discountAmount: 10000,
        finalAmount: 90000,
        history: {
          id: 'uuid',
          couponId: 'uuid',
          userId: 'user1',
          orderId: 'order123',
          status: 'USED',
          issuedAt: '2024-01-01T00:00:00.000Z',
          usedAt: '2024-01-15T10:30:00.000Z',
          discountAppliedAmount: 10000,
          purchaseAmountAtUse: 100000,
          coupon: {},
          user: {},
          order: {},
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Coupon already used, expired, inactive, or insufficient purchase amount',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon history not found',
  })
  async useCoupon(@Body() dto: UseCouponDto) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.useCoupon(dto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Post('cancel')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel an issued coupon',
    description: 'Cancels a coupon that is in ISSUED status. Once cancelled, the coupon cannot be used.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon successfully cancelled',
    schema: {
      example: {
        message: 'Coupon successfully cancelled',
        history: {
          id: 'uuid',
          couponId: 'uuid',
          userId: 'user1',
          status: 'CANCELLED',
          issuedAt: '2024-01-01T00:00:00.000Z',
          cancelledAt: '2024-01-10T15:00:00.000Z',
          coupon: {},
          user: {},
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Coupon is not in ISSUED status',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Coupon history not found',
  })
  async cancelCoupon(@Body() dto: CancelCouponDto) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.cancelCoupon(dto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get()
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all coupon histories',
    description: 'Retrieves a paginated list of coupon histories with optional filtering by coupon ID, user ID, status, and date range.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of coupon histories retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: 'uuid',
            couponId: 'uuid',
            userId: 'user1',
            orderId: null,
            status: 'ISSUED',
            issuedAt: '2024-01-01T00:00:00.000Z',
            usedAt: null,
            expiredAt: '2024-12-31T23:59:59.000Z',
            cancelledAt: null,
            discountAppliedAmount: null,
            purchaseAmountAtUse: null,
            coupon: {
              id: 'uuid',
              name: 'VIP 할인 쿠폰',
              code: 'VIP2024',
              type: 'PERCENT',
            },
            user: {
              id: 'user1',
              name: 'John Doe',
              email: 'john@example.com',
            },
            order: null,
          },
        ],
        meta: {
          total: 50,
          page: 1,
          limit: 10,
          totalPages: 5,
        },
      },
    },
  })
  async findAll(@Query() queryDto: QueryCouponHistoryDto) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.findAll(queryDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get('user/:userId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get coupon histories for a specific user',
    description: 'Retrieves all coupon histories for a specific user with optional filtering and pagination.',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'user123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User coupon histories retrieved successfully',
  })
  async findByUser(
    @Param('userId') userId: string,
    @Query() queryDto: QueryCouponHistoryDto,
  ) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.findByUser(userId, queryDto);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get('user/:userId/available')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get user's available coupons",
    description: 'Retrieves all issued and non-expired coupons for a specific user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'user123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User's available coupons retrieved successfully",
  })
  async getUserAvailableCoupons(@Param('userId') userId: string) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.getUserAvailableCoupons(userId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get('user/:userId/used')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get user's used coupons with statistics",
    description: 'Retrieves all used coupons for a user along with savings statistics',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'user123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "User's used coupons and statistics retrieved successfully",
    schema: {
      example: {
        coupons: [],
        statistics: {
          totalUsed: 5,
          totalSavings: 50000,
        },
      },
    },
  })
  async getUserUsedCoupons(@Param('userId') userId: string) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.getUserUsedCoupons(userId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get('coupon/:couponId/statistics')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get coupon usage statistics',
    description: 'Retrieves comprehensive statistics for a specific coupon including usage rate, total discounts, and revenue impact',
  })
  @ApiParam({
    name: 'couponId',
    description: 'Coupon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Coupon statistics retrieved successfully',
    schema: {
      example: {
        totalIssued: 100,
        totalUsed: 75,
        totalCancelled: 10,
        totalExpired: 15,
        usageRate: 75,
        totalDiscountGiven: 750000,
        totalRevenueImpacted: 7500000,
        averageDiscountAmount: 10000,
      },
    },
  })
  async getCouponStatistics(@Param('couponId') couponId: string) {
    const responseModel = new ResponseModel();
    
    try {
      const result = await this.couponHistoryService.getCouponStatistics(couponId);
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Get('user/:userId/can-use/:couponId')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if user can use a coupon',
    description: 'Checks if a user has an active, non-expired coupon available for use',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: 'user123',
  })
  @ApiParam({
    name: 'couponId',
    description: 'Coupon ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Eligibility check completed',
    schema: {
      example: {
        canUse: true,
      },
    },
  })
  async canUserUseCoupon(
    @Param('userId') userId: string,
    @Param('couponId') couponId: string,
  ) {
    const responseModel = new ResponseModel();
    
    try {
      const canUse = await this.couponHistoryService.canUserUseCoupon(userId, couponId);
      responseModel.setData({ canUse });
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }

  @Post('expire-old')
  @Roles(ERoleName.ADMIN, ERoleName.GENERAL_MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Expire old coupons (batch job)',
    description: 'Updates all issued coupons that have passed their expiration date to EXPIRED status. Should be run as a scheduled job.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Old coupons expired successfully',
    schema: {
      example: {
        expiredCount: 25,
        message: 'Successfully expired 25 old coupon(s)',
      },
    },
  })
  async expireOldCoupons() {
    const responseModel = new ResponseModel();
    
    try {
      const expiredCount = await this.couponHistoryService.expireOldCoupons();
      responseModel.setData({
        expiredCount,
        message: `Successfully expired ${expiredCount} old coupon(s)`,
      });
    } catch (error) {
      throw error;
    }
    
    return responseModel;
  }
}


