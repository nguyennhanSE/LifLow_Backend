import { Module } from '@nestjs/common';
import { OrdersController } from './order.controller';
import { OrdersService } from './order.service';
import { OrderRepository } from './repositories/order.repository';
import { OrderGroupRepository } from './repositories/order-group.repository';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaExceptionFilter } from './filters/prisma-exception.filter';
import { OrderExceptionFilter } from './filters/order-exception.filter';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { PointModule } from '../point/point.module';
import { PointService } from '../point/point.service';
import { MembershipsModule } from '../memberships/memberships.module';

@Module({
  imports: [LoggerModule, MembershipsModule, PointModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderRepository,
    OrderGroupRepository,
    PrismaService,
    PrismaExceptionFilter,
    OrderExceptionFilter,
    ResponseTransformInterceptor,
  ],
  exports: [OrdersService],
})
export class OrderModule {}
