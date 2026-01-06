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
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductDiscountModule } from './modules/product-discount/product-discount.module';
import { CartsModule } from './modules/carts/carts.module';
import { PointModule } from './modules/point/point.module';
import { ProductReviewsModule } from './modules/product-reviews/product-reviews.module';
import { ProductInquiriesModule } from './modules/product-inquiries/product-inquiries.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Enable scheduled tasks (cron jobs)
    AuthModule,
    UserModule,
    PointModule,
    ProductModule, // Product CRUD operations
    ProductDiscountModule,
    ProductReviewsModule,
    ProductInquiriesModule,
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
    CategoriesModule,
    CartsModule,
    PaymentModule,
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
