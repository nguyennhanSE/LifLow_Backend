import { Test, TestingModule } from '@nestjs/testing';
import { ProductInquiriesService } from './services/product-inquiries.service';

describe('ProductInquiriesService', () => {
  let service: ProductInquiriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductInquiriesService],
    }).compile();

    service = module.get<ProductInquiriesService>(ProductInquiriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
