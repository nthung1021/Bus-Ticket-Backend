import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatStatusService } from '../../src/seat-status/seat-status.service';
import { SeatStatusController } from '../../src/seat-status/seat-status.controller';
import { SeatStatus, SeatState } from '../../src/entities/seat-status.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Seat, SeatType } from '../../src/entities/seat.entity';
import { Booking } from '../../src/entities/booking.entity';
import { User } from '../../src/entities/user.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Route } from '../../src/entities/route.entity';
import { Operator } from '../../src/entities/operator.entity';
import { SeatLayout } from '../../src/entities/seat-layout.entity';
import { PassengerDetail } from '../../src/entities/passenger-detail.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { BookingModificationHistory } from '../../src/entities/booking-modification-history.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import * as crypto from 'crypto';

describe('SeatStatusController (e2e)', () => {
    let app: INestApplication;
    let seatStatusRepository: Repository<SeatStatus>;
    let tripRepository: Repository<Trip>;
    let seatRepository: Repository<Seat>;
    let busRepository: Repository<Bus>;
    let operatorRepository: Repository<Operator>;
    let routeRepository: Repository<Route>;

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
                TypeOrmModule.forFeature([
                    SeatStatus,
                    Trip,
                    Seat,
                    Booking,
                    User,
                    Bus,
                    Route,
                    Operator,
                    SeatLayout,
                    PassengerDetail,
                    AuditLog,
                    BookingModificationHistory
                ]),
            ],
            controllers: [SeatStatusController],
            providers: [SeatStatusService],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe({ transform: true }));
        await app.init();

        seatStatusRepository = moduleFixture.get<Repository<SeatStatus>>(getRepositoryToken(SeatStatus));
        tripRepository = moduleFixture.get<Repository<Trip>>(getRepositoryToken(Trip));
        seatRepository = moduleFixture.get<Repository<Seat>>(getRepositoryToken(Seat));
        busRepository = moduleFixture.get<Repository<Bus>>(getRepositoryToken(Bus));
        operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
        routeRepository = moduleFixture.get<Repository<Route>>(getRepositoryToken(Route));
    });

    afterAll(async () => {
        if (seatStatusRepository) {
             const entities = [
                'booking_modification_history',
                'audit_logs',
                'passenger_details',
                'seat_status',
                'bookings',
                'users',
                'seats',
                'trips',
                'buses',
                'seat_layouts',
                'routes',
                'operators'
            ];
            for (const entity of entities) {
                try {
                    await seatStatusRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
                } catch (e) {}
            }
        }
        if (app) {
            await app.close();
        }
    });

    beforeEach(async () => {
         const entities = [
            'booking_modification_history',
            'audit_logs',
            'passenger_details',
            'seat_status',
            'bookings',
            'users',
            'seats',
            'trips',
            'buses',
            'seat_layouts',
            'routes',
            'operators'
        ];
        for (const entity of entities) {
            try {
                await seatStatusRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
            } catch (e) {}
        }
    });

    async function setupData() {
        const operator = await operatorRepository.save({
            name: 'SS Ctrl Op',
            contactEmail: `ss-ctrl-${crypto.randomUUID()}@test.com`,
            contactPhone: '0901234444'
        });

        const bus = await busRepository.save({
            operator,
            plateNumber: `SS-CTRL-${crypto.randomUUID()}`,
            model: 'Test Bus Ctrl',
            seatCapacity: 10
        });

        const seat1 = await seatRepository.save({ bus, seatCode: 'B1', seatType: SeatType.NORMAL });

        const route = await routeRepository.save({
            name: 'SS Ctrl Route',
            description: 'Desc',
            operator,
            origin: 'C',
            destination: 'D',
            distanceKm: 200
        });

        const trip = await tripRepository.save({
            route,
            bus,
            departureTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
            arrivalTime: new Date(Date.now() + 50 * 60 * 60 * 1000),
            basePrice: 60000
        });

        return { operator, bus, seat1, route, trip };
    }

    describe('POST /seat-status', () => {
        it('should create seat status', async () => {
            const { trip, seat1 } = await setupData();
            const dto = {
                tripId: trip.id,
                seatId: seat1.id,
                state: SeatState.LOCKED
            };

            const response = await request(app.getHttpServer())
                .post('/seat-status')
                .send(dto)
                .expect(201);

            expect(response.body.state).toBe(SeatState.LOCKED);
        });
    });

    describe('GET /seat-status/trip/:tripId/locked', () => {
        it('should return locked seats', async () => {
             const { trip, seat1 } = await setupData();
             await request(app.getHttpServer())
                .post('/seat-status')
                .send({ tripId: trip.id, seatId: seat1.id, state: SeatState.LOCKED })
                .expect(201);
            
             const response = await request(app.getHttpServer())
                .get(`/seat-status/trip/${trip.id}/locked`)
                .expect(200);

             expect(response.body.length).toBe(1);
        });
    });

    describe('PATCH /seat-status/:id', () => {
        it('should update seat status', async () => {
            const { trip, seat1 } = await setupData();
            const createRes = await request(app.getHttpServer())
                .post('/seat-status')
                .send({ tripId: trip.id, seatId: seat1.id, state: SeatState.AVAILABLE });
            
            const id = createRes.body.id;

            const response = await request(app.getHttpServer())
                .patch(`/seat-status/${id}`)
                .send({ state: SeatState.BOOKED })
                .expect(200);

            expect(response.body.state).toBe(SeatState.BOOKED);
        });
    });

    describe('DELETE /seat-status/:id', () => {
        it('should delete seat status', async () => {
            const { trip, seat1 } = await setupData();
            const createRes = await request(app.getHttpServer())
                .post('/seat-status')
                .send({ tripId: trip.id, seatId: seat1.id, state: SeatState.AVAILABLE });
            
            const id = createRes.body.id;

            await request(app.getHttpServer())
                .delete(`/seat-status/${id}`)
                .expect(204);

            await request(app.getHttpServer())
                .get(`/seat-status/seat/${seat1.id}/trip/${trip.id}`)
                .expect(404);
        });
    });
});
