import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import { AppModule } from './app.module';

// BigInt IDs from Postgres cannot be JSON-serialised by default
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // =========================================================
  // GLOBAL API PREFIX
  // =========================================================

  app.setGlobalPrefix('api');

  // =========================================================
  // CORS
  // =========================================================

  const frontendOrigins = (
    process.env.FRONTEND_ORIGIN ??
    'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: frontendOrigins,
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],
  });

  // =========================================================
  // GLOBAL VALIDATION
  // =========================================================

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // =========================================================
  // SWAGGER
  // =========================================================

  const config = new DocumentBuilder()
    .setTitle('Teacher Evaluation API')
    .setDescription(
      'API for managing courses, evaluations, and survey responses',
    )
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document =
    SwaggerModule.createDocument(
      app,
      config,
    );

  SwaggerModule.setup(
    'api/docs',
    app,
    document,
  );

  // =========================================================
  // START SERVER
  // =========================================================

  const port =
    process.env.PORT ?? 3000;

  await app.listen(port);
}

bootstrap();