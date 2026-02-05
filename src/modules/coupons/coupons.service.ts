import { Injectable, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { CouponRepository } from './repositories/coupon.repository';
import { CouponHistoryStatus, CouponType } from './enums/coupon.enum';
import { CouponEntity } from './entities/coupon.entity';
import { AppLogger } from 'src/libs/logger/logger.service';
import { getFirstDateOfNextMonth, getNextMonthDateRange } from './helpers/coupon.helper';
import { CouponHistoryService } from '../coupon-history/coupon-history.service';

@Injectable()
export class CouponsService {
  constructor(
    private readonly couponRepository: CouponRepository,
    private readonly logger: AppLogger,
    @Inject(forwardRef(() => CouponHistoryService))
    private readonly couponHistoryService: CouponHistoryService,
  ) {}

  /**
   * Create a new coupon
   */
  async create(createCouponDto: CreateCouponDto): Promise<CouponEntity> {
    // Validate coupon code uniqueness
    const codeExists = await this.couponRepository.codeExists(createCouponDto.code);
    if (codeExists) {
      throw new ConflictException(`Coupon with code '${createCouponDto.code}' already exists`);
    }

    // Validate discount fields based on type
    if (createCouponDto.type === CouponType.PERCENT) {
      if (!createCouponDto.discountRate) {
        throw new BadRequestException('discountRate is required when type is PERCENT');
      }
      if (createCouponDto.discountAmount) {
        throw new BadRequestException('discountAmount should not be provided when type is PERCENT');
      }
    } else if (createCouponDto.type === CouponType.AMOUNT) {
      if (!createCouponDto.discountAmount) {
        throw new BadRequestException('discountAmount is required when type is AMOUNT');
      }
      if (createCouponDto.discountRate) {
        throw new BadRequestException('discountRate should not be provided when type is AMOUNT');
      }
    }

    // Khi isAutoIssue: startDate/endDate = ngày đầu và ngày cuối tháng sau
    if (createCouponDto.isAutoIssue) {
      const { startDate: nextStart, endDate: nextEnd } = getNextMonthDateRange();
      createCouponDto.startDate = nextStart.toISOString();
      createCouponDto.endDate = nextEnd.toISOString();
      if (!createCouponDto.autoIssueDayOfMonth) {
        this.logger.warn('autoIssueDayOfMonth is required when isAutoIssue is true');
        createCouponDto.autoIssueDayOfMonth = getFirstDateOfNextMonth().toISOString();
      }
    }

    // Validate date range
    const startDate = createCouponDto.startDate ? new Date(createCouponDto.startDate) : null;
    const endDate = createCouponDto.endDate ? new Date(createCouponDto.endDate) : null;
    if (startDate && endDate && startDate >= endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const created = await this.couponRepository.create(createCouponDto);

    // Khi không isAutoIssue: dùng targetGrades để tạo couponHistory cho user có membershipLevel trong targetGrades; targetGrades rỗng thì issue cho tất cả user
    if (!created.isAutoIssue) {
      await this.couponHistoryService.issueCouponToUsersByTargetGrades(
        created.id,
        created.targetGrades?.length ? (created.targetGrades as string[]) : undefined,
        startDate,
        endDate,
      );
    }

    return created;
  }

  /**
   * Get all coupons with pagination and filtering
   */
  async findAll(queryDto: QueryCouponDto) {
    return this.couponRepository.findAll(queryDto);
  }

  /**
   * Get a single coupon by ID
   */
  async findOne(id: string): Promise<CouponEntity> {
    return this.couponRepository.findOne(id);
  }

  /**
   * Find coupon by code
   */
  async findByCode(code: string): Promise<CouponEntity> {
    return this.couponRepository.findByCode(code);
  }

  /**
   * Update a coupon
   */
  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<CouponEntity> {
    // Validate coupon code uniqueness if code is being updated
    if (updateCouponDto.code) {
      const codeExists = await this.couponRepository.codeExists(updateCouponDto.code, id);
      if (codeExists) {
        throw new ConflictException(`Coupon with code '${updateCouponDto.code}' already exists`);
      }
    }

    // Get existing coupon to check current values
    const existingCoupon = await this.couponRepository.findOne(id);

    // Determine the type to validate against (use new type if provided, otherwise use existing)
    const typeToValidate = updateCouponDto.type || existingCoupon.type;

    // Validate discount fields based on type
    if (typeToValidate === CouponType.PERCENT) {
      const discountRate = updateCouponDto.discountRate !== undefined 
        ? updateCouponDto.discountRate 
        : existingCoupon.discountRate;

      if (!discountRate) {
        throw new BadRequestException('discountRate is required when type is PERCENT');
      }

      // If explicitly setting discountAmount when type is PERCENT, throw error
      if (updateCouponDto.discountAmount !== undefined) {
        throw new BadRequestException('discountAmount should not be provided when type is PERCENT');
      }
    } else if (typeToValidate === CouponType.AMOUNT) {
      const discountAmount = updateCouponDto.discountAmount !== undefined 
        ? updateCouponDto.discountAmount 
        : existingCoupon.discountAmount;

      if (!discountAmount) {
        throw new BadRequestException('discountAmount is required when type is AMOUNT');
      }

      // If explicitly setting discountRate when type is AMOUNT, throw error
      if (updateCouponDto.discountRate !== undefined) {
        throw new BadRequestException('discountRate should not be provided when type is AMOUNT');
      }
    }

    // Validate date range if dates are being updated
    const startDate = updateCouponDto.startDate 
      ? new Date(updateCouponDto.startDate) 
      : null;
    const endDate = updateCouponDto.endDate 
      ? new Date(updateCouponDto.endDate) 
      : null;

    if (startDate && endDate && startDate >= endDate && !existingCoupon.isPermanent) {
      throw new BadRequestException('startDate must be before endDate');
    }

    // Validate auto-issue fields if isAutoIssue is being updated to true
    const isAutoIssue = updateCouponDto.isAutoIssue !== undefined 
      ? updateCouponDto.isAutoIssue 
      : existingCoupon.isAutoIssue;

    if (isAutoIssue) {
      const targetGrades = updateCouponDto.targetGrades ?? existingCoupon.targetGrades;

      // if (!autoIssueDayOfMonth) {
      //   throw new BadRequestException('autoIssueDayOfMonth is required when isAutoIssue is true');
      // }
      await this.couponHistoryService.issueCouponToUsersByTargetGrades(id, targetGrades);
    }

    // Lấy isActive hiện tại của coupon
    const currentIsActive = existingCoupon.isActive;

    // Khi isActive chuyển sang false: đổi status tất cả CouponHistory (ISSUED) của coupon này thành EXPIRED
    if (updateCouponDto.isActive === false) {
      await this.couponHistoryService.expireAllByCouponId(id);
    }

    // Khi isActive chuyển từ false sang true: các CouponHistory có startDate <= today <= endDate và status = EXPIRED thì chuyển thành ISSUED
    if (currentIsActive === false && updateCouponDto.isActive === true) {
      await this.couponHistoryService.reactivateExpiredByCouponId(id);
    }

    return this.couponRepository.update(id, updateCouponDto);
  }

  /**
   * Remove a coupon
   */
  async remove(id: string): Promise<CouponEntity> {
    return this.couponRepository.remove(id);
  }

  /**
   * Get auto-issue coupons (useful for cron jobs)
   */
  async getAutoIssueCoupons() {
    return this.couponRepository.findAutoIssueCoupons();
  }

  /**
   * Get meta dashboard data
   */
  async getMetaDashboard() : Promise<{
    totalCoupons: number;
    totalAutoIssueCoupons: number;
    totalActiveCoupons: number;
    totalInactiveCoupons: number;
    totalExpiredCoupons: number;
  }> {
    const totalCoupons = await this.couponRepository.count();
    const totalAutoIssueCoupons = await this.couponRepository.count({ isAutoIssue: true });
    const totalActiveCoupons = await this.couponRepository.count({ isActive: true });
    const totalInactiveCoupons = await this.couponRepository.count({ isActive: false });
    const totalExpiredCoupons = await this.couponRepository.count({ isPermanent: false, isActive: true });
    return { totalCoupons, totalAutoIssueCoupons, totalActiveCoupons, totalInactiveCoupons, totalExpiredCoupons };
  }
}
