import { PaginationMeta } from '../modules/product/dto/product.dto';

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

/**
 * Format success response
 */
export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}

/**
 * Format error response
 */
export function errorResponse(error: Error, statusCode: number = 500): ErrorResponse {
  return {
    success: false,
    error: {
      code: statusCode.toString(),
      message: error.message || 'Internal server error',
    },
  };
}

/**
 * Format paginated response
 */
export function paginationResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrev,
    },
    ...(message && { message }),
  };
}

