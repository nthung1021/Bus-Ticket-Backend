import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Put,
  Delete,
  Query,
  Res,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { BookingService } from './booking.service';
import { BookingSchedulerService } from './booking-scheduler.service';
import { BookingExpirationScheduler } from './booking-expiration-scheduler.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { GetGuestBookingDto } from './dto/get-guest-booking.dto';
import { 
  BookingModificationDto, 
  CheckModificationPermissionsDto, 
  BookingModificationResponseDto 
} from './dto/booking-modification.dto';
import { 
  ModifyPassengerDetailsDto,
  ModifyPassengerDetailsResponseDto 
} from './dto/modify-passenger-details.dto';
import { 
  ChangeSeatsDto,
  ChangeSeatsResponseDto 
} from './dto/change-seats.dto';

// Inline DTO to avoid import issues
interface PassengerUpdateDto {
  id: string;
  fullName: string;
  documentId?: string;
  seatCode: string;
}

interface UpdatePassengerDto {
  passengers: PassengerUpdateDto[];
}

@Controller('bookings')
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly bookingSchedulerService: BookingSchedulerService,
    private readonly bookingExpirationScheduler: BookingExpirationScheduler,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
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
      const userId = req.user?.userId ?? null;
      const booking = await this.bookingService.createBooking(
        userId,
        createBookingDto,
      );

      return {
        success: true,
        message: 'Booking created successfully',
        data: booking,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('guest')
  async getGuestBooking(@Query() query: GetGuestBookingDto) {
    const result = await this.bookingService.findBookingByGuest(query);
    return {
      success: true,
      data: result,
      message: 'guest booking retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getBookingDetails(
    @Param('id') bookingId: string,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: any; // Use any for now to avoid type issues
  }> {
    try {
      const booking = await this.bookingService.findBookingById(bookingId);

      // Transform booking for response
      const responseData = {
        id: booking.id,
        userId: booking.userId,
        tripId: booking.tripId,
        reference: booking.bookingReference,
        totalAmount: booking.totalAmount,
        status: booking.status,
        bookedAt: booking.bookedAt,
        cancelledAt: booking.cancelledAt,
        trip: booking.trip
          ? {
              id: booking.trip.id,
              departureTime: booking.trip.departureTime,
              arrivalTime: booking.trip.arrivalTime,
              basePrice: booking.trip.basePrice,
              status: booking.trip.status,
              route: booking.trip.route
                ? {
                    id: booking.trip.route.id,
                    name: booking.trip.route.name,
                    description: booking.trip.route.description,
                    origin: booking.trip.route.origin,
                    destination: booking.trip.route.destination,
                    distanceKm: booking.trip.route.distanceKm,
                    estimatedMinutes: booking.trip.route.estimatedMinutes,
                  }
                : null,
              bus: booking.trip.bus
                ? {
                    id: booking.trip.bus.id,
                    plateNumber: booking.trip.bus.plateNumber,
                    model: booking.trip.bus.model,
                    seatCapacity: booking.trip.bus.seatCapacity,
                  }
                : null,
            }
          : null,
        passengers:
          booking.passengerDetails?.map((p) => ({
            id: p.id,
            fullName: p.fullName,
            documentId: p.documentId || null,
            seatCode: p.seatCode,
          })) || [],
        seats:
          booking.seatStatuses?.map((s) => ({
            id: s.id,
            seatId: s.seatId,
            state: s.state,
            seat: s.seat
              ? {
                  id: s.seat.id,
                  seatCode: s.seat.seatCode,
                  seatType: s.seat.seatType,
                  isActive: s.seat.isActive,
                }
              : null,
          })) || [],
        expirationTimestamp:
          booking.status === 'pending'
            ? new Date(booking.bookedAt.getTime() + 15 * 60 * 1000)
            : null,
        pickupPointId: booking.pickupPointId || null,
        dropoffPointId: booking.dropoffPointId || null,
        pickupPoint: booking.pickupPoint ? { id: booking.pickupPoint.id, name: booking.pickupPoint.name, latitude: booking.pickupPoint.latitude, longitude: booking.pickupPoint.longitude } : null,
        dropoffPoint: booking.dropoffPoint ? { id: booking.dropoffPoint.id, name: booking.dropoffPoint.name, latitude: booking.dropoffPoint.latitude, longitude: booking.dropoffPoint.longitude } : null,
      };

      return {
        success: true,
        message: 'Booking details retrieved successfully',
        data: responseData,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserBookings(@Request() req: any) {
    const userId = req.user.userId;
    const bookings = await this.bookingService.findBookingsByUser(userId);
    return {
      success: true,
      message: 'User bookings retrieved successfully',
      data: bookings,
    };
  }

  @Put(':id/update')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updatePassengerInfo(
    @Param('id') bookingId: string,
    @Body() updatePassengerDto: UpdatePassengerDto,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    try {
      const updatedBooking = await this.bookingService.updatePassengerInfo(
        bookingId,
        updatePassengerDto,
        req.user.userId,
      );

      return {
        success: true,
        message: 'Passenger information updated successfully',
        data: updatedBooking,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelBookingByUser(
    @Param('id') bookingId: string,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const result = await this.bookingService.cancelBookingByUser(
        bookingId,
        req.user.userId,
      );

      return result;
    } catch (error) {
      throw error;
    }
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
      const booking = await this.bookingService.confirmPayment(
        bookingId,
        paymentData,
      );

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
      const result = await this.bookingService.cancelBooking(
        bookingId,
        body.reason,
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  @Put(':id/expire')
  @HttpCode(HttpStatus.OK)
  async expireBooking(@Param('id') bookingId: string): Promise<{
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

  @Get(':bookingId/eticket')
  async downloadEticket(
    @Param('bookingId') bookingId: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } =
      await this.bookingService.generateEticketFile(bookingId);

    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }

  @Post(':bookingId/eticket/email')
  @HttpCode(HttpStatus.OK)
  async sendEticketEmail(
    @Param('bookingId') bookingId: string,
    @Body() body: { email?: string } = {},
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.bookingService.sendEticketEmail(
        bookingId,
        body.email,
      );

      return {
        success: result.success,
        message: 'e-ticket email sent successfully',
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to send e-ticket email for booking ${bookingId}`,
        error?.stack || error,
      );

      // If email service is not configured or send failed due to missing transporter,
      // return a friendly non-500 response so frontend can proceed gracefully.
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('no email service') || message.includes('no email service configuration')) {
        return {
          success: false,
          message: 'Email service not configured. E-ticket could not be sent.',
        };
      }

      // For other errors, rethrow to be handled by global exception filter
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
      sessionId: string;
      processingTimeMs: number;
    };
  }> {
    try {
      const result = await this.bookingExpirationScheduler.triggerManualExpiration();
      
      return {
        success: true,
        message: `Cleanup completed. Processed ${result.processed} expired bookings in ${result.processingTimeMs}ms.`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `Cleanup failed: ${error.message}`,
        data: {
          processed: 0,
          errors: [error.message],
          sessionId: `error-${Date.now()}`,
          processingTimeMs: 0,
        },
      };
    }
  }

  @Get(':id/modification-permissions')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkModificationPermissions(
    @Param('id') bookingId: string,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: CheckModificationPermissionsDto;
  }> {
    try {
      const userId = req.user?.userId;
      const permissions = await this.bookingService.checkModificationPermissions(bookingId, userId);
      
      return {
        success: true,
        message: 'Modification permissions retrieved successfully',
        data: permissions,
      };
    } catch (error) {
      throw error;
    }
  }

  @Put(':id/modify')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async modifyBooking(
    @Param('id') bookingId: string,
    @Body() modificationDto: BookingModificationDto,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: BookingModificationResponseDto;
  }> {
    try {
      const userId = req.user?.userId;
      const result = await this.bookingService.modifyBooking(bookingId, modificationDto, userId);
      
      return {
        success: true,
        message: 'Booking modified successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/modification-history')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getModificationHistory(
    @Param('id') bookingId: string,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    message: string;
    data: any[];
  }> {
    try {
      const userId = req.user?.userId;
      const history = await this.bookingService.getBookingModificationHistory(bookingId, userId);
      
      return {
        success: true,
        message: 'Modification history retrieved successfully',
        data: history,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * A1.2 - Modify Passenger Details
   * PUT /api/bookings/:id/passengers
   */
  @Put(':id/passengers')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async modifyPassengerDetails(
    @Param('id') bookingId: string,
    @Body() modifyPassengerDto: ModifyPassengerDetailsDto,
    @Request() req: any,
  ): Promise<ModifyPassengerDetailsResponseDto> {
    try {
      const userId = req.user?.userId;
      const result = await this.bookingService.modifyPassengerDetails(
        bookingId,
        modifyPassengerDto,
        userId,
      );
      
      return {
        success: true,
        message: 'Passenger details modified successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * A1.3 - Change Seats
   * PUT /api/bookings/:id/seats
   */
  @Put(':id/seats')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changeSeats(
    @Param('id') bookingId: string,
    @Body() changeSeatsDto: ChangeSeatsDto,
    @Request() req: any,
  ): Promise<ChangeSeatsResponseDto> {
    try {
      const userId = req.user?.userId;
      const result = await this.bookingService.changeSeats(
        bookingId,
        changeSeatsDto,
        userId,
      );
      
      return {
        success: true,
        message: 'Seats changed successfully',
        data: result,
      };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id/remaining-time')
  async getBookingRemainingTime(
    @Param('id') bookingId: string,
  ): Promise<{
    success: boolean;
    data: { remainingMinutes: number | null; isExpired: boolean };
  }> {
    try {
      const remainingMinutes = await this.bookingService.getBookingRemainingTime(bookingId);
      const isExpired = await this.bookingService.isBookingExpired(bookingId);
      
      return {
        success: true,
        data: {
          remainingMinutes,
          isExpired,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('admin/expiration/trigger')
  @HttpCode(HttpStatus.OK)
  async triggerManualExpiration(): Promise<{
    success: boolean;
    message: string;
    data: { expiredCount: number; bookings: string[] };
  }> {
    try {
      const result = await this.bookingExpirationScheduler.triggerManualExpiration();
      
      return {
        success: true,
        message: `Manual expiration completed. Processed ${result.processed} bookings in ${result.processingTimeMs}ms`,
        data: {
          expiredCount: result.processed,
          bookings: [`${result.processed} bookings processed`],
        },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('admin/expiration/status')
  async getExpirationSchedulerStatus(): Promise<{
    success: boolean;
    data: { isRunning: boolean; nextRun: string | null };
  }> {
    try {
      const status = this.bookingExpirationScheduler.getCronJobStatus();
      
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('admin/expiration/restart')
  @HttpCode(HttpStatus.OK)
  async restartExpirationScheduler(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.bookingExpirationScheduler.restartCronJob();
      
      return {
        success: true,
        message: 'Booking expiration scheduler restarted successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}
