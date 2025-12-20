import { Module } from '@nestjs/common';
import { UserEmailService } from './email.service';
import { EmailController } from './email.controller';
import { NodemailerModule } from '../../libs/integration/nodemailer/nodemailer.module';

@Module({
  imports: [NodemailerModule],
  controllers: [EmailController],
  providers: [UserEmailService],
  exports: [UserEmailService],
})
export class EmailModule {}
