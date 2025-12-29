import { Test, TestingModule } from '@nestjs/testing';
import { TripsController } from '../../src/trips/trips.controller';
import { TripsService } from '../../src/trips/trips.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TripsController', () => {
  let controller: TripsController;
  let service: TripsService;

  const mockService = {
    search: jest.fn(),
    getTripById: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getAvailableBuses: jest.fn(),
    getBusSchedule: jest.fn(),
    getRouteSchedule: jest.fn(),
    assignBusToRoute: jest.fn(),
    getConflictingTrips: jest.fn(),
  };

  const tripId = 'trip-1';
  const trip = { id: tripId } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [
        {
          provide: TripsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<TripsController>(TripsController);
    service = module.get<TripsService>(TripsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('delegates to service', async () => {
      mockService.search.mockResolvedValue({ data: [], pagination: {} });

      const result = await controller.search({ origin: 'A', destination: 'B' });

      expect(service.search).toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: [], pagination: {} });
    });
  });

  describe('getTripById', () => {
    it('returns trip when found', async () => {
      mockService.getTripById.mockResolvedValue(trip);

      const result = await controller.getTripById(tripId);

      expect(service.getTripById).toHaveBeenCalledWith(tripId);
      expect(result.data).toEqual(trip);
    });

    it('throws NotFound when missing', async () => {
      mockService.getTripById.mockResolvedValue(null);

      await expect(controller.getTripById(tripId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('delegates to service', async () => {
      mockService.create.mockResolvedValue(trip);

      const result = await controller.create({} as any);

      expect(service.create).toHaveBeenCalled();
      expect(result).toEqual(trip);
    });
  });

  describe('findAll', () => {
    it('returns all trips', async () => {
      mockService.findAll.mockResolvedValue([trip]);

      const result = await controller.findAll();

      expect(result).toEqual([trip]);
    });
  });

  describe('findOne (admin)', () => {
    it('returns trip', async () => {
      mockService.findOne.mockResolvedValue(trip);

      const result = await controller.findOne(tripId);

      expect(service.findOne).toHaveBeenCalledWith(tripId);
      expect(result).toEqual(trip);
    });
  });

  describe('update', () => {
    it('delegates update', async () => {
      mockService.update.mockResolvedValue(trip);

      const result = await controller.update(tripId, {} as any);

      expect(service.update).toHaveBeenCalledWith(tripId, {});
      expect(result).toEqual(trip);
    });
  });

  describe('remove', () => {
    it('delegates remove', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(tripId);

      expect(service.remove).toHaveBeenCalledWith(tripId);
    });
  });

  describe('getAvailableBuses', () => {
    it('throws BadRequest when missing dates', async () => {
      await expect(
        controller.getAvailableBuses({ departureTime: undefined, arrivalTime: undefined } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns available buses', async () => {
      mockService.getAvailableBuses.mockResolvedValue(['bus-1']);

      const result = await controller.getAvailableBuses({
        departureTime: new Date().toISOString(),
        arrivalTime: new Date(Date.now() + 1000).toISOString(),
      } as any);

      expect(result).toEqual(['bus-1']);
    });
  });

  describe('getBusSchedule', () => {
    it('throws BadRequest when missing dates', async () => {
      await expect(controller.getBusSchedule('bus-1', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('delegates when params valid', async () => {
      mockService.getBusSchedule.mockResolvedValue([trip]);
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 1000).toISOString();

      const result = await controller.getBusSchedule('bus-1', { startDate: start, endDate: end } as any);

      expect(service.getBusSchedule).toHaveBeenCalled();
      expect(result).toEqual([trip]);
    });
  });

  describe('getRouteSchedule', () => {
    it('throws BadRequest when missing dates', async () => {
      await expect(controller.getRouteSchedule('route-1', {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkBusAvailability', () => {
    it('returns availability flag', async () => {
      mockService.getAvailableBuses.mockResolvedValue(['bus-2']); // bus-1 is available
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 1000).toISOString();

      const result = await controller.checkBusAvailability('bus-1', { departureTime: start, arrivalTime: end } as any);

      expect(result.available).toBe(true);
    });
  });

  describe('assignBusToRoute', () => {
    it('delegates to service', async () => {
      const response = { success: true, message: 'ok' };
      mockService.assignBusToRoute.mockResolvedValue(response);

      const result = await controller.assignBusToRoute({} as any);

      expect(service.assignBusToRoute).toHaveBeenCalled();
      expect(result).toEqual(response);
    });
  });

  describe('getConflictingTrips', () => {
    it('delegates to service', async () => {
      mockService.getConflictingTrips.mockResolvedValue([trip]);
      const start = new Date().toISOString();
      const end = new Date(Date.now() + 1000).toISOString();

      const result = await controller.getConflictingTrips('bus-1', { departureTime: start, arrivalTime: end } as any);

      expect(service.getConflictingTrips).toHaveBeenCalled();
      expect(result).toEqual([trip]);
    });
  });
});
