import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProductModule } from './modules/product/product.module';
import { RecipeModule } from './modules/recipe/recipe.module';
import { GuardModule } from './guard/guard.module';
import { LoggerModule } from 'libs/logger/logger.module';
import { RolesModule } from './modules/roles/roles.module';
import { RolesGuard } from './guard/role.guard';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthGuard } from './guard/auth.guard';
import { EmailModule } from './modules/email/email.module';
import { OrderModule } from './modules/order/order.module';
import { AllExceptionsFilter } from './libs/filter/exception.filter';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PermissionsGuard } from './guard/permission.guard';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { CouponHistoryModule } from './modules/coupon-history/coupon-history.module';
import { BannerModule } from './modules/banner/banner.module';
import { AwsModule } from './libs/integration/aws/aws.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable scheduled tasks (cron jobs)
    UserModule,
    AuthModule,
    PaymentModule,
    ProductModule, // Product CRUD operations
    RecipeModule,
    GuardModule,
    LoggerModule,
    RolesModule,
    EmailModule,
    OrderModule,
    PermissionsModule,
    MembershipsModule,
    CouponsModule,
    CouponHistoryModule,
    BannerModule,
    AwsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
