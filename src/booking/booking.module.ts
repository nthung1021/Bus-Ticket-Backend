
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingSchedulerService } from './booking-scheduler.service';
import { Booking } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { SeatStatus } from '../entities/seat-status.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { EmailService } from './email.service';
import { PayosModule } from '../payos/payos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      PassengerDetail,
      SeatStatus,
      Trip,
      Seat,
      AuditLog,
    ]),
    ScheduleModule.forRoot(),
    PayosModule,
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingSchedulerService, EmailService],
  exports: [BookingService, BookingSchedulerService, EmailService],
})
export class BookingModule {}