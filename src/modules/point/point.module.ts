import { Module } from '@nestjs/common';
import { PointController } from './point.controller';
import { PointService } from './point.service';
import { PointRepository } from './repositories/point.repository';
import { PrismaService } from 'prisma/prisma.service';
import { PrismaExceptionFilter } from '../order/filters/prisma-exception.filter';
import { LoggerModule } from 'src/libs/logger/logger.module';

@Module({
  imports: [LoggerModule],
  controllers: [PointController],
  providers: [
    PointService,
    PointRepository,
    PrismaService,
    PrismaExceptionFilter,
  ],
  exports: [PointService],
})
export class PointModule {}
