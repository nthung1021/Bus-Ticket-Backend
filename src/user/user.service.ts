import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../entities/booking.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly bookingService: BookingService
  ) {}

  async getUserBookings(userId: string, status?: BookingStatus) {
    const bookings = await this.bookingService.findBookingsByUserWithDetails(userId, status);
    
    return {
      success: true,
      message: 'User bookings retrieved successfully',
      data: bookings,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.name,
        role: user.role,
        createdAt: user.createdAt,
      }
    };
  }
}
