import * as dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Load .env base trước để đọc NODE_ENV
dotenv.config({ path: '.env' });

const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.prod' : '.env.dev';

// Load env file tương ứng, nhưng ưu tiên biến môi trường đã được set sẵn
dotenv.config({ path: envFile });

console.log('NODE_ENV:', NODE_ENV);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
