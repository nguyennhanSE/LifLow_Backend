import 'dotenv/config';
import * as dotenv from 'dotenv';

export const NODE_ENV = process.env.NODE_ENV || 'development';
const envFile = NODE_ENV === 'production' ? '.env.prod' : '.env.dev'
dotenv.config({ path: envFile });

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
  NAVER_REDIRECT_URI: 'http://localhost:3000/sign-in',

  // Email Configuration
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
};
