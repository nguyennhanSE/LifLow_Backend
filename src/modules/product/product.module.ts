import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';
import { ProductSpecialOfferCronjobService } from './extends/product-special-offers/cronjob/product-special-offer.cronjob.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ProductDiscountModule } from '../product-discount/product-discount.module';
import { AwsModule } from 'src/libs/integration/aws/aws.module';

@Module({
  imports: [PrismaModule, ProductDiscountModule, AwsModule, ScheduleModule.forRoot()],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRepository,
    ProductSpecialOfferCronjobService,
  ],
  exports: [ProductService],
})
export class ProductModule {}
