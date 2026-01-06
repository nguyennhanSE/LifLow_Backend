import { Module } from '@nestjs/common';
import { ProductInquiriesService } from './services/product-inquiries.service';
import { ProductInquiryAnswersService } from './services/product-inquiry-answers.service';
import { ProductInquiriesController } from './controllers/product-inquiries.controller';
import { ProductInquiriesRepository } from './repositories/product-inquiries.repository';
import { ProductInquiryAnswersRepository } from './repositories/product-inquiry-answers.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';

/**
 * ProductInquiriesModule
 * Manages product inquiries and answers functionality
 */
@Module({
  imports: [
    PrismaModule,    // For database access
    UserModule,      // For user validation and relations
    ProductModule,   // For product validation and relations
  ],
  controllers: [ProductInquiriesController],
  providers: [
    ProductInquiriesService,
    ProductInquiriesRepository,
    ProductInquiryAnswersService,
    ProductInquiryAnswersRepository,
  ],
  exports: [
    ProductInquiriesService,
    ProductInquiryAnswersService,
  ],
})
export class ProductInquiriesModule {}
