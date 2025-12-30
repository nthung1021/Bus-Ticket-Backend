import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Operator } from '../entities/operator.entity';
import { Bus } from '../entities/bus.entity';
import { Route } from '../entities/route.entity';
import { RoutePoint } from '../entities/route-point.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { Booking } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Feedback } from '../entities/feedback.entity';
import { SeatStatus } from '../entities/seat-status.entity';
import { Payment } from '../entities/payment.entity';
import { Notification } from '../entities/notification.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SeatLayout } from '../entities/seat-layout.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { BookingModificationHistory } from '../entities/booking-modification-history.entity';

/**
 * Test database configuration
 * Uses separate environment variables for test database connection
 * Always connects to localhost for testing
 */
export const testDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  
  // Test database connection - always use localhost
  host: configService.get<string>('TEST_DB_HOST'),
  port: configService.get<number>('TEST_DB_PORT'),
  username: configService.get<string>('TEST_DB_USERNAME'),
  password: configService.get<string>('TEST_DB_PASSWORD'),
  database: configService.get<string>('TEST_DB_NAME'),
  
  // All entities
  entities: [
    User,
    Operator,
    Bus,
    SeatLayout,
    Route,
    RoutePoint,
    Trip,
    Seat,
    Booking,
    PassengerDetail,
    PaymentMethod,
    Feedback,
    SeatStatus,
    Payment,
    Notification,
    AuditLog,
    RefreshToken,
    BookingModificationHistory,
  ],
  
  // Enable synchronization for tests (creates tables automatically)
  synchronize: true,
  
  // Enable logging for debugging tests
  logging: false,
  
  // Simplified pool configuration for tests
  extra: {
    max: 10,
    min: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    validateConnection: true,
    validationQuery: 'SELECT 1',
    // No SSL for localhost testing
    ssl: false,
  },
});

