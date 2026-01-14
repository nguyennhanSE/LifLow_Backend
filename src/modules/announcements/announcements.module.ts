import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AwsModule } from '../../libs/integration/aws/aws.module';

@Module({
  imports: [PrismaModule, AwsModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService, AnnouncementsRepository],
  exports: [AnnouncementsService, AnnouncementsRepository],
})
export class AnnouncementsModule {}
