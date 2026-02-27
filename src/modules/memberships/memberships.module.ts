import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MembershipRepository } from './repositories/membership.repository';
import { MembershipRecalculationService } from './cronjob/membership-cronjob.service';
import { MembershipQueueModule } from './queue/membership-queue.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { GuardModule } from '../../guard/guard.module';
import { LoggerModule } from '../../libs/logger/logger.module';

@Module({
  imports: [
    PrismaModule,
    GuardModule,
    LoggerModule,
    MembershipQueueModule,
  ],
  controllers: [MembershipsController],
  providers: [
    MembershipsService,
    MembershipRepository,
    MembershipRecalculationService,
  ],
  exports: [
    MembershipsService,
    MembershipRepository,
    MembershipRecalculationService,
  ],
})
export class MembershipsModule {}
