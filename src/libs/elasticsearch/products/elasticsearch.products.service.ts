// products/elasticsearch-products.service.ts
import { Injectable } from '@nestjs/common';
import { ElasticsearchClientService } from '../elasticsearch.service';
import { queryParams } from '../elasticsearch.dto';

const PRODUCTS_INDEX = 'products';

const SIMILAR_PRODUCT_FIELDS = [
  'brand',
  'englishProductName',
  'manufacturer',
  'productBriefDescription',
  'productCode',
  'productName',
  'productSummaryDescription',
];

const SEARCH_PRODUCT_FIELDS = [
  'productName^3',
  'englishProductName^3',
  'productCode^2',
  'brand^2',
  'manufacturer^2',
  'productBriefDescription^1.5',
  'productSummaryDescription',
];

// Fields không cần .keyword khi sort (date, number)
const NON_KEYWORD_SORT_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'productPrice',
  'salePrice',
  'consumerPrice',
  'productCategoryNumber',
  'productClientCategory',
]);

@Injectable()
export class ElasticsearchProductsService {
    constructor(
    private readonly esService: ElasticsearchClientService,
    ) {}

    // ── 1. Search sản phẩm theo keyword (dùng cho debounce/enter search) ──
    async searchProducts(query: queryParams) {
    const { search, page = 1, limit = 10, sortBy, sortOrder = 'asc' } = query;
    const from = (page - 1) * limit;

    const sort = sortBy
        ? [{ [NON_KEYWORD_SORT_FIELDS.has(sortBy) ? sortBy : `${sortBy}.keyword`]: { order: sortOrder } }]
        : [{ _score: { order: 'desc' } }];

    let esQuery: any;

    if (!search) {
        esQuery = { match_all: {} };
    } else if (search.trim().length <= 2) {
        // prefix search
        esQuery = {
        bool: {
            should: SEARCH_PRODUCT_FIELDS.map((field) => {
            // Strip boost ký hiệu "^3" để lấy tên field thuần
            const fieldName = field.split('^')[0];
            return {
                prefix: {
                [`${fieldName}.keyword`]: {
                    value: search.toLowerCase(),
                    case_insensitive: true,  // ES 7.10+
                },
                },
            };
            }),
            minimum_should_match: 1,
        },
        };
    } else {
        // full text -> multi_match 
        esQuery = {
        bool: {
            should: [
            // Full-text match (weighted)
            {
                multi_match: {
                query: search,
                fields: SEARCH_PRODUCT_FIELDS,
                fuzziness: 'AUTO',
                minimum_should_match: '60%',
                },
            },
            ...SEARCH_PRODUCT_FIELDS.map((field) => {
                const fieldName = field.split('^')[0];
                return {
                match_phrase_prefix: {
                    [fieldName]: { query: search },
                },
                };
            }),
            ],
            minimum_should_match: 1,
        },
        };
    }

    const response = await this.esService.search(PRODUCTS_INDEX, {
        from,
        size: limit,
        track_total_hits: true,
        query: esQuery,
        sort,
    });

    return this.formatPaginatedResponse(response, page, limit);
    }


    // ── 2. Lấy danh sách ID sản phẩm tương tự ─────────────────────────────
    async findSimilarProductIds(
    productId: string,
    limit = 10,
    ): Promise<string[]> {
    const response = await this.esService.moreLikeThis(
        PRODUCTS_INDEX,
        productId,
        SIMILAR_PRODUCT_FIELDS,
        limit,
    );

    const hits = (response as any).body?.hits?.hits ?? [];

    return hits
        .map((hit: any) => hit?._id)
        .filter(
        (id: unknown): id is string =>
            typeof id === 'string' && id.length > 0,
        );
    }

    // ── 3. Lấy full document sản phẩm tương tự ────────────────────────────
    async findSimilarProducts(productId: string, query: queryParams) {
    const { page = 1, limit = 10 } = query;
    const from = (page - 1) * limit;

    const response = await this.esService.search(PRODUCTS_INDEX, {
        from,
        size: limit,
        track_total_hits: true,
        query: {
        more_like_this: {
            fields: SIMILAR_PRODUCT_FIELDS,
            like: [{ _index: PRODUCTS_INDEX, _id: productId }],
            min_term_freq: 1,
            max_query_terms: 12,
            minimum_should_match: '30%',
        },
        },
    });

    return this.formatPaginatedResponse(response, page, limit);
    }

    // ── 4. Lấy sản phẩm theo danh sách ID (dùng sau khi có similarIds) ────
    async findProductsByIds(ids: string[]) {
    if (ids.length === 0) return [];

    const response = await this.esService.search(PRODUCTS_INDEX, {
        size: ids.length,
        query: {
        ids: { values: ids },
        },
    });

    const hits = (response as any).body?.hits?.hits ?? [];
    return hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
    }));
    }

    // ── Helper: format response thành paginated result ─────────────────────
    private formatPaginatedResponse(
    response: any,
    page: number,
    limit: number,
    ) {
    const hits = response.body?.hits?.hits ?? [];
    const totalHits = response.body?.hits?.total;
    const total =
        typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;

    return {
        data: hits.map((hit: any) => ({
                id: hit._id,
                score: hit._score,
                ...hit._source,
            })),
        meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        },
    };
    }
}