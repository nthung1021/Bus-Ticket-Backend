import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatStatusGateway } from './seat-status.gateway';
import { BookingGateway } from './booking.gateway';
import { SeatStatus } from '../entities/seat-status.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([SeatStatus])],
  providers: [SeatStatusGateway, BookingGateway],
  exports: [SeatStatusGateway, BookingGateway],
})
export class GatewaysModule {
  constructor(
    private readonly seatStatusGateway: SeatStatusGateway,
    private readonly bookingGateway: BookingGateway,
  ) {
    // Start the lock cleanup process
    this.seatStatusGateway.startLockCleanup();
  }
}
