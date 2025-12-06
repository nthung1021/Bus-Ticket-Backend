import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatLayoutService } from './seat-layout.service';
import { SeatLayoutController } from './seat-layout.controller';
import { SeatLayout } from '../entities/seat-layout.entity';
import { Bus } from '../entities/bus.entity';
import { Seat } from '../entities/seat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SeatLayout, Bus, Seat])],
  controllers: [SeatLayoutController],
  providers: [SeatLayoutService],
  exports: [SeatLayoutService],
})
export class SeatLayoutModule {}
