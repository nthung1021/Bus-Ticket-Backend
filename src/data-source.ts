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
  synchronize: false, // Always false for production-like setup
  logging: true,
  entities: [
    'src/entities/**/*.ts'
  ],
  migrations: [
    'src/migrations/**/*.ts'
  ],
  subscribers: [
    'src/subscribers/**/*.ts'
  ],
});