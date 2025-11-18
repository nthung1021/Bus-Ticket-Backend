import { TypeOrmModuleOptions } from '@nestjs/typeorm';
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

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'bus_booking',
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
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  cli: {
    migrationsDir: 'src/migrations',
  },
} as TypeOrmModuleOptions;
