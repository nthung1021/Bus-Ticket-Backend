import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatLayoutModule } from '../../src/seat-layout/seat-layout.module';
import { SeatLayout, SeatLayoutType } from '../../src/entities/seat-layout.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Seat } from '../../src/entities/seat.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { Operator } from '../../src/entities/operator.entity';
import { User, UserRole } from '../../src/entities/user.entity';
import { AuthModule } from '../../src/auth/auth.module'; // Needed for guards
import { testDatabaseConfig } from '../../src/config/test-database.config';
import cookieParser from 'cookie-parser';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'dummy';

describe('SeatLayoutController (e2e)', () => {
  let app: INestApplication;
  let seatLayoutRepository: Repository<SeatLayout>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let userRepository: Repository<User>;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
           imports: [ConfigModule],
           useFactory: (configService: ConfigService) => testDatabaseConfig(configService),
           inject: [ConfigService],
        }),
        AuthModule,
        SeatLayoutModule,
        // Features for cleanup access
        TypeOrmModule.forFeature([Operator, User]), 
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    seatLayoutRepository = moduleFixture.get<Repository<SeatLayout>>(getRepositoryToken(SeatLayout));
    busRepository = moduleFixture.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    // Full cleanup
    const entities = ['seat_status', 'seats', 'seat_layouts', 'buses', 'operators', 'refresh_tokens', 'users'];
    for (const entity of entities) {
        try {
            await seatLayoutRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
        } catch(e) {}
    }

    // Setup Admin User for Protected Routes
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await userRepository.save({
        email: 'admin@layout.com',
        passwordHash,
        name: 'Admin Layout',
        phone: '123456',
        role: UserRole.ADMIN
    });

    const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@layout.com', password: 'Admin123!' });

    adminToken = (loginRes.headers['set-cookie'] as any)
      ?.find((c: string) => c.startsWith('access_token='))
      ?.split(';')[0]
      ?.split('=')[1] || '';
  });

  afterAll(async () => {
    if (seatLayoutRepository) {
        const entities = ['seat_status', 'seats', 'seat_layouts', 'buses', 'operators', 'refresh_tokens', 'users'];
        for (const entity of entities) {
            try {
                await seatLayoutRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
            } catch(e) {}
        }
    }
    if (app) {
       await app.close();
    }
  });

  beforeEach(async () => {
      // Per-test partial cleanup: keep users and operators, clear data
      const entities = ['seat_status', 'seats', 'seat_layouts', 'buses'];
      for (const entity of entities) {
        try {
             await seatLayoutRepository.query(`DELETE FROM "${entity}"`);
        } catch(e) {}
      }
  });

  async function setupBus() {
    // Check if op exists or create
    let operator = await operatorRepository.findOne({ where: { contactEmail: 'e2e-layout@test.com' } });
    if (!operator) {
        operator = await operatorRepository.save({
            name: 'E2E Layout Op',
            contactEmail: 'e2e-layout@test.com',
            contactPhone: '999999999',
        });
    }

    const bus = await busRepository.save({
        operator,
        plateNumber: `LAYOUT-E2E-${crypto.randomUUID()}`,
        model: 'E2E Model',
        seatCapacity: 40
    });
    return bus;
  }

  describe('POST /seat-layouts/from-template', () => {
      it('should create layout from template (Admin only)', async () => {
          const bus = await setupBus();
          const dto = {
             busId: bus.id,
             layoutType: SeatLayoutType.STANDARD_2X2,
             seatPricing: {
                 basePrice: 50000,
                 seatTypePrices: {
                     normal: 50000,
                     vip: 70000,
                     business: 90000
                 }
             }
          };

          const response = await request(app.getHttpServer())
            .post('/seat-layouts/from-template')
            .set('Cookie', [`access_token=${adminToken}`])
            .send(dto)
            .expect(201);
          
          expect(response.body.id).toBeDefined();
          expect(response.body.busId).toBe(bus.id);
      });

      it('should fail for unauthorized user', async () => {
          await request(app.getHttpServer())
            .post('/seat-layouts/from-template')
            .send({})
            .expect(401);
      });
  });

  describe('GET /seat-layouts/templates', () => {
      it('should return available templates', async () => {
           const response = await request(app.getHttpServer())
             .get('/seat-layouts/templates')
             .set('Cookie', [`access_token=${adminToken}`]) // Controller uses @Roles() so login is required but role is open? 
             // Actually @Roles() without args usually means "any role" but still needs AuthGuard.
             // Looking at controller: @Roles() // Allow any authenticated user.
             // So we need token.
             .expect(200);

           expect(response.body.templates).toBeDefined();
           expect(Array.isArray(response.body.templates)).toBe(true);
      });
  });

  describe('GET /seat-layouts/bus/:busId', () => {
      it('should retrieve layout for bus', async () => {
          const bus = await setupBus();
          // Create directly in DB to test fetch
          await request(app.getHttpServer())
            .post('/seat-layouts/from-template')
            .set('Cookie', [`access_token=${adminToken}`])
            .send({
                busId: bus.id,
                layoutType: SeatLayoutType.STANDARD_2X2,
                seatPricing: {
                    basePrice: 50000,
                    seatTypePrices: {
                        normal: 50000,
                        vip: 70000,
                        business: 90000
                    }
                }
            });

          const response = await request(app.getHttpServer())
            .get(`/seat-layouts/bus/${bus.id}`)
            .set('Cookie', [`access_token=${adminToken}`])
            .expect(200);

          expect(response.body.busId).toBe(bus.id);
      });
  });
});
