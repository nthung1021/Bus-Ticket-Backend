import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TripsService } from './trips.service';
import { Trip, TripStatus } from '../entities/trip.entity';
import { SeatStatus } from '../entities/seat-status.entity';
import { Bus } from '../entities/bus.entity';
import { Route } from '../entities/route.entity';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('TripsService', () => {
  let service: TripsService;

  const mockTripRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockSeatStatusRepo = {
    count: jest.fn(),
  };

  const mockBusRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockRouteRepo = {
    findOne: jest.fn(),
  };

  const tripId = 'trip-1';
  const routeId = 'route-1';
  const busId = 'bus-1';
  const now = new Date(Date.now() + 60 * 60 * 1000); // 1h in future
  const later = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h in future

  const tripFixture: Trip = {
    id: tripId,
    routeId,
    busId,
    departureTime: now,
    arrivalTime: later,
    basePrice: 100,
    status: TripStatus.SCHEDULED,
    route: {} as any,
    bus: { seatCapacity: 40, operator: { id: 'op-1' } } as any,
    bookings: [],
    seatStatuses: [],
    feedbacks: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: getRepositoryToken(Trip), useValue: mockTripRepo },
        { provide: getRepositoryToken(SeatStatus), useValue: mockSeatStatusRepo },
        { provide: getRepositoryToken(Bus), useValue: mockBusRepo },
        { provide: getRepositoryToken(Route), useValue: mockRouteRepo },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('returns trip when found', async () => {
      mockTripRepo.findOne.mockResolvedValue(tripFixture);

      const result = await service.findOne(tripId);

      expect(mockTripRepo.findOne).toHaveBeenCalledWith({
        where: { id: tripId },
        relations: ['route', 'bus', 'bookings', 'seatStatuses', 'feedbacks'],
      });
      expect(result).toEqual(tripFixture);
    });

    it('throws NotFound when missing', async () => {
      mockTripRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(tripId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates when bus available', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      mockBusRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      jest.spyOn<any, any>(service, 'checkBusAvailability').mockResolvedValue(true);
      mockTripRepo.create.mockReturnValue(tripFixture);
      mockTripRepo.save.mockResolvedValue(tripFixture);

      const dto = {
        routeId,
        busId,
        departureTime: now,
        arrivalTime: later,
      } as any;

      const result = await service.create(dto);

      expect(mockTripRepo.save).toHaveBeenCalled();
      expect(result).toEqual(tripFixture);
    });

    it('throws conflict when bus not available', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      mockBusRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      jest.spyOn<any, any>(service, 'checkBusAvailability').mockResolvedValue(false);

      await expect(
        service.create({
          routeId,
          busId,
          departureTime: now,
          arrivalTime: later,
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates when bus available', async () => {
      mockTripRepo.findOne.mockResolvedValue(tripFixture);
      jest.spyOn<any, any>(service, 'checkBusAvailability').mockResolvedValue(true);
      mockTripRepo.save.mockResolvedValue(tripFixture);

      const result = await service.update(tripId, { departureTime: now, arrivalTime: later } as any);

      expect(mockTripRepo.save).toHaveBeenCalled();
      expect(result).toEqual(tripFixture);
    });

    it('throws conflict when bus unavailable', async () => {
      mockTripRepo.findOne.mockResolvedValue(tripFixture);
      jest.spyOn<any, any>(service, 'checkBusAvailability').mockResolvedValue(false);

      await expect(service.update(tripId, { departureTime: now, arrivalTime: later } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('throws conflict when trip has bookings', async () => {
      mockTripRepo.findOne.mockResolvedValue({ ...tripFixture, bookings: [{}] });

      await expect(service.remove(tripId)).rejects.toThrow(ConflictException);
    });

    it('removes when no bookings', async () => {
      mockTripRepo.findOne.mockResolvedValue(tripFixture);
      mockTripRepo.remove.mockResolvedValue(undefined);

      await service.remove(tripId);

      expect(mockTripRepo.remove).toHaveBeenCalled();
    });
  });

  describe('getAvailableBuses', () => {
    it('filters out booked buses', async () => {
      mockBusRepo.find.mockResolvedValue([{ id: 'bus-1' }, { id: 'bus-2' }]);
      jest.spyOn<any, any>(service, 'getBookedBusIds').mockResolvedValue(['bus-2']);

      const result = await service.getAvailableBuses(now, later);

      expect(result).toEqual(['bus-1']);
    });
  });

  describe('assignBusToRoute', () => {
    it('returns available=true when bus free', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      mockBusRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      jest.spyOn<any, any>(service, 'checkBusAvailability').mockResolvedValue(true);

      const result = await service.assignBusToRoute(routeId, busId, now, later);

      expect(result.available).toBe(true);
    });

    it('returns available=false when busy', async () => {
      mockRouteRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      mockBusRepo.findOne.mockResolvedValue({ operatorId: 'op-1' });
      jest.spyOn<any, any>(service, 'checkBusAvailability').mockResolvedValue(false);

      const result = await service.assignBusToRoute(routeId, busId, now, later);

      expect(result.available).toBe(false);
    });
  });

  describe('getTripById', () => {
    it('returns mapped trip', async () => {
      const tripEntity = {
        ...tripFixture,
        route: { id: 'r1', origin: 'A', destination: 'B', distanceKm: 10, estimatedMinutes: 30 },
        bus: { id: busId, operator: { id: 'op-1', name: 'Op' }, model: 'M', plateNumber: 'PN', seatCapacity: 10, amenities: [] },
        arrivalTime: later,
        departureTime: now,
      };
      mockTripRepo.findOne.mockResolvedValue(tripEntity);
      mockSeatStatusRepo.count.mockResolvedValue(0);

      const result = await service.getTripById(tripId);

      expect(result.tripId).toEqual(tripId);
      expect(result.route.origin).toEqual('A');
    });

    it('throws NotFound when missing', async () => {
      mockTripRepo.findOne.mockResolvedValue(null);

      await expect(service.getTripById(tripId)).rejects.toThrow(NotFoundException);
    });
  });
});
