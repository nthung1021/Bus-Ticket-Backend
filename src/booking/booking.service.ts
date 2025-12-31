import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger, Inject, forwardRef } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PayosService } from '../payos/payos.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { SeatStatus, SeatState } from '../entities/seat-status.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { BookingModificationHistory, ModificationType } from '../entities/booking-modification-history.entity';
import { SeatLayout } from '../entities/seat-layout.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { GetGuestBookingDto } from './dto/get-guest-booking.dto';
import { 
  BookingModificationDto, 
  CheckModificationPermissionsDto,
  BookingModificationResponseDto 
} from './dto/booking-modification.dto';
import { BookingModificationPermissionService } from './booking-modification-permission.service';
import { EmailService } from './email.service';
import { BOOKING_EXPIRATION_MINUTES } from '../constants/booking.constants';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { getBookingConfirmationTemplate } from './email.templates';
import { ConfigService } from '@nestjs/config';
import { normalizeSeatCode, isSeatCodeValid } from '../common/seat-utils';

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
    @InjectRepository(BookingModificationHistory)
    private modificationHistoryRepository: Repository<BookingModificationHistory>,
    @InjectRepository(SeatLayout)
    private seatLayoutRepository: Repository<SeatLayout>,
    private dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly modificationPermissionService: BookingModificationPermissionService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    private readonly payosService: PayosService,
    private readonly configService: ConfigService,
  ) { }

  private async generateBookingReference(): Promise<string> {
    const prefix = 'BK';

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePart = `${year}${month}${day}`;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    const randomPart = () =>
      Array.from({ length: 6 })
        .map(
          () => chars[Math.floor(Math.random() * chars.length)],
        )
        .join('');

    // Try a few times to avoid collision; DB unique constraint will also protect
    for (let i = 0; i < 10; i++) {
      const code = `${prefix}${datePart}-${randomPart()}`;

      const existing = await this.bookingRepository.findOne({
        where: { bookingReference: code },
      });

      if (!existing) {
        return code;
      }
    }

    // Fallback: still return something; extremely unlikely to collide 10 times
    return `${prefix}${datePart}-${randomPart()}`;
  }

  /**
   * Calculate total price for a booking.
   * Pricing model:
   *  - `tripBasePrice` (if provided) is treated as the base fare per seat.
   *  - Each `seat.price` is treated as a supplement (can be 0).
   *  - subtotal = sum((tripBasePrice || 0) + (seat.price || 0)) for each seat
   *  - serviceFee: flat fee applied once
   *  - taxPercent: percentage applied to subtotal (before serviceFee)
   *  - discount: flat discount applied at the end
   */
  async calculateTotalPrice(
    seats: Array<{ price: number }>,
    options?: { tripBasePrice?: number; serviceFee?: number; taxPercent?: number; discount?: number },
  ): Promise<number> {
    const tripBase = options?.tripBasePrice ?? 0;

    const subtotal = (seats || []).reduce((s, seat) => {
      const seatPrice = seat?.price ?? 0;
      return s + seatPrice;
    }, 0);

    const serviceFee = options?.serviceFee ?? 0;
    const tax = ((options?.taxPercent ?? 0) / 100) * subtotal;
    const discount = options?.discount ?? 0;

    const total = subtotal + tripBase + serviceFee + tax - discount;

    // Ensure non-negative and round to nearest integer (VND)
    return Math.max(0, Math.round(total));
  }

  async createBooking(userId: string | null, createBookingDto: CreateBookingDto): Promise<BookingResponseDto> {
    const { tripId, seats, passengers, totalPrice, isGuestCheckout, contactEmail, contactPhone } = createBookingDto;

    // Start transaction
    const result = await this.dataSource.transaction(async manager => {
      // 1. Validate trip exists
      const trip = await manager.findOne(Trip, { where: { id: tripId } });
      if (!trip) {
        throw new NotFoundException('Trip not found');
      }

      // 2. Validate seat count matches passenger count
      if (seats.length !== passengers.length) {
        throw new BadRequestException('Number of seats must match number of passengers');
      }

      // 3. Validate seat codes match between seats and passengers (normalize both formats)
      const seatCodes = seats.map(seat => normalizeSeatCode(seat.code)).sort();
      const passengerSeatCodes = passengers.map(passenger => normalizeSeatCode(passenger.seatCode)).sort();
      if (JSON.stringify(seatCodes) !== JSON.stringify(passengerSeatCodes)) {
        throw new BadRequestException('Seat codes in seats and passengers must match');
      }

      // 4. Find seat IDs and validate they exist on the bus
      const seatIds: string[] = [];
      for (const seatDto of seats) {
        const normalizedCode = normalizeSeatCode(seatDto.code);
        const seat = await manager.findOne(Seat, {
          where: {
            seatCode: normalizedCode,
            busId: trip.busId
          }
        });

        if (!seat) {
          throw new BadRequestException(`Seat ${normalizedCode} not found on this bus`);
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
        status => status.state === SeatState.BOOKED
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

      // 6. Create booking with PAID status since payment is bypassed
      const bookingReference = await this.generateBookingReference();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + BOOKING_EXPIRATION_MINUTES * 60 * 1000);

      // If client did not provide `totalPrice`, calculate it using trip.basePrice + seat supplements
      let finalTotal = totalPrice;
      if (finalTotal == null) {
        finalTotal = await this.calculateTotalPrice(seats, { tripBasePrice: trip.basePrice });
      }

      const bookingData: any = {
        tripId,
        bookingReference,
        totalAmount: finalTotal,
        status: BookingStatus.PENDING,
        expiresAt: expiresAt, // Set expiration for pending bookings
      };
      // Notification for auto-paid booking
      if (bookingData.status === BookingStatus.PAID && (userId || !isGuestCheckout)) {
         // We'll handle notification after save to get ID, or here if we have enough info. 
         // Actually better to do it after save to ensure FK constraints if any, though userId is available.
      }

      if (!isGuestCheckout && userId) {
        bookingData.userId = userId;
      } else {
        bookingData.contactEmail = contactEmail;
        bookingData.contactPhone = contactPhone;
      }

      const booking = manager.create(Booking, bookingData);

      const savedBooking = await manager.save(booking);

      // 7. Create passenger details (store null when no document provided)
      const passengerDetails = passengers.map(passenger =>
        manager.create(PassengerDetail, {
          bookingId: savedBooking.id,
          fullName: passenger.fullName,
          documentId: passenger.documentId ?? undefined,
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

      // 9. Set expiration time: pending bookings expire after 15 minutes
      let expirationTimestamp: Date | null = null;
      if (savedBooking.status === BookingStatus.PENDING && savedBooking.bookedAt) {
        expirationTimestamp = new Date(savedBooking.bookedAt.getTime() + 15 * 60 * 1000);
      }

      // paymentUrl is generated after transaction commit to avoid FK issues
      let paymentUrl: string | null = null;

      // Send notification for auto-paid booking
      if (savedBooking.status === BookingStatus.PAID && userId) {
        try {
          await this.notificationsService.createInAppNotification(
            userId,
            'Booking Successful',
            `Your booking ${savedBooking.bookingReference} has been successfully confirmed. We have sent an email to your email address. Please check your email for the e-ticket.`,
            { bookingId: savedBooking.id, reference: savedBooking.bookingReference },
            savedBooking.id
          );
        } catch (error) {
          this.logger.error(`Failed to create in-app notification for booking ${savedBooking.id}`, error.stack);
          // Suppress error so booking doesn't fail
        }
      }

      // 10. Prepare response
      return {
        id: savedBooking.id,
        bookingReference: savedBooking.bookingReference,
        tripId: savedBooking.tripId,
        totalAmount: savedBooking.totalAmount,
        status: savedBooking.status,
        bookedAt: savedBooking.bookedAt,
        expirationTimestamp,
        paymentUrl,
        passengers: savedPassengers.map(passenger => ({
          id: passenger.id,
          fullName: passenger.fullName,
          documentId: passenger.documentId || null,
          seatCode: passenger.seatCode,
        })),
        seats: seatIds.map((seatId, index) => ({
          seatId,
          seatCode: seats[index].code,
          status: SeatState.BOOKED,
        })),
      };
    });

    // After transaction commit, create payment link if booking is pending
    try {
      if (result.status === BookingStatus.PENDING) {
        // 1. Lấy giá trị từ ConfigService (An toàn hơn process.env)
        const forceTest = this.configService.get<string>('FORCE_TEST_PAYMENT');
        
        // 2. Logic so sánh mạnh mẽ (bất chấp hoa thường, khoảng trắng)
        const isTestMode = forceTest?.trim().toLowerCase() === 'true';

        // 3. LOG DEBUG QUAN TRỌNG: In ra để xem server thực sự nhận được gì
        this.logger.log(`[PAYMENT DEBUG] Env: ${forceTest} | IsTest: ${isTestMode} | RealPrice: ${result.totalAmount}`);

        // 4. LƯU Ý: PayOS yêu cầu tối thiểu 2000 VND. Nếu để 1 VND có thể bị lỗi.
        const paymentAmount = isTestMode ? 2000 : result.totalAmount;

        const frontendBase = this.configService.get('FRONTEND_URL') || 'http://localhost:8000';
        const returnUrl = `${frontendBase.replace(/\/$/, '')}/payment/success?bookingId=${result.id}`;
        const cancelUrl = `${frontendBase.replace(/\/$/, '')}/payment/cancel?bookingId=${result.id}`;

        const payRes = await this.payosService.createPaymentLink({
          amount: paymentAmount, // Truyền số 2000 vào đây
          bookingId: result.id,
          description: `Booking ${result.bookingReference}`, // Thêm ref để dễ tra soát
          returnUrl,
          cancelUrl,
        });
        
        (result as any).paymentUrl = payRes?.checkoutUrl || null;
      }
    } catch (err) {
      this.logger.error('Failed to generate payment URL: ' + String(err));
      // Không throw error để booking vẫn thành công dù chưa có link thanh toán
    }

    return result;
  }

  async findBookingById(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: [
        'user',
        'trip',
        'trip.route',
        'trip.bus',
        'passengerDetails',
        'seatStatuses',
        'seatStatuses.seat'
      ],
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

  async findBookingByGuest(dto: GetGuestBookingDto) {
    const { contactEmail, contactPhone } = dto;

    if (!contactEmail || !contactPhone) {
      throw new BadRequestException({
        success: false,
        error: { message: 'Contact Email and Contact Phone are required' },
        timestamp: new Date().toISOString(),
      });
    }

    const [booking] = await this.bookingRepository.find({
      where: { contactEmail, contactPhone },
      relations: {
        passengerDetails: true,
        trip: true,
      },
      order: { bookedAt: 'DESC' },
      take: 1,
    });

    if (!booking) {
      throw new NotFoundException({
        success: false,
        error: { code: 'BOOK_002', message: 'Booking not found for provided contact info' },
        timestamp: new Date().toISOString(),
      });
    }

    return booking;
  }

  async findUpcomingPaidBookings(hours: number): Promise<Booking[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.trip', 'trip')
      .leftJoinAndSelect('trip.route', 'route')
      .leftJoinAndSelect('trip.bus', 'bus')
      .leftJoinAndSelect('booking.passengerDetails', 'passenger')
      .leftJoinAndSelect('booking.user', 'user')
      .where('booking.status = :status', { status: BookingStatus.PAID })
      .andWhere('trip.departureTime BETWEEN :now AND :futureDate', { now, futureDate })
      .getMany();
  }

  async findBookingsByUserWithDetails(userId: string, status?: BookingStatus): Promise<any[]> {
    // Build the query with proper joins
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.trip', 'trip')
      .leftJoinAndSelect('trip.route', 'route')
      .leftJoinAndSelect('trip.bus', 'bus')
      .leftJoinAndSelect('booking.passengerDetails', 'passengerDetails')
      .leftJoinAndSelect('booking.seatStatuses', 'seatStatuses')
      .leftJoinAndSelect('seatStatuses.seat', 'seat')
      .where('booking.userId = :userId', { userId })
      .orderBy('booking.bookedAt', 'DESC');

    // Add status filter if provided
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    const bookings = await queryBuilder.getMany();

    // Transform the data to include all necessary information
    return bookings.map(booking => ({
      id: booking.id,
      userId: booking.userId,
      tripId: booking.tripId,
      reference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      status: booking.status,
      bookedAt: booking.bookedAt,
      cancelledAt: booking.cancelledAt,
      expiresAt: booking.status === BookingStatus.PENDING ?
        new Date(booking.bookedAt.getTime() + 15 * 60 * 1000) : null,

      // Trip details
      trip: booking.trip ? {
        id: booking.trip.id,
        departureTime: booking.trip.departureTime,
        arrivalTime: booking.trip.arrivalTime,
        basePrice: booking.trip.basePrice,
        status: booking.trip.status,
        route: booking.trip.route ? {
          id: booking.trip.route.id,
          name: booking.trip.route.name,
          description: booking.trip.route.description,
          origin: booking.trip.route.origin,
          destination: booking.trip.route.destination,
          distanceKm: booking.trip.route.distanceKm,
          estimatedMinutes: booking.trip.route.estimatedMinutes,
        } : null,
        bus: booking.trip.bus ? {
          id: booking.trip.bus.id,
          plateNumber: booking.trip.bus.plateNumber,
          model: booking.trip.bus.model,
          seatCapacity: booking.trip.bus.seatCapacity,
        } : null,
      } : null,

      // Passenger details
      passengers: booking.passengerDetails?.map(passenger => ({
        id: passenger.id,
        fullName: passenger.fullName,
        documentId: passenger.documentId || null,
        seatCode: passenger.seatCode,
      })) || [],

      // Seat details
      seats: booking.seatStatuses?.map(seatStatus => ({
        id: seatStatus.id,
        seatId: seatStatus.seatId,
        state: seatStatus.state,
        lockedUntil: seatStatus.lockedUntil,
        seat: seatStatus.seat ? {
          id: seatStatus.seat.id,
          seatCode: seatStatus.seat.seatCode,
          seatType: seatStatus.seat.seatType,
          isActive: seatStatus.seat.isActive,
        } : null,
      })) || [],
    }));
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
        // If booking already marked as PAID, treat as idempotent and return current booking
        if (booking.status === BookingStatus.PAID) {
          const seatStatuses = booking.seatStatuses || [];

          return {
            id: booking.id,
            bookingReference: booking.bookingReference,
            tripId: booking.tripId,
            totalAmount: booking.totalAmount,
            status: booking.status,
            bookedAt: booking.bookedAt,
            expirationTimestamp: null,
            passengers: booking.passengerDetails?.map(passenger => ({
              id: passenger.id,
              fullName: passenger.fullName,
              documentId: passenger.documentId || null,
              seatCode: passenger.seatCode,
            })) || [],
            seats: seatStatuses.map(status => ({
              seatId: status.seatId,
              seatCode: '',
              status: status.state,
            })),
          } as BookingResponseDto;
        }

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

      const response = {
        id: updatedBooking.id,
        bookingReference: updatedBooking.bookingReference,
        tripId: updatedBooking.tripId,
        totalAmount: updatedBooking.totalAmount,
        status: updatedBooking.status,
        bookedAt: updatedBooking.bookedAt,
        expirationTimestamp: null, // No expiration for PAID bookings
        passengers: updatedBooking.passengerDetails.map(passenger => ({
          id: passenger.id,
          fullName: passenger.fullName,
          documentId: passenger.documentId || null,
          seatCode: passenger.seatCode,
        })),
        seats: seatStatuses.map(status => ({
          seatId: status.seatId,
          seatCode: '', // Will be populated if needed
          status: status.state,
        })),
      };

      // 7. Send notification
      if (updatedBooking.userId) {
        await this.notificationsService.createInAppNotification(
          updatedBooking.userId,
          'Booking Successful',
          `Your booking ${updatedBooking.bookingReference} has been successfully confirmed and payment was completed.  We have sent an email to your email address. Please check your email for the e-ticket.`,
           { bookingId: updatedBooking.id, reference: updatedBooking.bookingReference },
           updatedBooking.id
        );
      }
      
      return response;
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
        // Idempotent: if already cancelled, return success without error
        return {
          success: true,
          message: 'Booking is already cancelled',
        };
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

  async updatePassengerInfo(
    bookingId: string,
    updatePassengerDto: { passengers: Array<{ id: string; fullName: string; documentId?: string; seatCode: string; }> },
    userId: string,
  ): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      // Find and verify booking ownership
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['passengerDetails'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new BadRequestException('Can only update passenger info for pending bookings');
      }

      // Update passenger details
      for (const passengerUpdate of updatePassengerDto.passengers) {
        const passengerDetail = await manager.findOne(PassengerDetail, {
          where: { id: passengerUpdate.id, bookingId: bookingId },
        });

        if (!passengerDetail) {
          throw new NotFoundException(`Passenger detail with ID ${passengerUpdate.id} not found`);
        }

        // Update passenger information
        await manager.update(PassengerDetail, passengerUpdate.id, {
          fullName: passengerUpdate.fullName,
          documentId: passengerUpdate.documentId,
          seatCode: passengerUpdate.seatCode,
        });
      }

      // Create audit log
      await this.createAuditLog(
        'UPDATE_PASSENGER_INFO',
        `Updated passenger information for booking ${bookingId}`,
        userId,
        undefined,
        {
          bookingId,
          updatedPassengers: updatePassengerDto.passengers.map(p => p.id),
        },
      );

      // Return updated booking
      const updatedBooking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['trip', 'passengerDetails', 'seatStatuses', 'seatStatuses.seat'],
      });

      if (!updatedBooking) {
        throw new NotFoundException('Updated booking not found');
      }

      // Transform to response format
      return {
        id: updatedBooking.id,
        userId: updatedBooking.userId,
        tripId: updatedBooking.tripId,
        totalAmount: updatedBooking.totalAmount,
        status: updatedBooking.status,
        bookedAt: updatedBooking.bookedAt,
        cancelledAt: updatedBooking.cancelledAt,
        passengers: updatedBooking.passengerDetails?.map(p => ({
          id: p.id,
          fullName: p.fullName,
          documentId: p.documentId || null,
          seatCode: p.seatCode,
        })) || [],
        seats: updatedBooking.seatStatuses?.map(s => ({
          id: s.id,
          seatCode: s.seat?.seatCode || '',
          state: s.state,
        })) || [],
        expirationTimestamp: updatedBooking.status === 'pending' ?
          new Date(updatedBooking.bookedAt.getTime() + 15 * 60 * 1000) : null,
      };
    });
  }

  async cancelBookingByUser(bookingId: string, userId: string): Promise<{ success: boolean; message: string; }> {
    return await this.dataSource.transaction(async (manager) => {
      // Find and verify booking ownership
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['seatStatuses', 'trip'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      this.logger.debug(`Processing cancellation for booking ${bookingId}`);

      if (booking.userId !== userId) {
        throw new BadRequestException('Access denied');
      }

      if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.PAID) {
        throw new BadRequestException(`Can only cancel pending or paid bookings. Current status: ${booking.status}`);
      }

      // Check if booking can be cancelled (at least 6 hours before departure)
      if (booking.trip?.departureTime) {
        const departureTime = new Date(booking.trip.departureTime);
        const currentTime = new Date();
        const timeDifference = departureTime.getTime() - currentTime.getTime();
        const hoursUntilDeparture = timeDifference / (1000 * 60 * 60); // Convert to hours

        this.logger.debug(`Cancellation time check: ${hoursUntilDeparture.toFixed(2)} hours until departure`);

        if (hoursUntilDeparture < 6) {
          throw new BadRequestException(`Cannot cancel booking less than 6 hours before departure. Hours until departure: ${hoursUntilDeparture.toFixed(2)}`);
        }
      }

      // Update booking status to cancelled
      await manager.update(Booking, bookingId, {
        status: BookingStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      // Release seats
      for (const seatStatus of booking.seatStatuses) {
        await manager.update(SeatStatus, seatStatus.id, {
          state: SeatState.AVAILABLE,
        });
      }

      // Create audit log
      await this.createAuditLog(
        'USER_CANCEL_BOOKING',
        `Booking ${bookingId} cancelled by user`,
        userId,
        undefined,
        {
          bookingId,
          previousStatus: booking.status,
          newStatus: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      );

      return {
        success: true,
        message: 'Booking cancelled successfully',
      };
    });
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

  // This method now correctly loads the user relation to fix the email issue
  private async getBookingForEticket(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: {
        user: true, // This ensures the user relation is loaded for email access
        trip: {
          route: true,
          bus: true,
        },
        passengerDetails: true,
      },
    });

    if (booking) {
      // If booking has a userId, treat as user booking; otherwise as guest.
      const type = booking.userId ? ('user' as const) : ('guest' as const);
      return { type, booking };
    }

    throw new NotFoundException({
      success: false,
      error: { code: 'BOOK_002', message: 'booking not found' },
      timestamp: new Date().toISOString(),
    });
  }

  async generateEticketFile(bookingId: string): Promise<{ buffer: Buffer; filename: string; qrBuffer: Buffer }> {
    const { booking } = await this.getBookingForEticket(bookingId);

    // Generate QR Code
    const qrBuffer = await QRCode.toBuffer(booking.bookingReference || 'NO_REF');

    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    return await new Promise((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const filename = `${booking.bookingReference || 'ticket'}.pdf`;
        resolve({ buffer, filename, qrBuffer });
      });
      doc.on('error', (err) => reject(err));

      // Use PDFKit's built-in fonts that support Unicode
      doc.font('Helvetica');

      // Header
      doc
        .fontSize(20)
        .text('Bus Ticket E-Ticket', { align: 'center' })
        .moveDown();

      // Add QR Code to PDF (Top Right)
      try {
        doc.image(qrBuffer, 450, 40, { width: 100 });
      } catch (error) {
        this.logger.error(`Failed to add QR code to PDF: ${error.message}`);
      }

      // Booking info
      doc
        .fontSize(12)
        .text(`Booking Reference: ${booking.bookingReference}`, { continued: false })
        .text(`Booking ID: ${booking.id}`)
        .moveDown();

      if (booking.trip) {
        const trip = booking.trip as any;
        const route = trip.route || {};
        const bus = trip.bus || {};

        doc
          .fontSize(14)
          .text('Trip Details', { underline: true })
          .moveDown(0.5);

        doc
          .fontSize(12)
          .text(`Route: ${route.origin || ''} -> ${route.destination || ''}`)
          .text(`Departure: ${trip.departureTime}`)
          .text(`Arrival: ${trip.arrivalTime}`)
          .text(`Bus: ${bus.model || ''} (${bus.plateNumber || ''})`)
          .moveDown();
      }

      // Passengers
      doc.fontSize(14).text('Passengers', { underline: true }).moveDown(0.5);

      (booking.passengerDetails || []).forEach((p, index) => {
        doc
          .fontSize(12)
          .text(
            `${index + 1}. ${p.fullName} - Doc: ${p.documentId || ''} - Seat: ${p.seatCode}`,
          );
      });

      doc.moveDown();

      // Pricing
      doc.fontSize(14).text('Pricing', { underline: true }).moveDown(0.5);
      doc
        .fontSize(12)
        .text(`Total Amount: ${booking.totalAmount} VND`)
        .moveDown();

      // Footer
      doc
        .fontSize(10)
        .text(
          'Please arrive at the station at least 30 minutes before departure. This e-ticket must be presented when boarding.',
          { align: 'left' },
        );

      doc.end();
    });
  }

  async sendEticketEmail(bookingId: string, overrideEmail?: string): Promise<{ success: boolean }> {
    const { booking } = await this.getBookingForEticket(bookingId);

    const to =
      overrideEmail ||
      booking.user?.email ||
      booking.contactEmail;

    if (!to) {
      throw new BadRequestException('No email available for this booking');
    }

    const { buffer, filename, qrBuffer } = await this.generateEticketFile(bookingId);

    await this.emailService.sendEmail({
      to,
      subject: `Booking Confirmed: ${booking.bookingReference}`,
      text: `Dear customer,\n\nPlease find attached your e-ticket for booking ${booking.bookingReference}.`,
      html: getBookingConfirmationTemplate(booking),
      attachments: [
        {
          filename,
          content: buffer,
        },
        {
          filename: 'qrcode.png',
          content: qrBuffer,
          cid: 'qrcode', // cid referenced in the html
        },
      ],
    });

    return { success: true };
  }
  
  /**
   * Check modification permissions for a booking
   */
  async checkModificationPermissions(
    bookingId: string,
    userId?: string,
  ): Promise<CheckModificationPermissionsDto> {
    const booking = await this.findBookingForModification(bookingId, userId);
    
    const permissions = await this.modificationPermissionService.checkModificationPermissions(
      booking,
      {
        passengerInfo: true,
        seats: true,
        contactInfo: true,
      }
    );

    const rules = await this.modificationPermissionService.getModificationRulesDescription(booking);
    
    return {
      canModifyPassengerInfo: permissions.canModifyPassengerInfo,
      canModifySeats: permissions.canModifySeats,
      canModifyContactInfo: permissions.canModifyContactInfo,
      rules,
      restrictions: permissions.reason ? [permissions.reason] : undefined,
    };
  }

  /**
   * Modify booking with comprehensive validation
   */
  async modifyBooking(
    bookingId: string,
    modificationDto: BookingModificationDto,
    userId?: string,
  ): Promise<BookingModificationResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // Find and validate booking
      const booking = await this.findBookingForModification(bookingId, userId);

      // Validate permissions for requested modifications
      const requestedModifications = {
        passengerInfo: !!modificationDto.passengerInfo?.length,
        seats: !!modificationDto.seatChanges?.length,
        contactInfo: !!modificationDto.contactInfo,
      };

      await this.modificationPermissionService.validateModificationPermissions(
        booking,
        requestedModifications
      );

      const modificationHistory: Array<{
        type: ModificationType;
        description: string;
        changes: any;
        previousValues: any;
      }> = [];

      // Handle passenger info modifications
      if (modificationDto.passengerInfo?.length) {
        const passengerChanges = await this.modifyPassengerInfo(
          manager,
          bookingId,
          modificationDto.passengerInfo
        );
        modificationHistory.push(...passengerChanges);
      }

      // Handle seat changes
      if (modificationDto.seatChanges?.length) {
        const seatChanges = await this.modifySeatSelection(
          manager,
          booking,
          modificationDto.seatChanges
        );
        modificationHistory.push(...seatChanges);
      }

      // Handle contact info changes
      if (modificationDto.contactInfo) {
        const contactChanges = await this.modifyContactInfo(
          manager,
          bookingId,
          modificationDto.contactInfo
        );
        if (contactChanges) modificationHistory.push(contactChanges);
      }

      // Update booking last modified timestamp
      await manager.update(Booking, bookingId, {
        lastModifiedAt: new Date(),
      });

      // Record modification history
      for (const modification of modificationHistory) {
        await manager.save(BookingModificationHistory, {
          bookingId,
          userId,
          modificationType: modification.type,
          description: modification.description,
          changes: modification.changes,
          previousValues: modification.previousValues,
          modifiedAt: new Date(),
        });
      }

      // Create audit log
      await this.createAuditLog(
        'MODIFY_BOOKING',
        `Modified booking ${bookingId}: ${modificationHistory.map(h => h.description).join(', ')}`,
        userId,
        undefined,
        {
          bookingId,
          modifications: modificationHistory.map(h => ({
            type: h.type,
            description: h.description,
          })),
        },
      );

      // Return updated booking info
      const updatedBooking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['trip'],
      });

      if (!updatedBooking) {
        throw new NotFoundException('Updated booking not found');
      }

      const modificationRules = await this.modificationPermissionService.getModificationRulesDescription(updatedBooking);

      return {
        id: updatedBooking.id,
        bookingReference: updatedBooking.bookingReference,
        status: updatedBooking.status,
        modificationAllowed: true,
        modificationRules,
        lastModifiedAt: updatedBooking.lastModifiedAt || updatedBooking.bookedAt,
        modificationHistory: modificationHistory.map(h => ({
          type: h.type,
          timestamp: new Date(),
          changes: h.changes,
        })),
      };
    });
  }

  /**
   * Get modification history for a booking
   */
  async getBookingModificationHistory(
    bookingId: string,
    userId?: string,
  ): Promise<BookingModificationHistory[]> {
    // Validate access to booking
    await this.findBookingForModification(bookingId, userId);

    return await this.modificationHistoryRepository.find({
      where: { bookingId },
      order: { modifiedAt: 'DESC' },
    });
  }

  /**
   * Helper method to find booking with modification validation
   */
  private async findBookingForModification(
    bookingId: string,
    userId?: string,
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['trip', 'passengerDetails', 'seatStatuses'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // For authenticated users, verify ownership
    if (userId && booking.userId !== userId) {
      throw new BadRequestException('Access denied - You can only modify your own bookings');
    }

    return booking;
  }

  /**
   * Helper method to modify passenger information
   */
  private async modifyPassengerInfo(
    manager: any,
    bookingId: string,
    passengerModifications: Array<{
      passengerId: string;
      fullName?: string;
      documentId?: string;
    }>
  ): Promise<Array<{
    type: ModificationType;
    description: string;
    changes: any;
    previousValues: any;
  }>> {
    const modifications: Array<{
      type: ModificationType;
      description: string;
      changes: any;
      previousValues: any;
    }> = [];

    for (const modification of passengerModifications) {
      const passenger = await manager.findOne(PassengerDetail, {
        where: { id: modification.passengerId, bookingId },
      });

      if (!passenger) {
        throw new NotFoundException(`Passenger with ID ${modification.passengerId} not found`);
      }

      const previousValues = {
        fullName: passenger.fullName,
        documentId: passenger.documentId,
      };

      const changes: any = {};
      let changeDescription: string[] = [];

      if (modification.fullName && modification.fullName !== passenger.fullName) {
        changes.fullName = modification.fullName;
        changeDescription.push(`name from "${passenger.fullName}" to "${modification.fullName}"`);
      }

      if (modification.documentId && modification.documentId !== passenger.documentId) {
        changes.documentId = modification.documentId;
        changeDescription.push(`document ID from "${passenger.documentId || ''}" to "${modification.documentId || ''}"`);
      }

      if (Object.keys(changes).length > 0) {
        await manager.update(PassengerDetail, modification.passengerId, changes);

        modifications.push({
          type: ModificationType.PASSENGER_INFO,
          description: `Updated passenger ${passenger.fullName}: ${changeDescription.join(', ')}`,
          changes,
          previousValues,
        });
      }
    }

    return modifications;
  }

  /**
   * Helper method to modify seat selection
   */
  private async modifySeatSelection(
    manager: any,
    booking: Booking,
    seatChanges: Array<{
      passengerId: string;
      newSeatCode: string;
    }>
  ): Promise<Array<{
    type: ModificationType;
    description: string;
    changes: any;
    previousValues: any;
  }>> {
    const modifications: Array<{
      type: ModificationType;
      description: string;
      changes: any;
      previousValues: any;
    }> = [];

    for (const seatChange of seatChanges) {
      const passenger = await manager.findOne(PassengerDetail, {
        where: { id: seatChange.passengerId, bookingId: booking.id },
      });

      if (!passenger) {
        throw new NotFoundException(`Passenger with ID ${seatChange.passengerId} not found`);
      }

      // Check if new seat exists and is available
      const newSeat = await manager.findOne(Seat, {
        where: { seatCode: seatChange.newSeatCode },
        relations: ['bus'],
      });

      if (!newSeat) {
        throw new BadRequestException(`Seat ${seatChange.newSeatCode} does not exist`);
      }

      // Check if the new seat is on the same bus
      if (newSeat.bus.id !== booking.trip.busId) {
        throw new BadRequestException(`Seat ${seatChange.newSeatCode} is not available on this trip`);
      }

      // Check if seat is available for the trip
      const existingSeatStatus = await manager.findOne(SeatStatus, {
        where: {
          tripId: booking.tripId,
          seatId: newSeat.id,
          state: SeatState.BOOKED,
        },
      });

      if (existingSeatStatus && existingSeatStatus.bookingId !== booking.id) {
        throw new BadRequestException(`Seat ${seatChange.newSeatCode} is already occupied`);
      }

      // Get current seat information
      const currentSeatStatus = await manager.findOne(SeatStatus, {
        where: {
          tripId: booking.tripId,
          bookingId: booking.id,
        },
        relations: ['seat'],
      });

      const previousSeatCode = passenger.seatCode;

      // Update passenger seat
      await manager.update(PassengerDetail, seatChange.passengerId, {
        seatCode: seatChange.newSeatCode,
      });

      // Update seat status - free the old seat and occupy the new one
      if (currentSeatStatus) {
        await manager.update(SeatStatus, currentSeatStatus.id, {
          seatId: newSeat.id,
        });
      }

      modifications.push({
        type: ModificationType.SEAT_CHANGE,
        description: `Changed seat for ${passenger.fullName} from ${previousSeatCode} to ${seatChange.newSeatCode}`,
        changes: {
          passengerId: seatChange.passengerId,
          newSeatCode: seatChange.newSeatCode,
          newSeatId: newSeat.id,
        },
        previousValues: {
          seatCode: previousSeatCode,
          seatId: currentSeatStatus?.seatId,
        },
      });
    }

    return modifications;
  }

  /**
   * Helper method to modify contact information
   */
  private async modifyContactInfo(
    manager: any,
    bookingId: string,
    contactInfo: {
      contactPhone?: string;
      contactEmail?: string;
    }
  ): Promise<{
    type: ModificationType;
    description: string;
    changes: any;
    previousValues: any;
  } | null> {
    const booking = await manager.findOne(Booking, {
      where: { id: bookingId },
    });

    const previousValues = {
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
    };

    const changes: any = {};
    let changeDescription: string[] = [];

    if (contactInfo.contactPhone && contactInfo.contactPhone !== booking.contactPhone) {
      changes.contactPhone = contactInfo.contactPhone;
      changeDescription.push(`phone from "${booking.contactPhone || 'none'}" to "${contactInfo.contactPhone}"`);
    }

    if (contactInfo.contactEmail && contactInfo.contactEmail !== booking.contactEmail) {
      changes.contactEmail = contactInfo.contactEmail;
      changeDescription.push(`email from "${booking.contactEmail || 'none'}" to "${contactInfo.contactEmail}"`);
    }

    if (Object.keys(changes).length > 0) {
      await manager.update(Booking, bookingId, changes);

      return {
        type: ModificationType.CONTACT_INFO,
        description: `Updated contact information: ${changeDescription.join(', ')}`,
        changes,
        previousValues,
      };
    }

    return null;
  }

  /**
   * A1.2 - Modify Passenger Details
   * API: PUT /api/bookings/:id/passengers
   */
  async modifyPassengerDetails(
    bookingId: string,
    modifyPassengerDto: { passengers: Array<{ id: string; fullName?: string; documentId?: string; seatCode?: string; }> },
    userId?: string,
  ): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      // Step 1: Validate booking ownership
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['trip', 'passengerDetails'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Validate ownership for registered users
      if (userId && booking.userId !== userId) {
        throw new BadRequestException('Access denied: You can only modify your own bookings');
      }

      // Step 2: Validate booking status
      await this.modificationPermissionService.validateModificationPermissions(
        booking,
        { passengerInfo: true }
      );

      const modificationResults: any[] = [];
      const modificationHistory: any[] = [];

      // Step 3: Validate and update each passenger
      for (const passengerUpdate of modifyPassengerDto.passengers) {
        // Validate passenger exists and belongs to this booking
        const passengerDetail = await manager.findOne(PassengerDetail, {
          where: { id: passengerUpdate.id, bookingId: bookingId },
        });

        if (!passengerDetail) {
          throw new NotFoundException(`Passenger detail with ID ${passengerUpdate.id} not found in this booking`);
        }

        // Store previous values for history tracking
        const previousValues = {
          fullName: passengerDetail.fullName,
          documentId: passengerDetail.documentId,
          seatCode: passengerDetail.seatCode,
        };

        const changes: any = {};
        let hasChanges = false;

        // Validate and prepare changes
        if (passengerUpdate.fullName && passengerUpdate.fullName !== passengerDetail.fullName) {
          changes.fullName = passengerUpdate.fullName;
          hasChanges = true;
        }

        if (passengerUpdate.documentId && passengerUpdate.documentId !== passengerDetail.documentId) {
          changes.documentId = passengerUpdate.documentId;
          hasChanges = true;
        }

        if (passengerUpdate.seatCode && passengerUpdate.seatCode !== passengerDetail.seatCode) {
          // Validate seat availability if seat is being changed
          const existingSeatBooking = await manager.findOne(SeatStatus, {
            where: {
              tripId: booking.tripId,
              seat: { seatCode: passengerUpdate.seatCode },
              state: SeatState.BOOKED,
            },
          });

          if (existingSeatBooking && existingSeatBooking.bookingId !== bookingId) {
            throw new ConflictException(`Seat ${passengerUpdate.seatCode} is already occupied`);
          }

          changes.seatCode = passengerUpdate.seatCode;
          hasChanges = true;
        }

        if (hasChanges) {
          // Step 4: Update passenger details
          await manager.update(PassengerDetail, passengerUpdate.id, changes);

          // Update seat status if seat changed
          if (changes.seatCode) {
            // Free old seat
            const previousSeatStatus = await manager.findOne(SeatStatus, {
              where: {
                tripId: booking.tripId,
                bookingId,
                seat: { seatCode: previousValues.seatCode },
              },
            });

            if (previousSeatStatus) {
              await manager.update(
                SeatStatus,
                previousSeatStatus.id,
                { state: SeatState.AVAILABLE, bookingId: null },
              );
            }

            // Book new seat
            const newSeatStatus = await manager.findOne(SeatStatus, {
              where: {
                tripId: booking.tripId,
                seat: { seatCode: changes.seatCode },
              },
            });

            if (newSeatStatus) {
              await manager.update(
                SeatStatus,
                newSeatStatus.id,
                { state: SeatState.BOOKED, bookingId },
              );
            }
          }

          // Step 5: Log modification history
          const modificationRecord = {
            bookingId,
            userId,
            modificationType: ModificationType.PASSENGER_INFO,
            description: this.generatePassengerModificationDescription(
              passengerDetail.fullName,
              changes,
              previousValues
            ),
            changes,
            previousValues,
          };

          await manager.save(BookingModificationHistory, modificationRecord);
          modificationHistory.push({
            type: 'passenger_info',
            description: modificationRecord.description,
            timestamp: new Date(),
          });

          // Get updated passenger details
          const updatedPassenger = await manager.findOne(PassengerDetail, {
            where: { id: passengerUpdate.id },
          });

          if (!updatedPassenger) {
            throw new NotFoundException('Updated passenger not found');
          }

          modificationResults.push({
            id: updatedPassenger.id,
            bookingId: updatedPassenger.bookingId,
            fullName: updatedPassenger.fullName,
            documentId: updatedPassenger.documentId || null,
            seatCode: updatedPassenger.seatCode,
            modifiedAt: new Date(),
          });
        }
      }

      // Update booking last modified timestamp
      await manager.update(Booking, bookingId, {
        lastModifiedAt: new Date(),
      });

      // Step 6: Create audit log
      await this.createAuditLog(
        'MODIFY_PASSENGER_DETAILS',
        `Modified passenger details for booking ${booking.bookingReference}`,
        userId,
        undefined,
        {
          bookingId,
          modifiedPassengers: modificationResults.map(p => p.id),
          changes: modificationHistory,
        },
      );

      return {
        bookingId,
        bookingReference: booking.bookingReference,
        modifiedPassengers: modificationResults,
        modificationHistory,
      };
    });
  }

  /**
   * Generate human-readable description for passenger modification
   */
  private generatePassengerModificationDescription(
    passengerName: string,
    changes: any,
    previousValues: any
  ): string {
    const descriptions: string[] = [];

    if (changes.fullName) {
      descriptions.push(`name from '${previousValues.fullName}' to '${changes.fullName}'`);
    }

    if (changes.documentId) {
      descriptions.push(`document ID from '${previousValues.documentId || ''}' to '${changes.documentId || ''}'`);
    }

    if (changes.seatCode) {
      descriptions.push(`seat from '${previousValues.seatCode}' to '${changes.seatCode}'`);
    }

    return `Updated passenger ${passengerName}: ${descriptions.join(', ')}`;
  }

  /**
   * A1.3 - Change Seats
   * API: PUT /api/bookings/:id/seats
   */
  async changeSeats(
    bookingId: string,
    changeSeatsDto: { seatChanges: Array<{ passengerId: string; newSeatCode: string; }> },
    userId?: string,
  ): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      // Step 1: Validate booking ownership
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        relations: ['trip', 'trip.route', 'trip.bus', 'passengerDetails'],
      });

      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      // Validate ownership for registered users
      if (userId && booking.userId !== userId) {
        throw new BadRequestException('Access denied: You can only modify your own bookings');
      }

      // Step 2: Validate booking status and time constraints
      await this.modificationPermissionService.validateModificationPermissions(
        booking,
        { seats: true }
      );

      const seatChangeResults: any[] = [];
      const modificationHistory: any[] = [];
      let oldTotalAmount = booking.totalAmount;
      let totalPriceDifference = 0;

      // Step 3: Process each seat change
      for (const seatChange of changeSeatsDto.seatChanges) {
        // Validate passenger exists and belongs to this booking
        const passengerDetail = await manager.findOne(PassengerDetail, {
          where: { id: seatChange.passengerId, bookingId: bookingId },
        });

        if (!passengerDetail) {
          throw new NotFoundException(`Passenger with ID ${seatChange.passengerId} not found in this booking`);
        }

        // Check if seat change is actually needed
        if (passengerDetail.seatCode === seatChange.newSeatCode) {
          continue; // Skip if same seat
        }

        // Step 4: Check seat availability
        const newSeat = await manager.findOne(Seat, {
          where: { seatCode: seatChange.newSeatCode, busId: booking.trip.busId },
        });

        if (!newSeat) {
          throw new NotFoundException(`Seat ${seatChange.newSeatCode} not found on this bus`);
        }

        if (!newSeat.isActive) {
          throw new BadRequestException(`Seat ${seatChange.newSeatCode} is not available for booking`);
        }

        // Check if new seat is available for this trip
        const existingSeatStatus = await manager.findOne(SeatStatus, {
          where: {
            tripId: booking.tripId,
            seatId: newSeat.id,
          },
        });

        if (existingSeatStatus && existingSeatStatus.state !== SeatState.AVAILABLE) {
          if (existingSeatStatus.bookingId !== bookingId) {
            throw new ConflictException(`Seat ${seatChange.newSeatCode} is already occupied`);
          }
        }

        // Get old seat info for price calculation
        const oldSeat = await manager.findOne(Seat, {
          where: { seatCode: passengerDetail.seatCode, busId: booking.trip.busId },
        });

        // Step 5: Calculate price difference
        const { oldSeatPrice, newSeatPrice, priceDifference } = await this.calculateSeatPriceDifference(
          booking.trip,
          oldSeat,
          newSeat,
          manager
        );

        // Step 6: Update seat statuses
        // Release old seat
        if (oldSeat) {
          await manager.update(
            SeatStatus,
            { tripId: booking.tripId, seatId: oldSeat.id, bookingId },
            { state: SeatState.AVAILABLE, bookingId: null }
          );
        }

        // Lock new seat
        if (existingSeatStatus) {
          await manager.update(
            SeatStatus,
            { tripId: booking.tripId, seatId: newSeat.id },
            { state: SeatState.BOOKED, bookingId }
          );
        } else {
          // Create new seat status record
          const newSeatStatus = manager.create(SeatStatus, {
            tripId: booking.tripId,
            seatId: newSeat.id,
            bookingId,
            state: SeatState.BOOKED,
            // seatCode: newSeat.seatCode,
          });
          await manager.save(SeatStatus, newSeatStatus);
        }

        // Step 7: Update passenger seat code
        await manager.update(
          PassengerDetail,
          seatChange.passengerId,
          { seatCode: seatChange.newSeatCode }
        );

        // Track changes
        totalPriceDifference += priceDifference;
        
        seatChangeResults.push({
          passengerId: seatChange.passengerId,
          passengerName: passengerDetail.fullName,
          oldSeatCode: passengerDetail.seatCode,
          newSeatCode: seatChange.newSeatCode,
          oldSeatPrice,
          newSeatPrice,
          priceDifference,
        });

        // Log modification history
        const modificationRecord = {
          bookingId,
          userId,
          modificationType: ModificationType.SEAT_CHANGE,
          description: `Changed seat for ${passengerDetail.fullName} from ${passengerDetail.seatCode} to ${seatChange.newSeatCode} (${priceDifference >= 0 ? '+' : ''}${priceDifference.toLocaleString()} VND)`,
          changes: {
            passengerId: seatChange.passengerId,
            newSeatCode: seatChange.newSeatCode,
            priceDifference,
          },
          previousValues: {
            oldSeatCode: passengerDetail.seatCode,
            oldPrice: oldSeatPrice,
          },
        };

        await manager.save(BookingModificationHistory, modificationRecord);
        modificationHistory.push({
          type: 'seat_change',
          description: modificationRecord.description,
          timestamp: new Date(),
        });
      }

      // Step 8: Recalculate and update total price if there are price differences
      const newTotalAmount = oldTotalAmount + totalPriceDifference;
      
      if (totalPriceDifference !== 0) {
        await manager.update(Booking, bookingId, {
          totalAmount: newTotalAmount,
          lastModifiedAt: new Date(),
        });
      } else {
        await manager.update(Booking, bookingId, {
          lastModifiedAt: new Date(),
        });
      }

      // Step 9: Create audit log
      await this.createAuditLog(
        'CHANGE_SEATS',
        `Changed seats for booking ${booking.bookingReference}. Price difference: ${totalPriceDifference.toLocaleString()} VND`,
        userId,
        undefined,
        {
          bookingId,
          seatChanges: seatChangeResults,
          totalPriceDifference,
          oldTotalAmount,
          newTotalAmount,
        },
      );

      return {
        bookingId,
        bookingReference: booking.bookingReference,
        seatChanges: seatChangeResults,
        oldTotalAmount,
        newTotalAmount,
        totalPriceDifference,
        modificationHistory,
      };
    });
  }

  /**
   * Calculate price difference between old and new seats
   */
  private async calculateSeatPriceDifference(
    trip: Trip,
    oldSeat: Seat | null,
    newSeat: Seat,
    manager: any
  ): Promise<{ oldSeatPrice: number; newSeatPrice: number; priceDifference: number }> {
    // Get seat layout for pricing information
    const seatLayout = await manager.findOne(SeatLayout, {
      where: { busId: trip.busId },
    });

    const basePrice = trip.basePrice;
    let oldSeatPrice = basePrice;
    let newSeatPrice = basePrice;

    if (seatLayout && seatLayout.seatTypePrices) {
      const seatTypePrices = seatLayout.seatTypePrices;
      
      // Calculate old seat price
      if (oldSeat) {
        switch (oldSeat.seatType) {
          case 'normal':
            oldSeatPrice = basePrice + (seatTypePrices.normal || 0);
            break;
          case 'vip':
            oldSeatPrice = basePrice + (seatTypePrices.vip || 0);
            break;
          case 'business':
            oldSeatPrice = basePrice + (seatTypePrices.business || 0);
            break;
        }
      }

      // Calculate new seat price
      switch (newSeat.seatType) {
        case 'normal':
          newSeatPrice = basePrice + (seatTypePrices.normal || 0);
          break;
        case 'vip':
          newSeatPrice = basePrice + (seatTypePrices.vip || 0);
          break;
        case 'business':
          newSeatPrice = basePrice + (seatTypePrices.business || 0);
          break;
      }
    }

    const priceDifference = newSeatPrice - oldSeatPrice;

    return {
      oldSeatPrice,
      newSeatPrice,
      priceDifference,
    };
  }

  /**
   * Find expired bookings that need to be auto-cancelled
   */
  async findExpiredBookings(): Promise<Booking[]> {
    const now = new Date();
    
    return await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.trip', 'trip')
      .leftJoinAndSelect('trip.route', 'route')
      .leftJoinAndSelect('booking.seatStatuses', 'seatStatuses')
      .where('booking.status = :status', { status: BookingStatus.PENDING })
      .andWhere('booking.expiresAt < :now', { now })
      .getMany();
  }

  /**
   * Auto-cancel expired bookings and release their seats with enhanced idempotency
   */
  async expireBookings(): Promise<{ expiredCount: number; bookings: string[] }> {
    const sessionId = `exp-svc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiredBookings = await this.findExpiredBookings();
    const expiredBookingIds: string[] = [];
    const processedBookingIds = new Set<string>(); // Track processed bookings for idempotency

    if (expiredBookings.length === 0) {
      return { expiredCount: 0, bookings: [] };
    }

    this.logger.log(`[${sessionId}] Found ${expiredBookings.length} expired bookings to process`);

    // Process each expired booking in a transaction
    for (const booking of expiredBookings) {
      // Idempotency check: skip if already processed
      if (processedBookingIds.has(booking.id)) {
        this.logger.warn(`[${sessionId}] Booking ${booking.bookingReference} already processed in this session, skipping`);
        continue;
      }

      try {
        await this.dataSource.transaction(async manager => {
          // Double-check booking is still eligible for expiration (idempotency safety)
          const currentBooking = await manager.findOne(Booking, {
            where: { 
              id: booking.id, 
              status: BookingStatus.PENDING  // Only expire if still PENDING
            },
            select: ['id', 'status', 'expiresAt', 'bookingReference']
          });

          if (!currentBooking) {
            this.logger.debug(`[${sessionId}] Booking ${booking.bookingReference} no longer PENDING, skipping`);
            return; // Skip if booking is no longer in PENDING state
          }

          if (new Date(currentBooking.expiresAt!) > new Date()) {
            this.logger.warn(`[${sessionId}] Booking ${booking.bookingReference} expiration time changed, no longer expired`);
            return; // Skip if expiration time was updated
          }

          // Update booking status to expired (with WHERE condition for safety)
          const updateResult = await manager.update(
            Booking, 
            { 
              id: booking.id, 
              status: BookingStatus.PENDING // Additional safety check 
            },
            {
              status: BookingStatus.EXPIRED,
              cancelledAt: new Date(),
              lastModifiedAt: new Date(),
            }
          );

          if (updateResult.affected === 0) {
            this.logger.warn(`[${sessionId}] Booking ${booking.bookingReference} was not updated - may have been processed by another instance`);
            return; // Skip if update didn't affect any rows (already processed)
          }

          // Release all seats for this booking (only if they're still linked to this booking)
          const seatUpdateResult = await manager.update(
            SeatStatus, 
            { 
              bookingId: booking.id, 
            }, 
            { 
              state: SeatState.AVAILABLE,
              bookingId: null,
              lockedUntil: null,
            }
          );

          this.logger.debug(`[${sessionId}] Released ${seatUpdateResult.affected} seats for booking ${booking.bookingReference}`);

          // Create audit log
          await this.createAuditLog(
            'BOOKING_EXPIRED',
            `Booking ${booking.bookingReference} expired automatically after ${BOOKING_EXPIRATION_MINUTES} minutes`,
            undefined, // actorId (system action)
            booking.userId,
            {
              bookingReference: booking.bookingReference,
              tripId: booking.tripId,
              totalAmount: booking.totalAmount,
              expiresAt: booking.expiresAt,
              sessionId, // Include session ID for tracking
              seatsReleased: seatUpdateResult.affected,
            },
          );

          expiredBookingIds.push(booking.id);
          processedBookingIds.add(booking.id);
        });

        this.logger.debug(`[${sessionId}] Successfully expired booking ${booking.bookingReference}`);
      } catch (error) {
        this.logger.error(`[${sessionId}] Failed to expire booking ${booking.bookingReference}:`, error);
        
        // Check if it's a constraint violation (booking already processed)
        if (error.message?.includes('duplicate') || error.message?.includes('constraint')) {
          this.logger.warn(`[${sessionId}] Booking ${booking.bookingReference} appears to be already processed by another instance`);
          processedBookingIds.add(booking.id); // Mark as processed to avoid retry
        }
      }
    }

    this.logger.log(`[${sessionId}] Expired ${expiredBookingIds.length}/${expiredBookings.length} bookings: ${expiredBookingIds.join(', ')}`);

    return {
      expiredCount: expiredBookingIds.length,
      bookings: expiredBookingIds,
    };
  }

  /**
   * Check if a booking has expired
   */
  async isBookingExpired(bookingId: string): Promise<boolean> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      select: ['status', 'expiresAt'],
    });

    if (!booking) {
      return true; // Non-existent bookings are considered expired
    }

    if (booking.status !== BookingStatus.PENDING) {
      return false; // Only pending bookings can expire
    }

    if (!booking.expiresAt) {
      return false; // No expiration time set
    }

    return new Date() > booking.expiresAt;
  }

  /**
   * Get remaining time for a booking in minutes
   */
  async getBookingRemainingTime(bookingId: string): Promise<number | null> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      select: ['status', 'expiresAt'],
    });

    if (!booking || booking.status !== BookingStatus.PENDING || !booking.expiresAt) {
      return null;
    }

    const remainingMs = booking.expiresAt.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(remainingMs / (1000 * 60))); // Convert to minutes
  }
}
