import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpStatus, HttpCode, Put, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingService } from './booking.service';
import { BookingSchedulerService } from './booking-scheduler.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingSchedulerService: BookingSchedulerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Request() req: any,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: BookingResponseDto;
  }> {
    try {
      const userId = req.user.userId;
      const booking = await this.bookingService.createBooking(userId, createBookingDto);
      
      return {
        success: true,
        message: 'Booking created successfully',
        data: booking,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  async getBooking(@Param('id') id: string) {
    const booking = await this.bookingService.findBookingById(id);
    return {
      success: true,
      message: 'Booking retrieved successfully',
      data: booking,
    };
  }

  @Get()
  async getUserBookings(@Request() req: any) {
    const userId = req.user.userId;
    const bookings = await this.bookingService.findBookingsByUser(userId);
    return {
      success: true,
      message: 'User bookings retrieved successfully',
      data: bookings,
    };
  }

  @Put(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(
    @Param('id') bookingId: string,
    @Body() paymentData?: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: BookingResponseDto;
  }> {
    try {
      const booking = await this.bookingService.confirmPayment(bookingId, paymentData);
      
      return {
        success: true,
        message: 'Payment confirmed successfully',
        data: booking,
      };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelBooking(
    @Param('id') bookingId: string,
    @Body() body: { reason?: string } = {},
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const result = await this.bookingService.cancelBooking(bookingId, body.reason);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Put(':id/expire')
  @HttpCode(HttpStatus.OK)
  async expireBooking(
    @Param('id') bookingId: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const result = await this.bookingService.expireBooking(bookingId);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Admin endpoint - Manual cleanup of expired bookings
  @Post('admin/cleanup-expired')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredBookings(): Promise<{
    success: boolean;
    message: string;
    data: {
      processed: number;
      errors: string[];
    };
  }> {
    try {
      const result = await this.bookingSchedulerService.triggerManualCleanup();
      
      return {
        success: true,
        message: `Cleanup completed. Processed ${result.processed} expired bookings.`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Cleanup failed: ${error.message}`,
        data: {
          processed: 0,
          errors: [error.message],
        },
      };
    }
  }
}