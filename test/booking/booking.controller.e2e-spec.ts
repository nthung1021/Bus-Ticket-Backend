import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingModule } from '../../src/booking/booking.module';
import { EmailService } from '../../src/booking/email.service';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { AuthModule } from '../../src/auth/auth.module';
import { User, UserRole } from '../../src/entities/user.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Route } from '../../src/entities/route.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { Seat, SeatType } from '../../src/entities/seat.entity';
import { Booking } from '../../src/entities/booking.entity';
import { PassengerDetail } from '../../src/entities/passenger-detail.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Set dummy values for Google OAuth to avoid strategy initialization errors
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost/callback';

describe('BookingController (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let tripRepository: Repository<Trip>;
  let routeRepository: Repository<Route>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let seatRepository: Repository<Seat>;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
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
          AuthModule,
          BookingModule,
          TypeOrmModule.forFeature([
            User,
            Trip,
            Route,
            Bus,
            Operator,
            Seat,
            Booking,
            PassengerDetail,
            SeatStatus,
          ]),
        ],
      })
      .overrideProvider(EmailService)
      .useValue({
        sendEmail: jest.fn().mockResolvedValue({}),
        sendEticketEmail: jest.fn().mockResolvedValue({ success: true }),
      })
      .overrideProvider(NotificationsService)
      .useValue({
        createInAppNotification: jest.fn().mockResolvedValue({}),
      })
      .compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      await app.init();

      userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
      tripRepository = moduleFixture.get<Repository<Trip>>(getRepositoryToken(Trip));
      routeRepository = moduleFixture.get<Repository<Route>>(getRepositoryToken(Route));
      busRepository = moduleFixture.get<Repository<Bus>>(getRepositoryToken(Bus));
      operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
      seatRepository = moduleFixture.get<Repository<Seat>>(getRepositoryToken(Seat));

      // Clear DB at start
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

      // Setup Test User
      const passwordHash = await bcrypt.hash('Test1234!', 10);
      const user = await userRepository.save({
        email: 'testuser@test.com',
        passwordHash,
        name: 'Test User',
        phone: '0901234567',
        role: UserRole.CUSTOMER,
      });
      userId = user.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'testuser@test.com', password: 'Test1234!' });

      userToken = (loginResponse.headers['set-cookie'] as any)
        ?.find((c: string) => c.startsWith('access_token='))
        ?.split(';')[0]
        ?.split('=')[1] || '';
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    if (userRepository) {
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
    }
    if (app) {
      await app.close();
    }
  });

  async function setupTrip() {
    const operator = await operatorRepository.save({
      name: 'E2E Operator',
      contactEmail: `e2e-op-${crypto.randomUUID()}@test.com`,
      contactPhone: '0900000001',
    });

    const bus = await busRepository.save({
      operator,
      plateNumber: `E2E-PLATE-${crypto.randomUUID()}`,
      model: 'E2E Bus',
      seatCapacity: 10,
    });

    const seat = await seatRepository.save({ 
      bus, 
      seatCode: 'A1', 
      seatType: SeatType.NORMAL 
    });

    const route = await routeRepository.save({
      name: 'E2E Route',
      description: 'E2E Description',
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
      basePrice: 50000,
    });

    return { trip, seat };
  }

  describe('POST /bookings', () => {
    it('should create a new booking for authenticated user', async () => {
      const { trip, seat } = await setupTrip();

      const bookingDto = {
        tripId: trip.id,
        seats: [{ 
          id: seat.id, 
          code: 'A1', 
          type: 'normal', 
          price: 50000 
        }],
        passengers: [{ fullName: 'E2E Passenger', documentId: 'PD123', seatCode: 'A1' }],
        totalPrice: 50000,
        isGuestCheckout: false,
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Cookie', [`access_token=${userToken}`])
        .send(bookingDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bookingReference).toBeDefined();
    });

    it('should throw Bad Request when empty body provided (Optional Auth)', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .send({})
        .expect(400);
    });
  });

  describe('GET /bookings', () => {
    it('should return user bookings list', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Cookie', [`access_token=${userToken}`])
        .expect(200);

      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /bookings/:id', () => {
    it('should return booking details', async () => {
      const userBookings = await request(app.getHttpServer())
        .get('/bookings')
        .set('Cookie', [`access_token=${userToken}`]);
      
      const bookingId = userBookings.body.data[0].id;

      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Cookie', [`access_token=${userToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(bookingId);
    });
  });
});
