import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminService } from '../../src/admin/admin.service';
import { User, UserRole } from '../../src/entities/user.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { Booking, BookingStatus } from '../../src/entities/booking.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Route } from '../../src/entities/route.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { CacheService } from '../../src/common/cache.service';
import { NotFoundException } from '@nestjs/common';
import { AnalyticsTimeframe } from '../../src/admin/dto/analytics.dto';
import * as crypto from 'crypto';

describe('AdminService (integration)', () => {
  let moduleRef: TestingModule;
  let service: AdminService;
  let userRepository: Repository<User>;
  let auditRepository: Repository<AuditLog>;
  let bookingRepository: Repository<Booking>;
  let routeRepository: Repository<Route>;
  let tripRepository: Repository<Trip>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
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
          AuditLog,
          Booking,
          Trip,
          Route,
          Bus,
          Operator,
          SeatStatus,
        ]),
      ],
      providers: [AdminService, CacheService],
    }).compile();

    moduleRef = module;
    service = module.get<AdminService>(AdminService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    auditRepository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
    bookingRepository = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    routeRepository = module.get<Repository<Route>>(getRepositoryToken(Route));
    tripRepository = module.get<Repository<Trip>>(getRepositoryToken(Trip));
    busRepository = module.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
    seatStatusRepository = module.get<Repository<SeatStatus>>(getRepositoryToken(SeatStatus));
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
      'buses',
      'routes',
      'operators',
      'audit_logs',
      'users'
    ];
    for (const entity of entities) {
      await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
    }
  });

  describe('findAllUsers', () => {
    it('should return all users from database', async () => {
      await userRepository.save([
        { email: 'user1@example.com', name: 'User 1', phone: '0901234561', role: UserRole.CUSTOMER, passwordHash: 'hash1' },
        { email: 'user2@example.com', name: 'User 2', phone: '0901234562', role: UserRole.CUSTOMER, passwordHash: 'hash2' },
      ]);

      const result = await service.findAllUsers();
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty('email');
      expect(result[0]).toHaveProperty('userId');
    });
  });

  describe('updateUserRole', () => {
    it('should update user role and create audit log', async () => {
      const user = await userRepository.save({
        email: 'test@example.com',
        name: 'Test User',
        phone: '0901234563',
        role: UserRole.CUSTOMER,
        passwordHash: 'hashed_pass',
      });

      const actor = await userRepository.save({
        email: 'admin@example.com',
        name: 'Admin User',
        phone: '0901234564',
        role: UserRole.ADMIN,
        passwordHash: 'admin_hash',
      });

      const result = await service.updateUserRole(user.id, UserRole.ADMIN, actor.id);

      expect(result.role).toBe(UserRole.ADMIN);

      // Verify DB update
      const updatedUser = await userRepository.findOneBy({ id: user.id });
      expect(updatedUser?.role).toBe(UserRole.ADMIN);

      // Verify audit log
      const audit = await auditRepository.findOneBy({ targetUserId: user.id });
      expect(audit).toBeDefined();
      expect(audit?.action).toBe('CHANGE_ROLE');
      expect(audit?.actorId).toBe(actor.id);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const nonExistentId = crypto.randomUUID();
      await expect(service.updateUserRole(nonExistentId, UserRole.ADMIN))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Analytics Methods', () => {
    it('getBookingsSummary should return correct aggregations', async () => {
      const operator = await operatorRepository.save({
        name: 'Test Operator',
        contactEmail: 'operator@test.com',
        contactPhone: '0901234567',
      });

      const bus = await busRepository.save({
        operator,
        plateNumber: 'TEST-123',
        model: 'Deluxe Bus',
        seatCapacity: 40,
      });

      const route = await routeRepository.save({
        name: 'Test Route',
        description: 'A test route description',
        operator,
        origin: 'Origin',
        destination: 'Destination',
        distanceKm: 100,
        estimatedMinutes: 120,
      });

      const trip = await tripRepository.save({
        route,
        bus,
        departureTime: new Date(),
        arrivalTime: new Date(),
        basePrice: 100000,
      });

      await bookingRepository.save([
        {
          trip,
          bookedAt: new Date(),
          status: BookingStatus.PAID,
          totalAmount: 150000,
          contactEmail: 'test@example.com',
          contactPhone: '0901234567',
          contactName: 'Test',
          bookingReference: 'REF-001',
        },
        {
          trip,
          bookedAt: new Date(),
          status: BookingStatus.PENDING,
          totalAmount: 150000,
          contactEmail: 'test2@example.com',
          contactPhone: '0901234568',
          contactName: 'Test 2',
          bookingReference: 'REF-002',
        },
      ]);

      const summary = await service.getBookingsSummary({ timeframe: AnalyticsTimeframe.MONTHLY });

      expect(summary.totalBookings).toBe(2);
      expect(summary.paidBookings).toBe(1);
      expect(summary.totalRevenue).toBe(150000);
      expect(summary.conversionRate).toBe(50);
    });
  });
});
