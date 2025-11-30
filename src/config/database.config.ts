import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Operator } from '../entities/operator.entity';
import { Bus } from '../entities/bus.entity';
import { Route } from '../entities/route.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { Booking } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { PaymentMethod } from '../entities/payment-method.entity';
import { Feedback } from '../entities/feedback.entity';
import { SeatStatus } from '../entities/seat-status.entity';
import { Payment } from '../entities/payment.entity';
import { Notification } from '../entities/notification.entity';
import { AuditLog } from 'src/entities/audit-log.entity';
import { RefreshToken } from '../entities/refresh-token.entity';

export const databaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USERNAME', 'postgres'),
  password: configService.get<string>('DB_PASSWORD', 'postgres'),
  database: configService.get<string>('DB_NAME', 'bus_booking'),
  entities: [
    User,
    Operator,
    Bus,
    Route,
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
  ],
  synchronize:
    configService.get<string>('NODE_ENV', 'development') !== 'production',
  logging:
    configService.get<string>('NODE_ENV', 'development') === 'development',
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  extra: {
      ssl: {
          sslmode: "require",
          channel_binding: "require",
          rejectUnauthorized: false, 
      },
  },
});
