import { Test, TestingModule } from '@nestjs/testing';
import { ProductInquiriesController } from './controllers/product-inquiries.controller';
import { ProductInquiriesService } from './services/product-inquiries.service';

describe('ProductInquiriesController', () => {
  let controller: ProductInquiriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductInquiriesController],
      providers: [ProductInquiriesService],
    }).compile();

    controller = module.get<ProductInquiriesController>(ProductInquiriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
