import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  // Completely suppress NestJS framework logs during startup
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  
  // Create a custom logger for application messages only
  const logger = new Logger('Bootstrap');
  
  const configService = app.get(ConfigService);

  // Enable cookie parser
  app.use(cookieParser());

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove non-whitelisted properties
      transform: true, // Automatically transform payloads to DTO instances
      forbidNonWhitelisted: true, // Throw errors for non-whitelisted properties
      transformOptions: {
        enableImplicitConversion: true, // Convert string query/param values to their corresponding types
      },
    }),
  );

  // Enable CORS
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:8000'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  // Re-enable application logging after startup (for runtime logs)
  app.useLogger(['error', 'warn', 'log']);
  
  // Single consolidated startup summary
  logger.log(`🚀 Bus Ticket Backend started successfully`);
  logger.log(`📍 Server: http://localhost:${port}`);
  logger.log(`🌐 Frontend: ${configService.get('FRONTEND_URL', 'http://localhost:8000')}`);
  logger.log(`🔌 Database: Connected to ${configService.get('DB_NAME', 'bus_booking')}`);
}

bootstrap();
