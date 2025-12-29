import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { BannerRepository } from './repositories/banner.repository';
import { BannerTasksService } from './tasks/banner-tasks.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ProductModule } from '../product/product.module';
import { LoggerModule } from '../../libs/logger/logger.module';
import { AwsModule } from 'src/libs/integration/aws/aws.module';

@Module({
  imports: [PrismaModule, ProductModule, ConfigModule, LoggerModule, AwsModule],
  controllers: [BannerController],
  providers: [BannerService, BannerRepository, BannerTasksService],
  exports: [BannerService, BannerRepository, BannerTasksService],
})
export class BannerModule {}
