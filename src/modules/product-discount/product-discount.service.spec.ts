import { Test, TestingModule } from '@nestjs/testing';
import { ProductDiscountService } from './product-discount.service';

describe('ProductDiscountService', () => {
  let service: ProductDiscountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductDiscountService],
    }).compile();

    service = module.get<ProductDiscountService>(ProductDiscountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
