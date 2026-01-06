import { NotFoundException } from '@nestjs/common';

export class PointNotFoundException extends NotFoundException {
  constructor(message = 'Point not found') {
    super(message);
  }
}

