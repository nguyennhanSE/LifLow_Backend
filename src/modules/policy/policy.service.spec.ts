import { Test, TestingModule } from '@nestjs/testing';
import { PolicyService } from './policy.service';
import { PolicyRepository } from './repositories/policy.repository';

describe('PolicyService', () => {
  let service: PolicyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<PolicyService>(PolicyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
