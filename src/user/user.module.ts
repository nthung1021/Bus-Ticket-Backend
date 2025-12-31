import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { BookingModule } from '../booking/booking.module';
import { UserService } from './user.service';

@Module({
  imports: [BookingModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}