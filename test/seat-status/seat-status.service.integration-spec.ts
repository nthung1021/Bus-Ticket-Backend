import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatStatusService } from '../../src/seat-status/seat-status.service';
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

describe('SeatStatusService (integration)', () => {
    let service: SeatStatusService;
    let moduleRef: TestingModule;
    let seatStatusRepository: Repository<SeatStatus>;
    let tripRepository: Repository<Trip>;
    let seatRepository: Repository<Seat>;
    let busRepository: Repository<Bus>;
    let operatorRepository: Repository<Operator>;
    let routeRepository: Repository<Route>;

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
            providers: [SeatStatusService],
        }).compile();

        moduleRef = module;
        service = module.get<SeatStatusService>(SeatStatusService);
        seatStatusRepository = module.get<Repository<SeatStatus>>(getRepositoryToken(SeatStatus));
        tripRepository = module.get<Repository<Trip>>(getRepositoryToken(Trip));
        seatRepository = module.get<Repository<Seat>>(getRepositoryToken(Seat));
        busRepository = module.get<Repository<Bus>>(getRepositoryToken(Bus));
        operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
        routeRepository = module.get<Repository<Route>>(getRepositoryToken(Route));
    });

    afterAll(async () => {
        if (moduleRef) {
            await moduleRef.close();
        }
    });

    beforeEach(async () => {
        // Cleanup with raw SQL
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
            name: 'SeatStatus Op',
            contactEmail: `ss-op-${crypto.randomUUID()}@test.com`,
            contactPhone: '0901234567'
        });

        const bus = await busRepository.save({
            operator,
            plateNumber: `SS-BUS-${crypto.randomUUID()}`,
            model: 'Test Bus',
            seatCapacity: 10
        });

        const seat1 = await seatRepository.save({ bus, seatCode: 'A1', seatType: SeatType.NORMAL });
        const seat2 = await seatRepository.save({ bus, seatCode: 'A2', seatType: SeatType.NORMAL });

        const route = await routeRepository.save({
            name: 'SS Route',
            description: 'Desc',
            operator,
            origin: 'A',
            destination: 'B',
            distanceKm: 100
        });

        const trip = await tripRepository.save({
            route,
            bus,
            departureTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            arrivalTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
            basePrice: 50000
        });

        return { operator, bus, seat1, seat2, route, trip };
    }

    describe('create', () => {
        it('should create a seat status', async () => {
            const { trip, seat1 } = await setupData();

            const result = await service.create({
                tripId: trip.id,
                seatId: seat1.id,
                state: SeatState.AVAILABLE
            });

            expect(result.id).toBeDefined();
            expect(result.tripId).toBe(trip.id);
            expect(result.seatId).toBe(seat1.id);
            expect(result.state).toBe(SeatState.AVAILABLE);
        });
    });

    describe('findBySeatIdAndTripId', () => {
        it('should return seat status', async () => {
            const { trip, seat1 } = await setupData();
            await service.create({
                tripId: trip.id,
                seatId: seat1.id,
                state: SeatState.LOCKED
            });

            const found = await service.findBySeatIdAndTripId(seat1.id, trip.id);
            expect(found).toBeDefined();
            expect(found?.state).toBe(SeatState.LOCKED);
        });
    });

    describe('update', () => {
        it('should update state', async () => {
            const { trip, seat1 } = await setupData();
            const status = await service.create({
                tripId: trip.id,
                seatId: seat1.id,
                state: SeatState.AVAILABLE
            });

            const updated = await service.update(status.id, {
                state: SeatState.BOOKED
            });

            expect(updated?.state).toBe(SeatState.BOOKED);
        });
    });

    describe('getLockedSeats', () => {
        it('should return only locked seats', async () => {
            const { trip, seat1, seat2 } = await setupData();
            await service.create({ tripId: trip.id, seatId: seat1.id, state: SeatState.LOCKED });
            await service.create({ tripId: trip.id, seatId: seat2.id, state: SeatState.AVAILABLE });

            const locked = await service.getLockedSeats(trip.id);
            expect(locked.length).toBe(1);
            expect(locked[0].seatId).toBe(seat1.id);
        });
    });
    
    describe('remove', () => {
        it('should remove seat status', async () => {
            const { trip, seat1 } = await setupData();
            const status = await service.create({ tripId: trip.id, seatId: seat1.id, state: SeatState.AVAILABLE });

            await service.remove(status.id);
            const found = await seatStatusRepository.findOne({ where: { id: status.id } });
            expect(found).toBeNull();
        });
    });
});
