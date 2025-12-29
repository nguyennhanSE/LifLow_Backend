import { Test, TestingModule } from '@nestjs/testing';
import { ProductDiscountController } from './product-discount.controller';
import { ProductDiscountService } from './product-discount.service';

describe('ProductDiscountController', () => {
  let controller: ProductDiscountController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductDiscountController],
      providers: [ProductDiscountService],
    }).compile();

    controller = module.get<ProductDiscountController>(ProductDiscountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
