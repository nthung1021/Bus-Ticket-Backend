import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_NAME', 'bus_booking'),
  synchronize: true, // Enabled for development: auto-create/update schema
  logging: true,
  // include entities located across the project (not only src/entities)
  entities: [
    'src/**/*.entity{.ts,.js}',
    'src/**/entities/*.ts',
    'dist/**/*.entity{.js,.ts}'
  ],
  migrations: [
    'src/migrations/**/*.ts'
  ],
  subscribers: [
    'src/subscribers/**/*.ts'
  ],
  extra: {
    // Force single client (effectively disable pooling) to avoid pool-related behavior
    max: 1,
    min: 0,
    // Make idle connections close immediately
    idleTimeoutMillis: 0,
    // Connection timeout short
    connectionTimeoutMillis: 2000,
    ssl: configService.get('NODE_ENV') === 'production' ? {
      sslmode: "require",
      rejectUnauthorized: false,
    } : configService.get('NODE_ENV') === 'staging' ? {
      sslmode: "require",
      rejectUnauthorized: false,
    } : false,
  },
});