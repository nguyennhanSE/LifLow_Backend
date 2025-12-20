import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MembershipRepository } from './repositories/membership.repository';
import { MembershipRecalculationService } from './cronjob/membership-cronjob.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { GuardModule } from '../../guard/guard.module';
import { LoggerModule } from '../../libs/logger/logger.module';

@Module({
  imports: [
    PrismaModule,
    GuardModule,
    LoggerModule,
    ScheduleModule.forRoot(),
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
