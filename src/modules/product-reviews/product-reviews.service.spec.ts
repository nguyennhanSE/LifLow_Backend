import { Test, TestingModule } from '@nestjs/testing';
import { ProductReviewsService } from './product-reviews.service';

describe('ProductReviewsService', () => {
  let service: ProductReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductReviewsService],
    }).compile();

    service = module.get<ProductReviewsService>(ProductReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
