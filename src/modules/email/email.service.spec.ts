import { Test, TestingModule } from '@nestjs/testing';
import { UserEmailService } from './email.service';

describe('EmailService', () => {
  let service: UserEmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserEmailService],
    }).compile();

    service = module.get<UserEmailService>(UserEmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
