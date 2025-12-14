import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from 'src/auth/auth.module';
import { User } from '../entities/user.entity';
import { AuditLog } from 'src/entities/audit-log.entity';
import { Booking } from '../entities/booking.entity';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([User, AuditLog, Booking, Trip, Route])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
