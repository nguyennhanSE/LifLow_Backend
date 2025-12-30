import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductDiscountService } from './product-discount.service';
import { ProductDiscountController } from './product-discount.controller';
import { ProductDiscountRepository } from './repositories/product-discount.repository';
import { ProductDiscountCronjobService } from './cronjob/product-discount.cronjob.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [ProductDiscountController],
  providers: [
    ProductDiscountService,
    ProductDiscountRepository,
    ProductDiscountCronjobService,
  ],
  exports: [
    ProductDiscountService,
    ProductDiscountRepository,
    ProductDiscountCronjobService,
  ],
})
export class ProductDiscountModule {}
