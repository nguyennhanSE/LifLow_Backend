import { BadRequestException } from '@nestjs/common';

export class OrderGroupValidationException extends BadRequestException {
  constructor(message?: string) {
    super(message || 'OrderGroup validation failed');
  }
}
