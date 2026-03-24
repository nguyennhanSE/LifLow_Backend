import { Module, forwardRef, Global } from '@nestjs/common';
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
import { LoggerModule } from 'src/libs/logger/logger.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    ScheduleModule.forRoot(),
    forwardRef(() => CouponsModule),
    NotificationsModule,
  ],
  controllers: [CouponHistoryController],
  providers: [
    CouponHistoryService,
    CouponHistoryRepository,
    CouponHistoryCronjobService,
    CouponHistoryExpireCronjobService,
    MembershipLevelNotifyListener,
  ],
  exports: [CouponHistoryService, CouponHistoryRepository],
})
export class CouponHistoryModule {}

