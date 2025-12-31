import { Injectable } from '@nestjs/common';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../entities/booking.entity';

@Injectable()
export class UserService {
  constructor(private readonly bookingService: BookingService) {}

  async getUserBookings(userId: string, status?: BookingStatus) {
    const bookings = await this.bookingService.findBookingsByUserWithDetails(userId, status);
    
    return {
      success: true,
      message: 'User bookings retrieved successfully',
      data: bookings,
    };
  }
}
