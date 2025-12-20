import { BadRequestException } from '@nestjs/common';

export class OrderValidationException extends BadRequestException {
  constructor(message = 'Invalid order data') {
    super(message);
  }
}

