import { Controller, Get, Put, Post, Query, Request, Body, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { BookingStatus } from '../entities/booking.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me/bookings')
  @HttpCode(HttpStatus.OK)
  async getUserBookings(
    @Request() req: any,
    @Query('status') status?: BookingStatus,
  ): Promise<{
    success: boolean;
    message: string;
    data: any[];
  }> {
    try {
      const userId = req.user.userId;
      return await this.userService.getUserBookings(userId, status);
    } catch (error) {
      throw error;
    }
  }

  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getProfile(@Request() req: any) {
    try {
      const userId = req.user.userId;
      return await this.userService.getProfile(userId);
    } catch (error) {
      throw error;
    }
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    try {
      const userId = req.user.userId;
      return await this.userService.updateProfile(userId, updateProfileDto);
    } catch (error) {
      throw error;
    }
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    try {
      const userId = req.user.userId;
      return await this.userService.changePassword(userId, changePasswordDto);
    } catch (error) {
      throw error;
    }
  }
}