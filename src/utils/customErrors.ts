import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom error for validation failures (400)
 */
export class ValidationError extends HttpException {
  constructor(message: string) {
    super(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message,
        },
      },
      HttpStatus.BAD_REQUEST
    );
  }
}

/**
 * Custom error for not found resources (404)
 */
export class NotFoundError extends HttpException {
  constructor(message: string) {
    super(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message,
        },
      },
      HttpStatus.NOT_FOUND
    );
  }
}

/**
 * Custom error for duplicate resources (409)
 */
export class DuplicateError extends HttpException {
  constructor(message: string) {
    super(
      {
        success: false,
        error: {
          code: 'DUPLICATE_ERROR',
          message,
        },
      },
      HttpStatus.CONFLICT
    );
  }
}

