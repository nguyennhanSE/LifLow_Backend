import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config, NODE_ENV } from './libs/config';
import { TransformInterceptor } from './libs/interceptor/response.interceptor';

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
    swaggerConfig = new DocumentBuilder()
      .addBearerAuth()
      .setTitle('Liflow Backend API')
      .setDescription('API of Liflow Backend with authentication and role-based authorization')
      .setVersion('1.0')
      .addServer(`${config.APP_HOST}/api/v1`, 'Production server')
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
