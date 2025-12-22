import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { TripsModule } from '../trips/trips.module';
import { BookingModule } from '../booking/booking.module';
import { SeatStatusModule } from '../seat-status/seat-status.module';
import { Message } from '../chat/entities/message.entity';
import { Seat } from '../entities/seat.entity';

@Module({
  imports: [TripsModule, BookingModule, SeatStatusModule, TypeOrmModule.forFeature([Message, Seat])],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
