import * as dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Load the same env file as your Nest app (`.env.dev` in development, `.env.prod` in production)
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: envFile });

console.log('DATABASE_URL', env('DATABASE_URL'));

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
