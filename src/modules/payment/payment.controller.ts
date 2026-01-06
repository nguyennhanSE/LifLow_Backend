import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
// import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { ResponseModel } from 'src/libs/models/response/response.model';

@Controller('payment')
export class PaymentController {
  // constructor(private readonly paymentService: PaymentService) {}

  // @Post()
  // async create(@Body() createPaymentDto: CreatePaymentDto) {
  //   const responseModel = new ResponseModel();

  //   try {
  //     const result = await this.paymentService.create(createPaymentDto);
  //     responseModel.setData(result);
  //   } catch (error) {
  //     throw error;
  //   }

  //   return responseModel;
  // }

  // @Get()
  // async findAll() {
  //   const responseModel = new ResponseModel();

  //   try {
  //     const result = await this.paymentService.findAll();
  //     responseModel.setData(result);
  //   } catch (error) {
  //     throw error;
  //   }

  //   return responseModel;
  // }

  // @Get(':id')
  // async findOne(@Param('id') id: string) {
  //   const responseModel = new ResponseModel();

  //   try {
  //     const result = await this.paymentService.findOne(+id);
  //     responseModel.setData(result);
  //   } catch (error) {
  //     throw error;
  //   }

  //   return responseModel;
  // }

  // @Patch(':id')
  // async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
  //   const responseModel = new ResponseModel();

  //   try {
  //     const result = await this.paymentService.update(+id, updatePaymentDto);
  //     responseModel.setData(result);
  //   } catch (error) {
  //     throw error;
  //   }

  //   return responseModel;
  // }

  // @Delete(':id')
  // async remove(@Param('id') id: string) {
  //   const responseModel = new ResponseModel();

  //   try {
  //     const result = await this.paymentService.remove(+id);
  //     responseModel.setData(result);
  //   } catch (error) {
  //     throw error;
  //   }

  //   return responseModel;
  // }
}
