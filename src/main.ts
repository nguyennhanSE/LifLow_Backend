import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config, NODE_ENV } from './libs/config';
import { TransformInterceptor } from './libs/interceptor/response.interceptor';

// Patch JSON.stringify to handle BigInt values
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  let swaggerConfig;

  if (NODE_ENV === 'development') {
    swaggerConfig = new DocumentBuilder()
      .addBearerAuth()
      .setTitle('Liflow Backend API')
      .setDescription('API of Liflow Backend with authentication and role-based authorization')
      .setVersion('1.0')
      .addServer(`http://localhost:${config.APP_PORT}/api/v1`, 'Development server')
      .build();
  } else if (NODE_ENV === 'production') {
    // Parse and clean APP_HOST to extract only origin (protocol + host + port)
    // Remove any path segments including /api/v1 to avoid duplication
    let baseUrl = config.APP_HOST.trim();
    
    try {
      // Parse URL to extract only origin (protocol + hostname + port)
      const url = new URL(baseUrl);
      baseUrl = `${url.protocol}//${url.host}`;
    } catch (error) {
      // If URL parsing fails, try manual cleanup
      baseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
      // Remove any path segments (everything after the first / after host:port)
      const match = baseUrl.match(/^(https?:\/\/[^/]+)/);
      if (match) {
        baseUrl = match[1];
      }
    }
    
    // Always add /api/v1 to the clean origin
    // baseUrl = `${baseUrl}/api/v1`;
    
    swaggerConfig = new DocumentBuilder()
      .addBearerAuth()
      .setTitle('Liflow Backend API')
      .setDescription('API of Liflow Backend with authentication and role-based authorization')
      .setVersion('1.0')
      .addServer(baseUrl, 'Production server')
      .build();
  }

  if (swaggerConfig) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  // setup cors
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Requested-With',
    ],
  });

  app.setGlobalPrefix('/api/v1');

  // setup response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // setup validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(config.APP_PORT, () => {
    console.log(`Listening on Port ${config.APP_PORT}`);
    if (swaggerConfig) {
      console.log(`Swagger documentation available at http://localhost:${config.APP_PORT}/api/v1/docs`);
    }
  });
}

bootstrap();
