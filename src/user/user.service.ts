import { Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingService } from '../booking/booking.service';
import { BookingStatus } from '../entities/booking.entity';
import { User } from '../entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user signed up with Google, Facebook, or Phone
    if (user.googleId) {
      throw new BadRequestException({
        success: false,
        message: 'Password change is not available for Google accounts. Your account is linked to Google authentication.',
      });
    }

    if (user.facebookId) {
      throw new BadRequestException({
        success: false,
        message: 'Password change is not available for Facebook accounts. Your account is linked to Facebook authentication.',
      });
    }

    // Check if user has a password (phone number users might not have one)
    if (!user.passwordHash) {
      throw new BadRequestException({
        success: false,
        message: 'Password change is not available for your account. You signed up using phone number authentication.',
      });
    }

    // Validate that new password and confirm password match
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new BadRequestException({
        success: false,
        message: 'New password and confirm password do not match',
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Check if new password is the same as current password
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException({
        success: false,
        message: 'New password must be different from your current password',
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, saltRounds);

    // Update password
    user.passwordHash = hashedPassword;
    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
