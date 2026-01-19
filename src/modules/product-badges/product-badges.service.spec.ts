import { Test, TestingModule } from '@nestjs/testing';
import { ProductBadgesService } from './product-badges.service';

describe('ProductBadgesService', () => {
  let service: ProductBadgesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductBadgesService],
    }).compile();

    service = module.get<ProductBadgesService>(ProductBadgesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
