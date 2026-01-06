import { Test, TestingModule } from '@nestjs/testing';
import { ProductReviewsController } from './product-reviews.controller';
import { ProductReviewsService } from './product-reviews.service';

describe('ProductReviewsController', () => {
  let controller: ProductReviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductReviewsController],
      providers: [ProductReviewsService],
    }).compile();

    controller = module.get<ProductReviewsController>(ProductReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
