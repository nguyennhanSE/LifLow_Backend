import { Module } from "@nestjs/common";
import { NodemailerModule } from "../../../libs/integration/nodemailer/nodemailer.module";
import { EmailQueueService } from "./email.queue.service";

@Module({
  imports: [NodemailerModule],
  exports: [EmailQueueService],
})
export class EmailQueueModule {}