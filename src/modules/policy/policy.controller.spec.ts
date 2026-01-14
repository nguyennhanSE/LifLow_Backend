import { Test, TestingModule } from '@nestjs/testing';
import { PolicyController } from './policy.controller';
import { PolicyService } from './policy.service';
import { PolicyRepository } from './repositories/policy.repository';

describe('PolicyController', () => {
  let controller: PolicyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PolicyController],
      providers: [
        PolicyService,
        {
          provide: PolicyRepository,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            findActive: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PolicyController>(PolicyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
