import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { Bus } from '../entities/bus.entity';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Trip, Route, Bus])],
  controllers: [TripController],
  providers: [TripService],
  exports: [TripService],
})
export class TripModule {}
