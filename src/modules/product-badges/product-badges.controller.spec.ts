import { Test, TestingModule } from '@nestjs/testing';
import { ProductBadgesController } from './product-badges.controller';
import { ProductBadgesService } from './product-badges.service';

describe('ProductBadgesController', () => {
  let controller: ProductBadgesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductBadgesController],
      providers: [ProductBadgesService],
    }).compile();

    controller = module.get<ProductBadgesController>(ProductBadgesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
