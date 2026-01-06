import { PartialType } from '@nestjs/swagger';
import { CreatePaymentDto } from './payment-request.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {}
