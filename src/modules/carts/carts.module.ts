import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { CartController } from './controllers/cart.controller';
import { CartItemController } from './controllers/cart-item.controller';
import { CartService } from './services/cart.service';
import { CartItemService } from './services/cart-item.service';
import { CartRepository } from './repositories/cart.repository';
import { CartItemRepository } from './repositories/cart-item.repository';
import { CartUserInterceptor } from './interceptors/cart.interceptor';
import { UserEventLogQueueModule } from '../user-event-log/queue/user-event-log.queue.module';

/**
 * Cart module for managing shopping carts and cart items
 */
@Module({
  imports: [PrismaModule, UserModule, UserEventLogQueueModule],
  controllers: [CartController, CartItemController],
  providers: [
    CartService,
    CartItemService,
    CartRepository,
    CartItemRepository,
    CartUserInterceptor,
  ],
  exports: [
    CartService,
    CartItemService,
    CartRepository,
    CartItemRepository,
  ],
})
export class CartsModule {}
