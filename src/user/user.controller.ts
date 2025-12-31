import { Controller, Get, Query, Request, UseGuards, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserService } from './user.service';
import { BookingStatus } from '../entities/booking.entity';

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
}