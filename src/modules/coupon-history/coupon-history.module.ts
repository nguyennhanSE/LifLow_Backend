import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CouponHistoryService } from './coupon-history.service';
import { CouponHistoryController } from './coupon-history.controller';
import { CouponHistoryRepository } from './repositories/coupon-history.repository';
import {
  CouponHistoryCronjobService,
  CouponHistoryExpireCronjobService,
} from './cronjob/coupon-history.cronjob.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CouponsModule } from '../coupons/coupons.module';
import { MembershipLevelNotifyListener } from './listeners/membershipLevel-notify.listener';
@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), forwardRef(() => CouponsModule)],
  controllers: [CouponHistoryController],
  providers: [
    CouponHistoryService,
    CouponHistoryRepository,
    CouponHistoryCronjobService,
    CouponHistoryExpireCronjobService,
    MembershipLevelNotifyListener,
  ],
  exports: [CouponHistoryService],
})
export class CouponHistoryModule {}

