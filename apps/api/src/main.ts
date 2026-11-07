import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API version prefix
  app.setGlobalPrefix('api/v1');

  // Enable CORS
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server, curl, Next.js proxy, or matching origins
      if (!origin || !corsOrigin || corsOrigin === '*' || origin === corsOrigin) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
  });

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('PROORGA Banking Workflow Platform API')
    .setDescription(
      'Enterprise banking workflow engine for temporary transfer limit increases with multi-tier approvals & controlled AI agent tools.'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.API_PORT || 4001;
  await app.listen(port);

  logger.log(`🚀 PROORGA API server running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
