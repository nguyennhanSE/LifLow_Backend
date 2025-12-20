import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { OrderNotFoundException } from '../exceptions/order-not-found.exception';
import { OrderValidationException } from '../exceptions/order-validation.exception';

@Catch(OrderNotFoundException, OrderValidationException)
export class OrderExceptionFilter implements ExceptionFilter {
  catch(
    exception: OrderNotFoundException | OrderValidationException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isNotFound = exception instanceof OrderNotFoundException;
    const status = isNotFound ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      success: false,
      data: null,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}

