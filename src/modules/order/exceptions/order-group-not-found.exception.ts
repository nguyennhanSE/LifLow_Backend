import { NotFoundException } from '@nestjs/common';

export class OrderGroupNotFoundException extends NotFoundException {
  constructor(message?: string) {
    super(message || 'OrderGroup not found');
  }
}
