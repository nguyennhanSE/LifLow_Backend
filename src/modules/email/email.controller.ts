import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserEmailService } from './email.service';
import type { SendEmailDto } from './dto/email.dto';
import { Public } from 'src/libs/decorator/public.decorator';
import { ResponseModel } from 'src/libs/models/response/response.model';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: UserEmailService) {}

  @Post('welcome')
  @Public()
  async sendWelcomeEmail(@Body() sendEmailDto: SendEmailDto) {
    const responseModel = new ResponseModel();

    try {
      const result = await this.emailService.sendWelcomeEmail(sendEmailDto,'123456');
      responseModel.setData(result);
    } catch (error) {
      throw error;
    }

    return responseModel;
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateEmailDto: UpdateEmailDto) {
  //   return this.emailService.update(+id, updateEmailDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.emailService.remove(+id);
  // }
}
