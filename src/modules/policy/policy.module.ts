import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';
import { PolicyController } from './policy.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PolicyRepository } from './repositories/policy.repository';

@Module({
  imports: [PrismaModule],
  controllers: [PolicyController],
  providers: [PolicyService, PolicyRepository],
  exports: [PolicyService, PolicyRepository],
})
export class PolicyModule {}
