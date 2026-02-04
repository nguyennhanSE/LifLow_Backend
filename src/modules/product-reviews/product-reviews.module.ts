import { Module } from '@nestjs/common';
import { ProductReviewsService } from './product-reviews.service';
import { ProductReviewsController } from './product-reviews.controller';
import { ProductReviewsRepository } from './repositories/product-reviews.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { AwsModule } from '../../libs/integration/aws/aws.module';
import { RecipeModule } from '../recipe/recipe.module';

/**
 * ProductReviewsModule
 * Manages product reviews functionality
 */
@Module({
  imports: [
    PrismaModule,    // For database access
    UserModule,      // For user validation and relations
    ProductModule,   // For product validation and relations
    AwsModule,
    RecipeModule,   // For recipe likes (likedByMe)
  ],
  controllers: [ProductReviewsController],
  providers: [ProductReviewsService, ProductReviewsRepository],
  exports: [ProductReviewsService, ProductReviewsRepository],
})
export class ProductReviewsModule {}
