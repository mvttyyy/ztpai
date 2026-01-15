import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Cookie parser for refresh tokens
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
  });

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('BeatThat API')
    .setDescription(
      `
## BeatThat - Audio Loops & Samples Platform API

BeatThat is a web application for sharing, previewing, and downloading free audio loops and samples.

### Features:
- **Authentication**: JWT-based auth with refresh tokens
- **Loops Management**: Upload, browse, filter, and download audio loops
- **Social Features**: Ratings, comments, favorites
- **Real-time**: WebSocket notifications and chat
- **Certified Downloads**: Hash-based proof of download origin

### License
All audio content is provided under "free to use / no attribution" license with prohibition of redistribution of raw files "as-is".
    `,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Loops', 'Audio loops management endpoints')
    .addTag('Tags', 'Tags management endpoints')
    .addTag('Ratings', 'Loop ratings endpoints')
    .addTag('Comments', 'Loop comments endpoints')
    .addTag('Favorites', 'User favorites endpoints')
    .addTag('Downloads', 'Download tracking and certificates')
    .addTag('Trending', 'Trending loops endpoints')
    .addTag('Admin', 'Admin panel endpoints')
    .addTag('Chat', 'Real-time chat endpoints')
    .addTag('Notifications', 'User notifications endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  console.log(`🚀 BeatThat API is running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
