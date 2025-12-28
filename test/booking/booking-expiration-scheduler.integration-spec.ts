import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingService } from '../../src/booking/booking.service';
import { BookingExpirationScheduler } from '../../src/booking/booking-expiration-scheduler.service';
import { User } from '../../src/entities/user.entity';
import { Booking, BookingStatus } from '../../src/entities/booking.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Route } from '../../src/entities/route.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { Seat, SeatType } from '../../src/entities/seat.entity';
import { SeatStatus, SeatState } from '../../src/entities/seat-status.entity';
import { PassengerDetail } from '../../src/entities/passenger-detail.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { BookingModificationHistory } from '../../src/entities/booking-modification-history.entity';
import { SeatLayout } from '../../src/entities/seat-layout.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { EmailService } from '../../src/booking/email.service';
import { BookingModificationPermissionService } from '../../src/booking/booking-modification-permission.service';
import * as crypto from 'crypto';

// Mocking external environment variables required by GoogleStrategy
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost/callback';

describe('BookingExpirationScheduler (integration)', () => {
  let scheduler: BookingExpirationScheduler;
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
        BookingExpirationScheduler,
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
          },
        },
        BookingModificationPermissionService,
      ],
    }).compile();

    moduleRef = module;
    scheduler = module.get<BookingExpirationScheduler>(BookingExpirationScheduler);
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

    const seat = await seatRepository.save({
      bus,
      seatCode: 'A1',
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

    return { trip, seat };
  }

  it('should expire pending bookings that have passed their expiration time', async () => {
    const { trip, seat } = await setupTrip();
    
    // Create a booking that expired 10 minutes ago
    // If BOOKING_EXPIRATION_MINUTES is 15, then we set bookedAt to 25 mins ago
    const expiredBookedAt = new Date(Date.now() - 25 * 60 * 1000);
    const booking = await bookingRepository.save({
      tripId: trip.id,
      totalAmount: 100000,
      status: BookingStatus.PENDING,
      bookingReference: 'BK-EXP-TEST',
      bookedAt: expiredBookedAt,
      expiresAt: new Date(expiredBookedAt.getTime() + 15 * 60 * 1000)
    });

    await seatStatusRepository.save({
      tripId: trip.id,
      seatId: seat.id,
      bookingId: booking.id,
      state: SeatState.BOOKED,
    });

    const result = await scheduler.processExpiredBookings();
    
    expect(result.expiredCount).toBe(1);
    expect(result.bookings).toContain(booking.id);

    const updatedBooking = await bookingRepository.findOne({ where: { id: booking.id } });
    expect(updatedBooking?.status).toBe(BookingStatus.EXPIRED);

    const updatedSeatStatus = await seatStatusRepository.findOne({ where: { seatId: seat.id, tripId: trip.id } });
    expect(updatedSeatStatus?.state).toBe(SeatState.AVAILABLE);
    expect(updatedSeatStatus?.bookingId).toBeNull();
  });

  it('should NOT expire recently created pending bookings', async () => {
    const { trip, seat } = await setupTrip();
    
    // Create a booking created 1 minute ago
    const booking = await bookingRepository.save({
      tripId: trip.id,
      totalAmount: 100000,
      status: BookingStatus.PENDING,
      bookingReference: 'BK-NEW-TEST',
      bookedAt: new Date(Date.now() - 1 * 60 * 1000),
      expiresAt: new Date(Date.now() + 14 * 60 * 1000)
    });

    await seatStatusRepository.save({
      tripId: trip.id,
      seatId: seat.id,
      bookingId: booking.id,
      state: SeatState.BOOKED,
    });

    const result = await scheduler.processExpiredBookings();
    
    expect(result.expiredCount).toBe(0);

    const updatedBooking = await bookingRepository.findOne({ where: { id: booking.id } });
    expect(updatedBooking?.status).toBe(BookingStatus.PENDING);
  });
});
