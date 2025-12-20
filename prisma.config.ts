import * as dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load the same env file as your Nest app (`.env.dev` in development, `.env.prod` in production)
const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: envFile });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Use DATABASE_URL from the selected env file
    url: process.env.DATABASE_URL!,
  },
});
