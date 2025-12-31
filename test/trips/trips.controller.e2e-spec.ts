import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripsModule } from '../../src/trips/trips.module';
import { Trip, TripStatus } from '../../src/entities/trip.entity';
import { Route } from '../../src/entities/route.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { User } from '../../src/entities/user.entity';
import { Seat, SeatType } from '../../src/entities/seat.entity';
import { SeatLayout, SeatLayoutType } from '../../src/entities/seat-layout.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import * as crypto from 'crypto';
import cookieParser from 'cookie-parser';

describe('TripsController (e2e)', () => {
	let app: INestApplication;
	let tripRepository: Repository<Trip>;
	let routeRepository: Repository<Route>;
	let busRepository: Repository<Bus>;
	let operatorRepository: Repository<Operator>;
	let seatLayoutRepository: Repository<SeatLayout>;
	let seatRepository: Repository<Seat>;

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
				TripsModule,
				TypeOrmModule.forFeature([User, Route, Bus, Operator, SeatStatus, SeatLayout, Seat]),
			],
		}).compile();

		app = moduleFixture.createNestApplication();
		app.use(cookieParser());
		app.useGlobalPipes(new ValidationPipe({ transform: true }));
		await app.init();

		tripRepository = moduleFixture.get<Repository<Trip>>(getRepositoryToken(Trip));
		routeRepository = moduleFixture.get<Repository<Route>>(getRepositoryToken(Route));
		busRepository = moduleFixture.get<Repository<Bus>>(getRepositoryToken(Bus));
		operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
		seatLayoutRepository = moduleFixture.get<Repository<SeatLayout>>(getRepositoryToken(SeatLayout));
		seatRepository = moduleFixture.get<Repository<Seat>>(getRepositoryToken(Seat));
	});

	afterAll(async () => {
		if (tripRepository) {
			const entities = ['seat_status', 'bookings', 'trips', 'buses', 'routes', 'operators', 'users'];
			for (const entity of entities) {
				try {
					await tripRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
				} catch (e) {}
			}
		}
		if (app) {
			await app.close();
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

	async function setupEntities() {
		const operator = await operatorRepository.save({
			name: 'E2E Trip Op',
			contactEmail: `e2etrip-${crypto.randomUUID()}@test.com`,
			contactPhone: '0988888888'
		});

		const route = await routeRepository.save({
			name: 'E2E Route',
			description: 'E2E Test Route Description',
			origin: 'Hanoi',
			destination: 'Da Nang',
			distanceKm: 800,
			estimatedMinutes: 600,
			operatorId: operator.id
		});

		const bus = await busRepository.save({
			plateNumber: `E2ETRIP-${crypto.randomUUID()}`,
			model: 'E2E Bus',
			seatCapacity: 40,
			operatorId: operator.id
		});

		const seat = await seatRepository.save({
			busId: bus.id,
			seatCode: '1A',
			seatType: SeatType.NORMAL
		});

		await seatLayoutRepository.save({
			busId: bus.id,
			layoutType: SeatLayoutType.STANDARD_2X2,
			totalRows: 10,
			seatsPerRow: 4,
			layoutConfig: {
				seats: [
					{ id: seat.id, code: '1A', type: 'normal' } as any
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

	describe('POST /trips', () => {
		it('should create a new trip', async () => {
			const { route, bus } = await setupEntities();
			const dto = {
				routeId: route.id,
				busId: bus.id,
				departureTime: new Date(Date.now() + 86400000).toISOString(),
				arrivalTime: new Date(Date.now() + 90000000).toISOString(),
				basePrice: 100000,
				status: TripStatus.SCHEDULED
			};

			const response = await request(app.getHttpServer())
				.post('/trips')
				.send(dto)
				.expect(201);

			expect(response.body.id).toBeDefined();
			expect(response.body.status).toBe(TripStatus.SCHEDULED);
		});
	});

	describe('GET /trips/search', () => {
		it('should search trips', async () => {
			const { route, bus } = await setupEntities();
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			const dateStr = tomorrow.toISOString().split('T')[0];

			await tripRepository.save({
				route,
				bus,
				departureTime: tomorrow,
				arrivalTime: new Date(tomorrow.getTime() + 3600000),
				basePrice: 100000,
				status: TripStatus.SCHEDULED
			});

			const response = await request(app.getHttpServer())
				.get('/trips/search')
				.query({ origin: 'Hanoi', destination: 'Da Nang', date: dateStr })
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.length).toBeGreaterThan(0);
		});

		it('should fail without origin/destination', async () => {
			await request(app.getHttpServer())
				.get('/trips/search')
				.expect(400);
		});
	});

	describe('GET /trips/:tripId', () => {
		it('should get trip details', async () => {
			const { route, bus } = await setupEntities();
			const trip = await tripRepository.save({
				route,
				bus,
				departureTime: new Date(),
				arrivalTime: new Date(),
				basePrice: 50000,
				status: TripStatus.SCHEDULED
			});

			const response = await request(app.getHttpServer())
				.get(`/trips/${trip.id}`)
				.expect(200);

			expect(response.body.success).toBe(true);
			expect(response.body.data.tripId).toBe(trip.id);
		});
	});

	describe('POST /trips/assign-bus', () => {
		it('should check conflicts and assign', async () => {
			const { route, bus } = await setupEntities();
			const start = new Date(Date.now() + 100000).toISOString();
			const end = new Date(Date.now() + 3700000).toISOString();

			const response = await request(app.getHttpServer())
				.post('/trips/assign-bus')
				.send({
					routeId: route.id,
					busId: bus.id,
					departureTime: start,
					arrivalTime: end
				})
				.expect(201);

			expect(response.body.success).toBe(true);
		});
	});
});
