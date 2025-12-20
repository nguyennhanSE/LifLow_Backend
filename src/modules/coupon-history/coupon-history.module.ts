import { Module } from '@nestjs/common';
import { CouponHistoryService } from './coupon-history.service';
import { CouponHistoryController } from './coupon-history.controller';
import { CouponHistoryRepository } from './repositories/coupon-history.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [PrismaModule, CouponsModule],
  controllers: [CouponHistoryController],
  providers: [CouponHistoryService, CouponHistoryRepository],
  exports: [CouponHistoryService],
})
export class CouponHistoryModule {}

