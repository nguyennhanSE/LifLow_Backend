import * as dotenv from 'dotenv';

// Load .env first so NODE_ENV is available when choosing env file
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
// Load env-specific file with override: true so .env.dev/.env.prod wins over .env
dotenv.config({ path: envFile, override: true });

export const config = {
  // App Configuration
  APP_PORT: parseInt(process.env.PORT || process.env.APP_PORT || '3001', 10),
  APP_HOST: process.env.APP_HOST || 'http://localhost:3500',

  // Frontend Configuration
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  FRONTEND_PORT: process.env.FRONTEND_PORT ?? 3000,
  
  // JWT Configuration
  JWT_SECRET_ACCESS_TOKEN: process.env.JWT_SECRET_ACCESS_TOKEN ?? 'LiflowAccessTokenSecret',
  JWT_SECRET_REFRESH_TOKEN: process.env.JWT_SECRET_REFRESH_TOKEN ?? 'LiflowRefreshTokenSecret',
  JWT_TOKEN_EXPIRATION_TIME: process.env.JWT_TOKEN_EXPIRATION_TIME ?? '1d',
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN ?? '1d',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',

  // Database Configuration
  DATABASE_USERNAME: process.env.DATABASE_USERNAME ?? 'postgres',
  DATABASE_PASSWORD: process.env.DATABASE_PASSWORD ?? 'postgres',
  DATABASE_HOST: process.env.DATABASE_HOST ?? 'localhost',
  DATABASE_PORT: process.env.DATABASE_PORT ?? 5432,
  DATABASE_NAME: process.env.DATABASE_NAME ?? 'postgres',
  DATABASE_SCHEMA: process.env.DATABASE_SCHEMA ?? 'public',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:123456@localhost:5540/postgres',
  // Naver Configuration
  NAVER_CLIENT_ID: process.env.NAVER_CLIENT_ID ?? '',
  NAVER_CLIENT_SECRET: process.env.NAVER_CLIENT_SECRET ?? '',
  NAVER_REDIRECT_URI: process.env.NAVER_REDIRECT_URI ?? 'http://localhost:3500/api/v1/auth/naver/callback',

  // Email Configuration (supports both EMAIL_SECURE and EMAIL_USE_SSL)
  EMAIL_HOST: process.env.EMAIL_HOST ?? 'smtp.naver.com',
  EMAIL_PORT: process.env.EMAIL_PORT ?? 465,
  EMAIL_SECURE: process.env.EMAIL_SECURE ?? true,
  EMAIL_USER: process.env.EMAIL_USER ?? '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ?? '',
  EMAIL_FROM: process.env.EMAIL_FROM ?? 'noreply@liflow.com',

  // Cloudinary Configuration
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? '',

  // Kakao OAuth Configuration
  // NOTE: Put real values in .env.dev/.env.prod (these files are typically gitignored)
  KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY ?? '',
  KAKAO_JAVASCRIPT_KEY: process.env.KAKAO_JAVASCRIPT_KEY ?? '',
  KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET ?? '',
  KAKAO_REDIRECT_URI: process.env.KAKAO_REDIRECT_URI ?? '',

  // AWS Configuration
  AWS_REGION: process.env.AWS_REGION ?? '',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? '',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET ?? '',

  // Toss Configuration
  TOSS_CLIENT_KEY: process.env.TOSS_CLIENT_KEY ?? '',
  TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY ?? '',
  TOSS_API_URL: process.env.TOSS_API_URL ?? '',
  TOSS_WEBHOOK_SECRET: process.env.TOSS_WEBHOOK_SECRET ?? '',
  TOSS_SUCCESS_URL: process.env.TOSS_SUCCESS_URL ?? '',
  TOSS_FAIL_URL: process.env.TOSS_FAIL_URL ?? '',

  // Redis (BullMQ)
  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),

  // Firebase (FCM)
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ?? '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ?? '',

  // Node Exporter Configuration
  NODE_EXPORTER_HOST: process.env.NODE_EXPORTER_HOST ?? 'localhost',
  NODE_EXPORTER_PORT: process.env.NODE_EXPORTER_PORT ?? 9100,

  // #Prometheus
  PROMETHEUS_HOST: process.env.PROMETHEUS_HOST ?? 'localhost',
  PROMETHEUS_PORT: process.env.PROMETHEUS_PORT ?? 9090,
  PROMETHEUS_BASE_URL: process.env.PROMETHEUS_BASE_URL ?? 'http://prometheus:9090',
  PROMETHEUS_SCRAPE_INTERVAL: process.env.PROMETHEUS_SCRAPE_INTERVAL ?? '15s',
  PROMETHEUS_SCRAPE_TIMEOUT: process.env.PROMETHEUS_SCRAPE_TIMEOUT ?? '10s',
  PROMETHEUS_SCRAPE_TARGETS: process.env.PROMETHEUS_SCRAPE_TARGETS ?? 'node-exporter:9100',

  // @Grafana
  GRAFANA_HOST: process.env.GRAFANA_HOST ?? 'localhost',
  GRAFANA_PORT: process.env.GRAFANA_PORT ?? 3000,
  GF_SECURITY_ADMIN_USER: process.env.GF_SECURITY_ADMIN_USER ?? 'admin',
  GF_SECURITY_ADMIN_PASSWORD: process.env.GF_SECURITY_ADMIN_PASSWORD ?? 'admin',
  GRAFANA_BASE_URL: process.env.GRAFANA_BASE_URL ?? 'http://grafana:3000',  
  GRAFANA_DATASOURCE : process.env.GRAFANA_DATASOURCE ?? 'http://prometheus:9090',

  // Elasticsearch:
  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE ?? 'http://elasticsearch:9200',
};

// TOSS Payments Helper Functions
export const getTossConfig = () => ({
  secretKey: config.TOSS_SECRET_KEY,
  clientKey: config.TOSS_CLIENT_KEY,
  apiUrl: config.TOSS_API_URL,
  webhookSecret: config.TOSS_WEBHOOK_SECRET,
  successUrl: config.TOSS_SUCCESS_URL,
  failUrl: config.TOSS_FAIL_URL,
});

export const getTossAuthHeader = (): string => {
  const secretKey = config.TOSS_SECRET_KEY;
  if (!secretKey) {
      throw new Error('TOSS_SECRET_KEY is not configured');
  }
  // Toss uses Basic Auth: base64(SECRET_KEY + ':')
  const encoded = Buffer.from(`${secretKey}:`).toString('base64');
  return `Basic ${encoded}`;
};

export const getTossClientKey = (): string => {
  return config.TOSS_CLIENT_KEY || '';
};