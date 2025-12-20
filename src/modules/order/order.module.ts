import { Module } from '@nestjs/common';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';
import { OrderRepository } from './repositories/order.repository';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';
import { OrderExceptionFilter } from './filters/order-exception.filter';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { LoggerModule } from 'src/libs/logger/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderRepository,
    PrismaService,
    PrismaExceptionFilter,
    OrderExceptionFilter,
    ResponseTransformInterceptor,
  ],
  exports: [OrdersService],
})
export class OrderModule {}
