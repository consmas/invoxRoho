import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { securityHeadersMiddleware } from './common/security';
import { validateEnvironment } from './config/env.validation';

async function bootstrap() {
  validateEnvironment();
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(securityHeadersMiddleware);
  app.use(json({ limit: process.env.JSON_BODY_LIMIT ?? '1mb' }));
  app.use(urlencoded({ extended: false, limit: process.env.FORM_BODY_LIMIT ?? '256kb' }));
  app.enableCors({
    origin: allowedOrigins(),
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'X-INVOX-Signature',
      'X-Idempotency-Key',
      'X-Request-ID',
    ],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(process.env.APP_PORT ?? 3001);
}
void bootstrap();

function allowedOrigins() {
  return (
    process.env.CORS_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? ['http://localhost:3000']
  );
}
