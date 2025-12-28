import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusModule } from '../../src/bus/bus.module';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Seat } from '../../src/entities/seat.entity';
import { SeatLayout } from '../../src/entities/seat-layout.entity';
import { User } from '../../src/entities/user.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import * as crypto from 'crypto';

// Mocking external environment variables just in case AuthModule or others are pulled in
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

describe('BusController (e2e)', () => {
  let app: INestApplication;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let userRepository: Repository<User>; // For cleanup

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
        BusModule,
        // We import these features to access repositories for setup & cleanup
        TypeOrmModule.forFeature([Operator, User, Trip, Seat, SeatLayout]), 
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    busRepository = moduleFixture.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    // Teardown
    if (userRepository) {
      const entities = [
        'seat_layouts',
        'seats',
        'trips',
        'buses',
        'operators',
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

  // Helper to ensure clean slate
  beforeEach(async () => {
    const entities = [
      'seat_layouts',
      'seats',
      'trips',
      'buses',
      'operators',
      'users' 
    ];
    for (const entity of entities) {
      try {
        await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {}
    }
  });

  async function createOperator() {
    return await operatorRepository.save({
      name: 'E2E Operator',
      contactEmail: `e2e-bus-${crypto.randomUUID()}@test.com`,
      contactPhone: '1234567890',
    });
  }

  describe('POST /buses', () => {
    it('should create a new bus', async () => {
      const operator = await createOperator();
      const createDto = {
        operatorId: operator.id,
        plateNumber: 'E2E-BUS-1',
        model: 'E2E Model',
        seatCapacity: 50,
        amenities: ['TV'],
      };

      const response = await request(app.getHttpServer())
        .post('/buses')
        .send(createDto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.plateNumber).toBe('E2E-BUS-1');
      expect(response.body.operatorId).toBe(operator.id);
    });

    it('should return 400 if operatorId is invalid', async () => {
      const createDto = {
        operatorId: crypto.randomUUID(),
        plateNumber: 'E2E-BUS-INVALID',
        model: 'E2E Model',
        seatCapacity: 50,
      };

      // Depending on global exception filters, FK violation usually returns 500
      // But standard controller might not catch it specifically. 
      // We expect failure.
      await request(app.getHttpServer())
        .post('/buses')
        .send(createDto)
        .expect(400); 
    });
  });

  describe('GET /buses', () => {
    it('should return all buses', async () => {
      const operator = await createOperator();
      await busRepository.save([
        { operatorId: operator.id, plateNumber: 'B1', model: 'M1', seatCapacity: 20 },
        { operatorId: operator.id, plateNumber: 'B2', model: 'M2', seatCapacity: 30 },
      ]);

      const response = await request(app.getHttpServer())
        .get('/buses')
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body[0].operator).toBeDefined(); // relations are loaded in service
    });
  });

  describe('GET /buses/:id', () => {
    it('should return a bus by id', async () => {
      const operator = await createOperator();
      const bus = await busRepository.save({ 
        operatorId: operator.id, 
        plateNumber: 'B-FIND', 
        model: 'Found', 
        seatCapacity: 20 
      });

      const response = await request(app.getHttpServer())
        .get(`/buses/${bus.id}`)
        .expect(200);

      expect(response.body.id).toBe(bus.id);
    });

    it('should return 404 for non-existent bus', async () => {
      await request(app.getHttpServer())
        .get(`/buses/${crypto.randomUUID()}`)
        .expect(404);
    });
  });

  describe('PUT /buses/:id', () => {
    it('should update a bus', async () => {
      const operator = await createOperator();
      const bus = await busRepository.save({ 
        operatorId: operator.id, 
        plateNumber: 'B-UPD', 
        model: 'Old', 
        seatCapacity: 20 
      });

      const response = await request(app.getHttpServer())
        .put(`/buses/${bus.id}`)
        .send({ model: 'New' })
        .expect(200);

      expect(response.body.model).toBe('New');
    });
  });

  describe('DELETE /buses/:id', () => {
    it('should delete a bus', async () => {
      const operator = await createOperator();
      const bus = await busRepository.save({ 
        operatorId: operator.id, 
        plateNumber: 'B-DEL', 
        model: 'Del', 
        seatCapacity: 20 
      });

      await request(app.getHttpServer())
        .delete(`/buses/${bus.id}`)
        .expect(200);

      const found = await busRepository.findOne({ where: { id: bus.id } });
      expect(found).toBeNull();
    });
  });
});
