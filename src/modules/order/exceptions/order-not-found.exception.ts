import { NotFoundException } from '@nestjs/common';

export class OrderNotFoundException extends NotFoundException {
  constructor(message = 'Order not found') {
    super(message);
  }
}

