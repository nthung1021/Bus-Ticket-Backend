import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { ScheduleModule } from '@nestjs/schedule';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { BookingSchedulerService } from './booking-scheduler.service';
import { Booking } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { SeatStatus } from '../entities/seat-status.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      PassengerDetail,
      SeatStatus,
      Trip,
      Seat,
    ]),
    // ScheduleModule.forRoot(), // Enable when @nestjs/schedule is installed
  ],
  controllers: [BookingController],
  providers: [BookingService, BookingSchedulerService], // BookingSchedulerService placeholder included
  exports: [BookingService],
})
export class BookingModule {}