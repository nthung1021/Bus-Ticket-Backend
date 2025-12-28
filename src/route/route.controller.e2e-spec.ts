import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RouteModule } from './route.module';
import { Route } from '../entities/route.entity';
import { RoutePoint } from '../entities/route-point.entity';
import { Operator } from '../entities/operator.entity';
import { Bus } from '../entities/bus.entity';
import { Trip } from '../entities/trip.entity';
import { testDatabaseConfig } from '../config/test-database.config';
import * as crypto from 'crypto';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

describe('RouteController (e2e)', () => {
  let app: INestApplication;
  let routeRepository: Repository<Route>;
  let operatorRepository: Repository<Operator>;
  
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
        RouteModule,
        TypeOrmModule.forFeature([Operator, Bus, Trip]), // For cleanup
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    routeRepository = moduleFixture.get<Repository<Route>>(getRepositoryToken(Route));
    operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
  });

  afterAll(async () => {
    if (routeRepository) {
        const entities = ['route_points', 'trips', 'buses', 'routes', 'operators'];
        for (const entity of entities) {
            try {
                await routeRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
            } catch (e) {}
        }
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
       const entities = ['route_points', 'trips', 'buses', 'routes', 'operators'];
        for (const entity of entities) {
            try {
                await routeRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
            } catch (e) {}
        }
  });

  async function createOperator() {
    return await operatorRepository.save({
      name: 'E2E Route Op',
      contactEmail: `e2e-route-op-${crypto.randomUUID()}@test.com`,
      contactPhone: '0900000001',
    });
  }

  describe('POST /routes', () => {
    it('should create a new route', async () => {
      const operator = await createOperator();
      const dto = {
        name: 'E2E Route',
        description: 'E2E Desc',
        origin: 'A',
        destination: 'B',
        operatorId: operator.id,
        distanceKm: 100,
        estimatedMinutes: 60,
        points: []
      };

      const response = await request(app.getHttpServer())
        .post('/routes')
        .send(dto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('E2E Route');
    });
  });

  describe('GET /routes', () => {
    it('should return list of routes', async () => {
      const operator = await createOperator();
      await routeRepository.save({
        name: 'Get Route', description: 'Desc', origin: 'A', destination: 'B', operator, distanceKm: 10, estimatedMinutes: 10
      });

      const response = await request(app.getHttpServer())
        .get('/routes')
        .expect(200);

      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /routes/:id', () => {
    it('should return a route details', async () => {
      const operator = await createOperator();
      const route = await routeRepository.save({
        name: 'Single Route', description: 'Desc', origin: 'A', destination: 'B', operator, distanceKm: 10, estimatedMinutes: 10
      });

      const response = await request(app.getHttpServer())
        .get(`/routes/${route.id}`)
        .expect(200);

      expect(response.body.id).toBe(route.id);
    });
  });

  describe('PUT /routes/:id', () => {
    it('should update route', async () => {
      const operator = await createOperator();
      const route = await routeRepository.save({
        name: 'Update Me', description: 'Desc', origin: 'A', destination: 'B', operator, distanceKm: 10, estimatedMinutes: 10
      });

      const response = await request(app.getHttpServer())
        .put(`/routes/${route.id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });
  });

  describe('DELETE /routes/:id', () => {
    it('should delete route', async () => {
      const operator = await createOperator();
      const route = await routeRepository.save({
        name: 'Delete Me', description: 'Desc', origin: 'A', destination: 'B', operator, distanceKm: 10, estimatedMinutes: 10
      });

      await request(app.getHttpServer())
        .delete(`/routes/${route.id}`)
        .expect(200);

      const found = await routeRepository.findOne({ where: { id: route.id } });
      expect(found).toBeNull();
    });
  });
});
