import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { SeatStatus, SeatState } from '../entities/seat-status.entity';
import { Trip } from '../entities/trip.entity';
import { Seat } from '../entities/seat.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingResponseDto } from './dto/booking-response.dto';

@Injectable()
export class BookingService {
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
}