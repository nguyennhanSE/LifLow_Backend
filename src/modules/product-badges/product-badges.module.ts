import { Module } from '@nestjs/common';
import { ProductBadgesService } from './product-badges.service';
import { ProductBadgesController } from './product-badges.controller';
import { ProductBadgeRepository } from './repositories/product-badge.repository';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductBadgesController],
  providers: [ProductBadgesService, ProductBadgeRepository],
  exports: [ProductBadgesService, ProductBadgeRepository],
})
export class ProductBadgesModule {}
