import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserModule } from '../../src/user/user.module';
import { User, UserRole } from '../../src/entities/user.entity';
import { Booking, BookingStatus } from '../../src/entities/booking.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Route } from '../../src/entities/route.entity';
import { Operator } from '../../src/entities/operator.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { Seat } from '../../src/entities/seat.entity';
import { PassengerDetail } from '../../src/entities/passenger-detail.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { BookingModule } from '../../src/booking/booking.module';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from '../../src/auth/auth.module';
import cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import { PayosService } from '../../src/payos/payos.service';
import { EmailService } from '../../src/booking/email.service';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let bookingRepository: Repository<Booking>;
  let tripRepository: Repository<Trip>;
  let routeRepository: Repository<Route>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let jwtService: JwtService;

  beforeAll(async () => {
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
        UserModule,
        BookingModule,
        TypeOrmModule.forFeature([
          User, 
          Booking, 
          Trip, 
          Route, 
          Bus, 
          Operator, 
          SeatStatus,
          Seat,
          PassengerDetail
        ]),
      ],
    })
    .overrideProvider(PayosService)
    .useValue({
        createPaymentLink: jest.fn().mockResolvedValue({ checkoutUrl: 'http://test.com' }),
        verifyWebhookData: jest.fn(),
    })
    .overrideProvider(EmailService)
    .useValue({
        sendEmail: jest.fn().mockResolvedValue({}),
        sendEticketEmail: jest.fn().mockResolvedValue({ success: true }),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    bookingRepository = moduleFixture.get<Repository<Booking>>(getRepositoryToken(Booking));
    tripRepository = moduleFixture.get<Repository<Trip>>(getRepositoryToken(Trip));
    routeRepository = moduleFixture.get<Repository<Route>>(getRepositoryToken(Route));
    busRepository = moduleFixture.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    if (userRepository) {
      const entities = ['seat_status', 'passenger_details', 'bookings', 'trips', 'buses', 'routes', 'operators', 'users'];
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

  beforeEach(async () => {
    const entities = ['seat_status', 'passenger_details', 'bookings', 'trips', 'buses', 'routes', 'operators', 'users'];
    for (const entity of entities) {
      try {
        await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {}
    }
  });

  async function createTestUser() {
    const email = `testuser-${crypto.randomUUID()}@example.com`;
    const user = await userRepository.save({
      email,
      passwordHash: 'hashedPassword',
      name: 'Test User',
      role: UserRole.CUSTOMER,
    });

    const token = jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { user, token };
  }

  async function setupBooking(user: User) {
    const operator = await operatorRepository.save({
      name: 'Booking Op',
      contactEmail: `bookop-${crypto.randomUUID()}@test.com`,
      contactPhone: '0900000001'
    });

    const route = await routeRepository.save({
      name: 'Route 1',
      description: 'Desc',
      origin: 'A',
      destination: 'B',
      operator,
      operatorId: operator.id
    });

    const bus = await busRepository.save({
      plateNumber: `BUS-${crypto.randomUUID()}`,
      model: 'Bus 1',
      seatCapacity: 40,
      operator,
      operatorId: operator.id
    });

    const trip = await tripRepository.save({
      route,
      bus,
      departureTime: new Date(),
      arrivalTime: new Date(Date.now() + 3600000),
      basePrice: 50000
    });

    const booking = await bookingRepository.save({
      bookingReference: `BK-${crypto.randomUUID()}`,
      code: `BK-${crypto.randomUUID()}`,
      user,
      trip,
      totalAmount: 50000,
      status: BookingStatus.PENDING,
      contactEmail: user.email,
      contactPhone: '123456'
    });

    return { booking, trip };
  }

  describe('GET /users/me/bookings', () => {
    it('should return user bookings', async () => {
      const { user, token } = await createTestUser();
      const { booking } = await setupBooking(user);

      const response = await request(app.getHttpServer())
      .get('/users/me/bookings')
      .set('Cookie', [`access_token=${token}`])
      .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].id).toBe(booking.id);
    });

    it('should filter by status', async () => {
      const { user, token } = await createTestUser();
      await setupBooking(user);

      const response = await request(app.getHttpServer())
        .get('/users/me/bookings')
        .query({ status: BookingStatus.CANCELLED })
        .set('Cookie', [`access_token=${token}`])
        .expect(200);
        
      expect(response.body.data.length).toBe(0);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/users/me/bookings')
        .expect(401);
    });
  });
});
