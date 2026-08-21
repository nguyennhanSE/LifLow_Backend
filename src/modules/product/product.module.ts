import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductRepository } from './repositories/product.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ProductDiscountModule } from '../product-discount/product-discount.module';
import { AwsModule } from 'src/libs/integration/aws/aws.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AppEventEmitterModule } from 'src/libs/event-emitter/event-emitter.module';

@Module({
  imports: [PrismaModule, ProductDiscountModule, AwsModule, ScheduleModule.forRoot(), NotificationsModule, AppEventEmitterModule],
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductRepository,
  ],
  exports: [ProductService],
})
export class ProductModule {}
