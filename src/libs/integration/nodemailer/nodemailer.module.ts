import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NodemailerService } from "./nodemailer.service";

@Module({
  imports: [ConfigModule],
  providers: [NodemailerService],
  exports: [NodemailerService],
})
export class NodemailerModule {}