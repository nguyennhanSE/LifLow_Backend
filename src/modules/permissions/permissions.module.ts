import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsRepository } from './repositories/permissions.repository';
import { PrismaModule } from '../../../prisma/prisma.module';
import { LoggerModule } from '../../libs/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsRepository],
  exports: [PermissionsService],
})
export class PermissionsModule {}
