import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from './repositories/user.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { LoggerModule } from '../../libs/logger/logger.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { OrderModule } from '../order/order.module';
import { OrderRepository } from '../order/repositories/order.repository';
import { AwsModule } from '../../libs/integration/aws/aws.module';
import { EmailModule } from '../email/email.module';
import { CouponHistoryModule } from '../coupon-history/coupon-history.module';
@Module({
  imports: [PrismaModule, PermissionsModule, RolesModule, LoggerModule, MembershipsModule, OrderModule, AwsModule, EmailModule, CouponHistoryModule],
  controllers: [UserController],
  providers: [UserService, UserRepository, OrderRepository],
  exports: [UserService],
})
export class UserModule {}
