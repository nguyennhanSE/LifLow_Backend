// elasticsearch.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { Client } from 'es7';

@Injectable()
export class ElasticsearchClientService {
    constructor(
        @Inject('ELASTICSEARCH_CLIENT') private readonly esClient: Client,
    ) {}
        
    async search(index: string, body: Record<string, any>) {
        const response = await this.esClient.search({ index, body });
        console.log('Elasticsearch body:', JSON.stringify(body, null, 2));
        return response;
    }

    async moreLikeThis(
        index: string,
        documentId: string,
        fields: string[],
        size = 10,
    ) {
        return this.esClient.search({
        index,
        body: {
            size,
            query: {
            more_like_this: {
                fields,
                like: [{ _index: index, _id: documentId }],
                min_term_freq: 1,
                max_query_terms: 12,
                minimum_should_match: '30%',
            },
            },
        },
        });
    }

    async multiMatchQuery(
        index: string,
        keyword: string,
        fields: string[],
        options?: {
        fuzziness?: string;
        minimumShouldMatch?: string;
        from?: number;
        size?: number;
        },
    ) {
        return this.esClient.search({
        index,
        body: {
            from: options?.from ?? 0,
            size: options?.size ?? 10,
            query: {
            multi_match: {
                query: keyword,
                fields,
                fuzziness: options?.fuzziness ?? 'AUTO',
                minimum_should_match: options?.minimumShouldMatch ?? '60%',
            },
            },
        },
        });
    }

    async boolQuery(
        index: string,
        clauses: {
        must?: any[];
        should?: any[];
        filter?: any[];
        must_not?: any[];
        },
        options?: { from?: number; size?: number },
    ) {
        return this.esClient.search({
        index,
        body: {
            from: options?.from ?? 0,
            size: options?.size ?? 10,
            query: { bool: clauses },
        },
        });
    }
}