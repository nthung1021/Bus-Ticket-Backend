import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingService } from './booking.service';
import { User, UserRole } from '../entities/user.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { Bus } from '../entities/bus.entity';
import { Operator } from '../entities/operator.entity';
import { Seat, SeatType } from '../entities/seat.entity';
import { SeatStatus, SeatState } from '../entities/seat-status.entity';
import { PassengerDetail } from '../entities/passenger-detail.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { BookingModificationHistory } from '../entities/booking-modification-history.entity';
import { SeatLayout } from '../entities/seat-layout.entity';
import { testDatabaseConfig } from '../config/test-database.config';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from './email.service';
import { BookingModificationPermissionService } from './booking-modification-permission.service';
import * as crypto from 'crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mocking external environment variables required by GoogleStrategy (if loaded via AuthModule)
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

describe('BookingService (integration)', () => {
  let service: BookingService;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let bookingRepository: Repository<Booking>;
  let tripRepository: Repository<Trip>;
  let routeRepository: Repository<Route>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let seatRepository: Repository<Seat>;
  let seatStatusRepository: Repository<SeatStatus>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) =>
            testDatabaseConfig(configService),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([
          User,
          Booking,
          Trip,
          Route,
          Bus,
          Operator,
          Seat,
          SeatStatus,
          PassengerDetail,
          AuditLog,
          BookingModificationHistory,
          SeatLayout,
        ]),
      ],
      providers: [
        BookingService,
        {
          provide: NotificationsService,
          useValue: {
            createInAppNotification: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn().mockResolvedValue({}),
            sendEticketEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        BookingModificationPermissionService,
      ],
    }).compile();

    moduleRef = module;
    service = module.get<BookingService>(BookingService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    tripRepository = module.get<Repository<Trip>>(getRepositoryToken(Trip));
    routeRepository = module.get<Repository<Route>>(getRepositoryToken(Route));
    busRepository = module.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
    seatRepository = module.get<Repository<Seat>>(getRepositoryToken(Seat));
    seatStatusRepository = module.get<Repository<SeatStatus>>(getRepositoryToken(SeatStatus));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(async () => {
    const entities = [
      'booking_modification_history',
      'notifications',
      'payments',
      'passenger_details',
      'seat_status',
      'bookings',
      'trips',
      'seats',
      'buses',
      'routes',
      'operators',
      'audit_logs',
      'refresh_tokens',
      'users'
    ];
    for (const entity of entities) {
      try {
        await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {}
    }
  });

  async function setupTrip() {
    const operator = await operatorRepository.save({
      name: 'Test Operator',
      contactEmail: `op-${crypto.randomUUID()}@test.com`,
      contactPhone: '0901234567',
    });

    const bus = await busRepository.save({
      operator,
      plateNumber: `PLATE-${crypto.randomUUID()}`,
      model: 'Test Bus',
      seatCapacity: 2,
    });

    const seat1 = await seatRepository.save({
      bus,
      seatCode: 'A1',
      seatType: SeatType.NORMAL,
    });

    const seat2 = await seatRepository.save({
      bus,
      seatCode: 'A2',
      seatType: SeatType.NORMAL,
    });

    const route = await routeRepository.save({
        name: 'Test Route',
        description: 'Test Description',
        operator,
        origin: 'A',
        destination: 'B',
        distanceKm: 100,
        estimatedMinutes: 60,
    });

    const trip = await tripRepository.save({
      route,
      bus,
      departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      arrivalTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
      basePrice: 100000,
    });

    return { trip, seats: [seat1, seat2] };
  }

  describe('createBooking', () => {
    it('should create a booking successfully', async () => {
      const { trip } = await setupTrip();
      const user = await userRepository.save({
        email: 'user@test.com',
        name: 'Test User',
        phone: '0901234567',
        passwordHash: 'hash',
      });

      const dto = {
        tripId: trip.id,
        seats: [{ code: 'A1' }],
        passengers: [{ fullName: 'John Doe', documentId: '123456', seatCode: 'A1' }],
        totalPrice: 100000,
        isGuestCheckout: false,
      };

      const result = await service.createBooking(user.id, dto as any);

      expect(result).toBeDefined();
      expect(result.status).toBe(BookingStatus.PAID);
      expect(result.bookingReference).toBeDefined();

      const dbBooking = await bookingRepository.findOne({ where: { id: result.id } });
      expect(dbBooking).toBeDefined();
      expect(dbBooking?.userId).toBe(user.id);
    });

    it('should throw ConflictException if seat is already booked', async () => {
      const { trip, seats } = await setupTrip();
      
      // Manually book seat A1
      await seatStatusRepository.save({
        tripId: trip.id,
        seatId: seats[0].id,
        state: SeatState.BOOKED,
      });

      const dto = {
        tripId: trip.id,
        seats: [{ code: 'A1' }],
        passengers: [{ fullName: 'John Doe', documentId: '123456', seatCode: 'A1' }],
        totalPrice: 100000,
        isGuestCheckout: true,
        contactEmail: 'guest2@test.com',
        contactPhone: '0900000001'
      };

      await expect(service.createBooking(null, dto as any))
        .rejects.toThrow('are no longer available');
    });
  });

  describe('cancelBookingByUser', () => {
    it('should cancel booking successfully', async () => {
        const { trip, seats } = await setupTrip();
        const user = await userRepository.save({
          email: 'user2@test.com',
          name: 'Test User 2',
          phone: '0901234568',
          passwordHash: 'hash',
        });

        const booking = await bookingRepository.save({
            tripId: trip.id,
            userId: user.id,
            totalAmount: 100000,
            status: BookingStatus.PAID,
            bookingReference: 'BK-CANCEL-TEST',
            bookedAt: new Date()
        });

        await seatStatusRepository.save({
            tripId: trip.id,
            seatId: seats[0].id,
            bookingId: booking.id,
            state: SeatState.BOOKED
        });

        const result = await service.cancelBookingByUser(booking.id, user.id);
        expect(result.success).toBe(true);

        const updatedBooking = await bookingRepository.findOne({ where: { id: booking.id } });
        expect(updatedBooking?.status).toBe(BookingStatus.CANCELLED);

        const updatedStatus = await seatStatusRepository.findOne({ where: { seatId: seats[0].id, tripId: trip.id } });
        expect(updatedStatus?.state).toBe(SeatState.AVAILABLE);
    });

    it('should throw BadRequestException if less than 6 hours before departure', async () => {
        const { trip } = await setupTrip();
        // Move departure to 2 hours from now
        await tripRepository.update(trip.id, {
            departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
        });

        const user = await userRepository.save({
          email: 'user3@test.com',
          name: 'Test User 3',
          phone: '0901234569',
          passwordHash: 'hash',
        });

        const booking = await bookingRepository.save({
            tripId: trip.id,
            userId: user.id,
            totalAmount: 100000,
            status: BookingStatus.PAID,
            bookingReference: 'BK-LATE-CANCEL',
            bookedAt: new Date()
        });

        await expect(service.cancelBookingByUser(booking.id, user.id))
            .rejects.toThrow('less than 6 hours before departure');
    });
  });

  describe('findBookingById', () => {
    it('should return booking with relations', async () => {
        const { trip } = await setupTrip();
        const booking = await bookingRepository.save({
            tripId: trip.id,
            totalAmount: 100000,
            status: BookingStatus.PAID,
            bookingReference: 'BK-FIND-TEST',
            bookedAt: new Date(),
            contactEmail: 'guest@test.com'
        });

        const result = await service.findBookingById(booking.id);
        expect(result).toBeDefined();
        expect(result.id).toBe(booking.id);
        expect(result.trip).toBeDefined();
    });

    it('should throw NotFoundException if booking not found', async () => {
        await expect(service.findBookingById(crypto.randomUUID()))
            .rejects.toThrow(NotFoundException);
    });
  });
});
