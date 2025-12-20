import { Injectable } from "@nestjs/common";
import { NodemailerService } from "src/libs/integration/nodemailer/nodemailer.service";

@Injectable()
export class EmailQueueService {
  constructor(private readonly nodemailerService: NodemailerService) {}

//   async sendEmail(email: string, subject: string, text: string) {
//     await this.nodemailerService.sendEmail(email, subject, text);
//   }
}   