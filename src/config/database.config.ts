import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Operator } from '../operators/entities/operator.entity';
import { Bus } from '../buses/entities/bus.entity';
import { Route } from '../routes/entities/route.entity';
import { Trip } from '../trips/entities/trip.entity';
import { Seat } from '../seats/entities/seat.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { PassengerDetail } from '../bookings/entities/passenger-detail.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { Feedback } from '../feedbacks/entities/feedback.entity';
import { SeatStatus } from '../trips/entities/seat-status.entity';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT!, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'bus_ticket',
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
  ],
  synchronize: process.env.NODE_ENV !== 'production', // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  cli: {
    migrationsDir: 'src/database/migrations',
  },
};
