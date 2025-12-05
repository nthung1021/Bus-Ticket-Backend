import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpStatus, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

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
}