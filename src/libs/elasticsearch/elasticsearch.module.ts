// elasticsearch.module.ts
import { Module, Global } from '@nestjs/common';
import { Client } from 'es7';
import {config} from '../config';
import { ElasticsearchClientService} from './elasticsearch.service';
import { ElasticsearchProductsService } from './products/elasticsearch.products.service';
import { PrismaModule } from 'prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: 'ELASTICSEARCH_CLIENT',
      useFactory: () => {
        return new Client({
          node: config.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
        //   auth: {
        //     username: config.ELASTICSEARCH_USERNAME ?? 'elastic',
        //     password: config.ELASTICSEARCH_PASSWORD ?? '',
        //   },
          // Nếu dùng self-signed cert
        //   tls: { rejectUnauthorized: false },
        });
      },
    },
    ElasticsearchClientService,
    ElasticsearchProductsService,
  ],
  exports: ['ELASTICSEARCH_CLIENT', ElasticsearchClientService, ElasticsearchProductsService],
})
export class ElasticsearchClientModule {}
