import { BadRequestException } from '@nestjs/common';

export class PointValidationException extends BadRequestException {
  constructor(message = 'Invalid point data') {
    super(message);
  }
}

