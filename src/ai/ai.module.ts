import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { TripsModule } from '../trips/trips.module';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [TripsModule, BookingModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
