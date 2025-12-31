import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../entities/booking.entity';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

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

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update only the fields that are provided
    if (updateProfileDto.fullName !== undefined) {
      user.name = updateProfileDto.fullName;
    }

    if (updateProfileDto.phone !== undefined) {
      user.phone = updateProfileDto.phone;
    }

    const updatedUser = await this.userRepository.save(user);

    return {
      success: true,
      message: 'Profile updated successfully',
      data: {
        userId: updatedUser.id,
        fullName: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
      }
    };
  }
}
