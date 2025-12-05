import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { SeatStatus, SeatState } from '../entities/seat-status.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(PassengerDetail)
    private passengerDetailRepository: Repository<PassengerDetail>,
    @InjectRepository(SeatStatus)
    private seatStatusRepository: Repository<SeatStatus>,
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(Seat)
    private seatRepository: Repository<Seat>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  async createBooking(userId: string, createBookingDto: CreateBookingDto): Promise<BookingResponseDto> {
    const { tripId, seats, passengers, totalPrice } = createBookingDto;

    // Start transaction
    return await this.dataSource.transaction(async manager => {
      // 1. Validate trip exists
      const trip = await manager.findOne(Trip, { where: { id: tripId } });
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      // 2. Validate seat count matches passenger count
      if (seats.length !== passengers.length) {
        throw new BadRequestException('Number of seats must match number of passengers');
      }

      // 3. Validate seat codes match between seats and passengers
      const seatCodes = seats.map(seat => seat.code).sort();
      const passengerSeatCodes = passengers.map(passenger => passenger.seatCode).sort();
      if (JSON.stringify(seatCodes) !== JSON.stringify(passengerSeatCodes)) {
        throw new BadRequestException('Seat codes in seats and passengers must match');
      }

      // 4. Find seat IDs and validate they exist on the bus
      const seatIds: string[] = [];
      for (const seatDto of seats) {
        const seat = await manager.findOne(Seat, { 
          where: { 
            seatCode: seatDto.code,
            busId: trip.busId
          }
        });
        
        if (!seat) {
          throw new BadRequestException(`Seat ${seatDto.code} not found on this bus`);
        }
        seatIds.push(seat.id);
      }

      // 5. Check seat availability
      const seatStatuses = await manager.find(SeatStatus, {
        where: seatIds.map(seatId => ({
          tripId,
          seatId,
        })),
      });

      // Check if any seats are already booked or locked
      const unavailableSeats = seatStatuses.filter(
        status => status.state === SeatState.BOOKED || status.state === SeatState.LOCKED
      );

      if (unavailableSeats.length > 0) {
        const unavailableCodes = await Promise.all(
          unavailableSeats.map(async (status) => {
            const seat = await manager.findOne(Seat, { where: { id: status.seatId } });
            return seat?.seatCode || status.seatId;
          })
        );
        throw new ConflictException(`Seats ${unavailableCodes.join(', ')} are no longer available`);
      }

      // 6. Create booking
      const booking = manager.create(Booking, {
        userId,
        tripId,
        totalAmount: totalPrice,
        status: BookingStatus.PENDING,
      });

      const savedBooking = await manager.save(booking);

      // 7. Create passenger details
      const passengerDetails = passengers.map(passenger => 
        manager.create(PassengerDetail, {
          bookingId: savedBooking.id,
          fullName: passenger.fullName,
          documentId: passenger.documentId,
          seatCode: passenger.seatCode,
        })
      );

      const savedPassengers = await manager.save(passengerDetails);

      // 8. Update/Create seat status to BOOKED
      for (let i = 0; i < seatIds.length; i++) {
        const existingStatus = seatStatuses.find(status => status.seatId === seatIds[i]);
        
        if (existingStatus) {
          // Update existing status
          await manager.update(SeatStatus, existingStatus.id, {
            bookingId: savedBooking.id,
            state: SeatState.BOOKED,
          });
        } else {
          // Create new status
          const newStatus = manager.create(SeatStatus, {
            tripId,
            seatId: seatIds[i],
            bookingId: savedBooking.id,
            state: SeatState.BOOKED,
          });
          await manager.save(newStatus);
        }
      }

      // 9. Calculate expiration time (15 minutes for PENDING bookings)
      const expirationTimestamp = new Date();
      expirationTimestamp.setMinutes(expirationTimestamp.getMinutes() + 15);

      // 10. Prepare response
      return {
        id: savedBooking.id,
        tripId: savedBooking.tripId,
        totalAmount: savedBooking.totalAmount,
        status: savedBooking.status,
        bookedAt: savedBooking.bookedAt,
        expirationTimestamp,
        passengers: savedPassengers.map(passenger => ({
          id: passenger.id,
          fullName: passenger.fullName,
          documentId: passenger.documentId,
          seatCode: passenger.seatCode,
        })),
        seats: seatIds.map((seatId, index) => ({
          seatId,
          seatCode: seats[index].code,
          status: SeatState.BOOKED,
        })),
      };
    });
  }

  async findBookingById(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['user', 'trip', 'passengerDetails', 'seatStatuses'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  async findBookingsByUser(userId: string): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { userId },
      relations: ['trip', 'passengerDetails', 'seatStatuses'],
      order: { bookedAt: 'DESC' },
    });
  }

  async confirmPayment(bookingId: string, paymentData?: any): Promise<BookingResponseDto> {
    return await this.dataSource.transaction(async manager => {
      // 1. Find booking
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['passengerDetails', 'seatStatuses'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // 2. Validate booking status
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          `Cannot confirm payment for booking with status: ${booking.status}`,
        );
      }

      // 3. Check if booking has expired (optional business rule)
      const expirationTime = new Date(booking.bookedAt);
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
      
      if (new Date() > expirationTime) {
        // Auto-cancel expired booking
        await this.cancelBooking(bookingId, 'Booking expired');
        throw new BadRequestException('Booking has expired and been cancelled');
      }

      // 4. Update booking status to PAID
      await manager.update(Booking, bookingId, {
        status: BookingStatus.PAID,
      });

      // 5. Get updated booking
      const updatedBooking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['passengerDetails', 'seatStatuses'],
      });

      if (!updatedBooking) {
        throw new NotFoundException('Updated booking not found');
      }

      // 6. Prepare response
      const seatStatuses = updatedBooking.seatStatuses || [];
      
      return {
        id: updatedBooking.id,
        tripId: updatedBooking.tripId,
        totalAmount: updatedBooking.totalAmount,
        status: updatedBooking.status,
        bookedAt: updatedBooking.bookedAt,
        expirationTimestamp: null, // No expiration for PAID bookings
        passengers: updatedBooking.passengerDetails.map(passenger => ({
          id: passenger.id,
          fullName: passenger.fullName,
          documentId: passenger.documentId,
          seatCode: passenger.seatCode,
        })),
        seats: seatStatuses.map(status => ({
          seatId: status.seatId,
          seatCode: '', // Will be populated if needed
          status: status.state,
        })),
      };
    });
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return await this.dataSource.transaction(async manager => {
      // 1. Find booking
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['seatStatuses'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // 2. Validate booking status
      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      if (booking.status === BookingStatus.PAID) {
        throw new BadRequestException(
          'Cannot cancel a paid booking. Please contact customer service for refund.',
        );
      }

      // 3. Update booking status to CANCELLED
      await manager.update(Booking, bookingId, {
        status: BookingStatus.CANCELLED,
      });

      // 4. Release seats - update seat statuses back to AVAILABLE
      const seatStatuses = booking.seatStatuses || [];
      for (const seatStatus of seatStatuses) {
        await manager.update(SeatStatus, seatStatus.id, {
          bookingId: null,
          state: SeatState.AVAILABLE,
        });
      }

      return {
        success: true,
        message: reason 
          ? `Booking cancelled: ${reason}`
          : 'Booking cancelled successfully',
      };
    });
  }

  async expireBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    return await this.dataSource.transaction(async manager => {
      // 1. Find booking
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['seatStatuses'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // 2. Only expire PENDING bookings
      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException(
          `Cannot expire booking with status: ${booking.status}`,
        );
      }

      // 3. Update booking status to EXPIRED
      await manager.update(Booking, bookingId, {
        status: BookingStatus.EXPIRED,
      });

      // 4. Release seats
      const seatStatuses = booking.seatStatuses || [];
      for (const seatStatus of seatStatuses) {
        await manager.update(SeatStatus, seatStatus.id, {
          bookingId: null,
          state: SeatState.AVAILABLE,
        });
      }

      return {
        success: true,
        message: 'Booking expired and seats released',
      };
    });
  }

  async getBookingsByStatus(status: BookingStatus): Promise<Booking[]> {
    return await this.bookingRepository.find({
      where: { status },
      relations: ['user', 'trip', 'passengerDetails', 'seatStatuses'],
      order: { bookedAt: 'DESC' },
    });
  }

  async findExpiredBookings(): Promise<Booking[]> {
    // Find PENDING bookings older than 15 minutes
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    return await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.status = :status', { status: BookingStatus.PENDING })
      .andWhere('booking.bookedAt < :expiryTime', { expiryTime: fifteenMinutesAgo })
      .getMany();
  }

  private async createAuditLog(
    action: string,
    details?: string,
    actorId?: string,
    targetUserId?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        action,
        details,
        actorId,
        targetUserId,
        metadata,
      });
      await this.auditLogRepository.save(auditLog);
      this.logger.log(`Audit logged: ${action}`);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
    }
  }

  async processExpiredBookings(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    let processed = 0;

    try {
      this.logger.log('Starting expired bookings cleanup...');
      
      const expiredBookings = await this.findExpiredBookings();
      
      if (expiredBookings.length === 0) {
        this.logger.log('No expired bookings found');
        return { processed: 0, errors: [] };
      }

      this.logger.log(`Found ${expiredBookings.length} expired bookings`);

      for (const booking of expiredBookings) {
        try {
          await this.expireBooking(booking.id);
          processed++;
          
          // Log audit trail
          await this.createAuditLog(
            'AUTO_EXPIRED_BOOKING',
            `Booking ${booking.id} automatically expired due to timeout`,
            undefined, // no actor for automated process
            undefined, // no target user
            {
              bookingId: booking.id,
              previousStatus: BookingStatus.PENDING,
              newStatus: BookingStatus.EXPIRED,
              expiredAt: new Date(),
            },
          );
          
          this.logger.log(`Auto-expired booking ${booking.id}`);
        } catch (error) {
          const errorMsg = `Failed to expire booking ${booking.id}: ${error.message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
        }
      }

      this.logger.log(`Expired bookings cleanup completed. Processed: ${processed}, Errors: ${errors.length}`);
      
      return { processed, errors };
    } catch (error) {
      const errorMsg = `Error during expired bookings cleanup: ${error.message}`;
      this.logger.error(errorMsg);
      return { processed, errors: [errorMsg] };
    }
  }
}