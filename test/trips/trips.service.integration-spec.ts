import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripsService } from '../../src/trips/trips.service';
import { Trip, TripStatus } from '../../src/entities/trip.entity';
import { Route } from '../../src/entities/route.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { Seat, SeatType } from '../../src/entities/seat.entity';
import { Booking } from '../../src/entities/booking.entity';
import { SeatLayout, SeatLayoutType } from '../../src/entities/seat-layout.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import * as crypto from 'crypto';
import { NotFoundException } from '@nestjs/common';

describe('TripsService (integration)', () => {
  let service: TripsService;
  let moduleRef: TestingModule;
  let tripRepository: Repository<Trip>;
  let routeRepository: Repository<Route>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let seatStatusRepository: Repository<SeatStatus>;
  let seatLayoutRepository: Repository<SeatLayout>;
  let seatRepository: Repository<Seat>;

  const testOperator = {
    name: 'Trips Op',
    contactEmail: `trips-${crypto.randomUUID()}@test.com`,
    contactPhone: '0900000000'
  };

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
          Trip,
          Route,
          Bus,
          Operator,
          SeatStatus,
          Seat,
          Booking,
          SeatLayout
        ]),
      ],
      providers: [TripsService],
    }).compile();

    moduleRef = module;
    service = module.get<TripsService>(TripsService);
    tripRepository = module.get<Repository<Trip>>(getRepositoryToken(Trip));
    routeRepository = module.get<Repository<Route>>(getRepositoryToken(Route));
    busRepository = module.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
    seatStatusRepository = module.get<Repository<SeatStatus>>(getRepositoryToken(SeatStatus));
    seatLayoutRepository = module.get<Repository<SeatLayout>>(getRepositoryToken(SeatLayout));
    seatRepository = module.get<Repository<Seat>>(getRepositoryToken(Seat));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(async () => {
    const entities = ['seat_status', 'bookings', 'trips', 'seats', 'seat_layouts', 'buses', 'routes', 'operators'];
    for (const entity of entities) {
      try {
        await tripRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {}
    }
  });

  async function setupBaseEntities() {
    const operator = await operatorRepository.save(testOperator);
    const route = await routeRepository.save({
      name: 'Route A-B',
      description: 'Test Route Description',
      origin: 'City A',
      destination: 'City B',
      distanceKm: 100,
      estimatedMinutes: 120,
      operator
    });
    const bus = await busRepository.save({
      plateNumber: `TRIP-${crypto.randomUUID()}`,
      model: 'Luxury Bus',
      seatCapacity: 40,
      operator
    });

    const seat = await seatRepository.save({
      busId: bus.id,
      seatCode: 'A1',
      seatType: SeatType.NORMAL
    });

    await seatLayoutRepository.save({
      busId: bus.id,
      layoutType: SeatLayoutType.STANDARD_2X2,
      totalRows: 10,
      seatsPerRow: 4,
      layoutConfig: {
        seats: [
          { id: seat.id, code: 'A1', type: 'normal' } as any
        ],
        aisles: [2],
        dimensions: {
          totalWidth: 500,
          totalHeight: 1000,
          seatWidth: 80,
          seatHeight: 80,
          aisleWidth: 100,
          rowSpacing: 20
        }
      },
      seatPricing: {
        basePrice: 0,
        seatTypePrices: { normal: 0, vip: 0, business: 0 }
      }
    });

    return { operator, route, bus };
  }

  describe('create', () => {
    it('should create a trip', async () => {
      const { route, bus } = await setupBaseEntities();
      const createDto = {
          routeId: route.id,
          busId: bus.id,
          departureTime: new Date(Date.now() + 86400000).toISOString(), // tomorrow
          arrivalTime: new Date(Date.now() + 90000000).toISOString(),
          basePrice: 50000
      };

      const trip = await service.create(createDto);
      expect(trip.id).toBeDefined();
      expect(trip.status).toBe(TripStatus.SCHEDULED);
    });

    it('should throw ConflictException if bus is already booked', async () => {
      const { route, bus } = await setupBaseEntities();
      const departure = new Date(Date.now() + 86400000);
      const arrival = new Date(Date.now() + 90000000);
      
      // Create first trip
      await service.create({
        routeId: route.id,
        busId: bus.id,
        departureTime: departure.toISOString(),
        arrivalTime: arrival.toISOString(),
        basePrice: 50000
      });
    });
  });

  describe('search', () => {
    it('should return trips matching criteria', async () => {
      const { route, bus } = await setupBaseEntities();
      const departure = new Date();
      departure.setDate(departure.getDate() + 1); // Tomorrow
      
      await service.create({
        routeId: route.id,
        busId: bus.id,
        departureTime: departure.toISOString(),
        arrivalTime: new Date(departure.getTime() + 3600000).toISOString(),
        basePrice: 60000
      });

      const result = await service.search({
        origin: 'City A',
        destination: 'City B',
        date: departure.toISOString().split('T')[0]
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].route.origin).toBe('City A');
    });
  });

  describe('checkBusAvailability', () => {
    it('should return false if bus is busy', async () => {
      const { route, bus } = await setupBaseEntities();
      const start = new Date(Date.now() + 100000);
      const end = new Date(Date.now() + 3700000);

      await service.create({
        routeId: route.id,
        busId: bus.id,
        departureTime: start.toISOString(),
        arrivalTime: end.toISOString(),
        basePrice: 10
      });

      const isAvailable = await (service as any).checkBusAvailability(bus.id, start, end);
      expect(isAvailable).toBe(false);
    });

    it('should return true if bus is free', async () => {
      const { bus } = await setupBaseEntities();
      const start = new Date(Date.now() + 100000);
      const end = new Date(Date.now() + 3700000);

      const isAvailable = await (service as any).checkBusAvailability(bus.id, start, end);
      expect(isAvailable).toBe(true);
    });
  });

  describe('getTripById', () => {
    it('should return trip details', async () => {
      const { route, bus } = await setupBaseEntities();
      const created = await service.create({
        routeId: route.id,
        busId: bus.id,
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 3600000).toISOString(),
        basePrice: 100
      });

      const found = await service.getTripById(created.id);
      expect(found.tripId).toBe(created.id);
    });

    it('should throw if not found', async () => {
      await expect(service.getTripById(crypto.randomUUID())).rejects.toThrow(NotFoundException);
    });
  });
});
