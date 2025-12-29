import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RouteService } from '../../src/route/route.service';
import { Route } from '../../src/entities/route.entity';
import { RoutePoint, PointType } from '../../src/entities/route-point.entity';
import { Operator } from '../../src/entities/operator.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Trip } from '../../src/entities/trip.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('RouteService (integration)', () => {
  let service: RouteService;
  let moduleRef: TestingModule;
  let routeRepository: Repository<Route>;
  let routePointRepository: Repository<RoutePoint>;
  let operatorRepository: Repository<Operator>;

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
        TypeOrmModule.forFeature([Route, RoutePoint, Operator, Bus, Trip]),
      ],
      providers: [RouteService],
    }).compile();

    moduleRef = module;
    service = module.get<RouteService>(RouteService);
    routeRepository = module.get<Repository<Route>>(getRepositoryToken(Route));
    routePointRepository = module.get<Repository<RoutePoint>>(getRepositoryToken(RoutePoint));
    operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(async () => {
    // Determine table names - order matters for FK
    const entities = ['route_points', 'trips', 'buses', 'routes', 'operators'];
    for (const entity of entities) {
      try {
        await routeRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {
        // Ignored
      }
    }
  });

  async function createOperator() {
    return await operatorRepository.save({
      name: 'Route Test Operator',
      contactEmail: `route-op-${crypto.randomUUID()}@test.com`,
      contactPhone: '0901112233',
    });
  }

  describe('create', () => {
    it('should create a route with points', async () => {
      const operator = await createOperator();
      const createDto = {
        name: 'Integration Route',
        description: 'Test Description',
        origin: 'City A',
        destination: 'City B',
        operatorId: operator.id,
        distanceKm: 150,
        estimatedMinutes: 120,
        points: [
          {
            name: 'Stop 1',
            latitude: 10.123,
            longitude: 106.123,
            order: 1,
            type: PointType.PICKUP,
          },
          {
            name: 'Stop 2',
            latitude: 10.456,
            longitude: 106.456,
            order: 2,
            type: PointType.DROPOFF,
          },
        ],
      };

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.points).toHaveLength(2);
      expect(result.operatorId).toBe(operator.id);
    });
  });

  describe('findAll', () => {
    it('should return all routes', async () => {
      const operator = await createOperator();
      await service.create({
        name: 'Route 1', description: 'D1', origin: 'A', destination: 'B', operatorId: operator.id, distanceKm: 10, estimatedMinutes: 10
      });
      await service.create({
        name: 'Route 2', description: 'D2', origin: 'C', destination: 'D', operatorId: operator.id, distanceKm: 20, estimatedMinutes: 20
      });

      const result = await service.findAll();
      
      expect(result).toHaveLength(2);
      expect(result[0].trips).toBeDefined(); 
    });
  });

  describe('findOne', () => {
    it('should return a route with included points', async () => {
      const operator = await createOperator();
      const created = await service.create({
        name: 'Single Route', description: 'Desc', origin: 'X', destination: 'Y', operatorId: operator.id, distanceKm: 50, estimatedMinutes: 60,
        points: [{ name: 'P1', latitude: 1, longitude: 1, order: 1, type: PointType.BOTH }]
      });

      const result = await service.findOne(created.id);
      
      expect(result.id).toBe(created.id);
      expect(result.points).toHaveLength(1);
      expect(result.points[0].name).toBe('P1');
    });

    it('should throw NotFoundException if route not found', async () => {
      await expect(service.findOne(crypto.randomUUID())).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update route details and points', async () => {
      const operator = await createOperator();
      const created = await service.create({
        name: 'Old Name', description: 'Old', origin: 'A', destination: 'B', operatorId: operator.id, distanceKm: 1, estimatedMinutes: 1,
        points: [{ name: 'Old Point', latitude: 1, longitude: 1, order: 1, type: PointType.PICKUP }]
      });

      const updateDto = {
        name: 'New Name',
        points: [
          { name: 'New Point', latitude: 2, longitude: 2, order: 1, type: PointType.DROPOFF }
        ]
      };

      const result = await service.update(created.id, updateDto);

      expect(result.name).toBe('New Name');
      // The update implementation replaces all points
      expect(result.points).toHaveLength(1);
      expect(result.points[0].name).toBe('New Point');
    });
  });

  describe('remove', () => {
    it('should remove route and its points', async () => {
      const operator = await createOperator();
      const created = await service.create({
        name: 'Delete Me', description: 'D', origin: 'A', destination: 'B', operatorId: operator.id, distanceKm: 1, estimatedMinutes: 1,
        points: [{ name: 'P1', latitude: 1, longitude: 1, order: 1, type: PointType.BOTH }]
      });

      await service.remove(created.id);

      const foundRoute = await routeRepository.findOne({ where: { id: created.id } });
      const foundPoints = await routePointRepository.find({ where: { routeId: created.id } });

      expect(foundRoute).toBeNull();
      expect(foundPoints).toHaveLength(0);
    });
  });

  describe('addPoint', () => {
    it('should add a point to existing route', async () => {
      const operator = await createOperator();
      const created = await service.create({
        name: 'Add Point Tests', description: 'D', origin: 'A', destination: 'B', operatorId: operator.id, distanceKm: 1, estimatedMinutes: 1
      });

      const newPoint = await service.addPoint(created.id, {
        name: 'Added Point', latitude: 5, longitude: 5, order: 1, type: PointType.PICKUP
      });

      expect(newPoint.id).toBeDefined();
      expect(newPoint.routeId).toBe(created.id);
    });
  });
});
