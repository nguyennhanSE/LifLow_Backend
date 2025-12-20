import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata
 */
export class PaginationMeta {
  @ApiProperty({
    description: 'Total number of items',
    example: 100,
  })
  total!: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages!: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext!: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrev!: boolean;
}

/**
 * Generic paginated response wrapper
 * Use this for all paginated API responses
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    isArray: true,
  })
  items!: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMeta,
  })
  meta!: PaginationMeta;

  constructor(items: T[], meta: PaginationMeta) {
    this.items = items;
    this.meta = meta;
  }
}

/**
 * Helper function to create paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponseDto<T> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return new PaginatedResponseDto(items, {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  });
}

/**
 * Paginated response with additional metadata
 */
export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Type for pagination query parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Validates and normalizes pagination parameters
 */
export function normalizePaginationParams(
  params: PaginationParams,
): Required<PaginationParams> {
  const page = Math.max(1, params.page || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, params.limit || DEFAULT_LIMIT),
  );
  const sortBy = params.sortBy || 'createdAt';
  const order = params.order || 'desc';

  return { page, limit, sortBy, order };
}

