import { Module } from '@nestjs/common';
import { ProductDiscountService } from './product-discount.service';
import { ProductDiscountController } from './product-discount.controller';
import { ProductDiscountRepository } from './repositories/product-discount.repository';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductDiscountController],
  providers: [ProductDiscountService, ProductDiscountRepository],
  exports: [ProductDiscountService, ProductDiscountRepository],
})
export class ProductDiscountModule {}
