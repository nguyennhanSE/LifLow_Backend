import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'prisma/prisma.service';
import { PRODUCT_EVENTS } from 'src/modules/product/constants/product-event.constant';
import type { ProductCreatedEventPayload } from 'src/modules/product/constants/product-event.constant';
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
    private readonly logger = new Logger(ElasticsearchProductsService.name);

    constructor(
    private readonly esService: ElasticsearchClientService,
    private readonly prisma: PrismaService,
    ) {}

    @OnEvent(PRODUCT_EVENTS.CREATED, { async: true })
    async handleProductCreated(payload: ProductCreatedEventPayload): Promise<void> {
    try {
        await this.indexProductById(payload.productId);
    } catch (error) {
        this.logger.error(
        `Failed to sync product ${payload.productId} to Elasticsearch after creation`,
        error instanceof Error ? error.stack : String(error),
        );
    }
    }

    async indexProductById(productId: string) {
    const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
        id: true,
        productCode: true,
        productName: true,
        englishProductName: true,
        productSummaryDescription: true,
        productBriefDescription: true,
        searchKeywordSetting: true,
        brand: true,
        manufacturer: true,
        supplier: true,
        displayStatus: true,
        saleStatus: true,
        salePrice: true,
        productPrice: true,
        consumerPrice: true,
        stockQuantity: true,
        productCategoryNumber: true,
        productClientCategory: true,
        createdAt: true,
        updatedAt: true,
        },
    });

    if (!product) {
        this.logger.warn(`Product ${productId} not found; skipping Elasticsearch sync`);
        return null;
    }

    return this.esService.index(PRODUCTS_INDEX, product.id, product);
    }

    // 1. Searchung products with pagination, sorting, and filtering
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
