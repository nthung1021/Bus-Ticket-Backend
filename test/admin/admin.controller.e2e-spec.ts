import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminModule } from '../../src/admin/admin.module';
import { AuthModule } from '../../src/auth/auth.module';
import { User, UserRole } from '../../src/entities/user.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

describe('AdminController (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;
  let adminToken: string;
  let customerToken: string;

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
          AdminModule,
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(new ValidationPipe({ transform: true }));
      await app.init();

      userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

      // Clear DB at start
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

      // Setup Admin User
      const passwordHash = await bcrypt.hash('Admin123!', 10);
      await userRepository.save({
        email: 'admin@test.com',
        passwordHash,
        name: 'Admin User',
        phone: '0901111111',
        role: UserRole.ADMIN,
      });

      const adminLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin123!' });
      
      adminToken = (adminLogin.headers['set-cookie'] as any)
        ?.find((c: string) => c.startsWith('access_token='))
        ?.split(';')[0]
        ?.split('=')[1] || '';

      // Setup Customer User
      await userRepository.save({
        email: 'customer@test.com',
        passwordHash,
        name: 'Customer User',
        phone: '0902222222',
        role: UserRole.CUSTOMER,
      });

      const customerLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'customer@test.com', password: 'Admin123!' });

      customerToken = (customerLogin.headers['set-cookie'] as any)
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

  describe('GET /admin/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should forbid customer from getting all users', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Cookie', [`access_token=${customerToken}`])
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .expect(401);
    });
  });

  describe('PATCH /admin/users/:userId/role', () => {
    it('should allow admin to change user role', async () => {
      const user = await userRepository.findOneBy({ email: 'customer@test.com' });
      
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${user?.id}/role`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ role: UserRole.ADMIN })
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.updated.role).toBe(UserRole.ADMIN);

      // Verify in DB
      const updatedUser = await userRepository.findOneBy({ id: user?.id });
      expect(updatedUser?.role).toBe(UserRole.ADMIN);
    });
  });

  describe('GET /admin/analytics/bookings/summary', () => {
    it('should return analytics summary for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/analytics/bookings/summary')
        .query({ timeframe: 'monthly' })
        .set('Cookie', [`access_token=${adminToken}`])
        .expect(200);

      expect(response.body).toHaveProperty('totalBookings');
      expect(response.body).toHaveProperty('totalRevenue');
    });
  });
});
