import { Test, TestingModule } from '@nestjs/testing';
import { SeatStatusController, CreateSeatStatusDto, UpdateSeatStatusDto } from './seat-status.controller';
import { SeatStatusService } from './seat-status.service';
import { SeatStatus, SeatState } from '../entities/seat-status.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('SeatStatusController', () => {
  let controller: SeatStatusController;
  let service: SeatStatusService;

  const mockService = {
    findBySeatId: jest.fn(),
    findBySeatIdAndTripId: jest.fn(),
    findByTripId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getLockedSeats: jest.fn(),
    getBookedSeats: jest.fn(),
    getAvailableSeats: jest.fn(),
  };

  const id = 'status-1';
  const seatStatusFixture: SeatStatus = {
    id,
    tripId: 'trip-1',
    seatId: 'seat-1',
    bookingId: null,
    state: SeatState.AVAILABLE,
    lockedUntil: null,
    trip: {} as any,
    seat: {} as any,
    booking: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatStatusController],
      providers: [
        {
          provide: SeatStatusService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SeatStatusController>(SeatStatusController);
    service = module.get<SeatStatusService>(SeatStatusService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findBySeatId', () => {
    it('returns seat statuses', async () => {
      mockService.findBySeatId.mockResolvedValue([seatStatusFixture]);

      const result = await controller.findBySeatId('seat-1');

      expect(service.findBySeatId).toHaveBeenCalledWith('seat-1');
      expect(result).toEqual([seatStatusFixture]);
    });

    it('throws NotFound when empty', async () => {
      mockService.findBySeatId.mockResolvedValue([]);

      await expect(controller.findBySeatId('seat-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySeatIdAndTripId', () => {
    it('returns seat status', async () => {
      mockService.findBySeatIdAndTripId.mockResolvedValue(seatStatusFixture);

      const result = await controller.findBySeatIdAndTripId('seat-1', 'trip-1');

      expect(service.findBySeatIdAndTripId).toHaveBeenCalledWith('seat-1', 'trip-1');
      expect(result).toEqual(seatStatusFixture);
    });

    it('throws NotFound when missing', async () => {
      mockService.findBySeatIdAndTripId.mockResolvedValue(null);

      await expect(controller.findBySeatIdAndTripId('seat-1', 'trip-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByTripId', () => {
    it('returns seat statuses', async () => {
      mockService.findByTripId.mockResolvedValue([seatStatusFixture]);

      const result = await controller.findByTripId('trip-1');

      expect(service.findByTripId).toHaveBeenCalledWith('trip-1');
      expect(result).toEqual([seatStatusFixture]);
    });

    it('throws NotFound when empty', async () => {
      mockService.findByTripId.mockResolvedValue([]);

      await expect(controller.findByTripId('trip-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a seat status', async () => {
      const dto: CreateSeatStatusDto = { seatId: 'seat-1', tripId: 'trip-1', state: SeatState.AVAILABLE };
      mockService.create.mockResolvedValue(seatStatusFixture);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(seatStatusFixture);
    });

    it('wraps service errors in BadRequest', async () => {
      mockService.create.mockRejectedValue(new Error('fail'));

      await expect(controller.create({} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('updates seat status', async () => {
      const dto: UpdateSeatStatusDto = { state: SeatState.BOOKED };
      const updated = { ...seatStatusFixture, ...dto };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(updated);
    });

    it('throws NotFound when service returns null', async () => {
      mockService.update.mockResolvedValue(null);

      await expect(controller.update(id, {} as any)).rejects.toThrow(NotFoundException);
    });

    it('wraps service errors in BadRequest', async () => {
      mockService.update.mockRejectedValue(new Error('fail'));

      await expect(controller.update(id, {} as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('removes when service returns true', async () => {
      mockService.remove.mockResolvedValue(true);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });

    it('throws NotFound when service returns false', async () => {
      mockService.remove.mockResolvedValue(false);

      await expect(controller.remove(id)).rejects.toThrow(NotFoundException);
    });

    it('wraps service errors in BadRequest', async () => {
      mockService.remove.mockRejectedValue(new Error('fail'));

      await expect(controller.remove(id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLockedSeats', () => {
    it('returns locked seats', async () => {
      mockService.getLockedSeats.mockResolvedValue([seatStatusFixture]);

      const result = await controller.getLockedSeats('trip-1');

      expect(service.getLockedSeats).toHaveBeenCalledWith('trip-1');
      expect(result).toEqual([seatStatusFixture]);
    });
  });

  describe('getBookedSeats', () => {
    it('returns booked seats', async () => {
      mockService.getBookedSeats.mockResolvedValue([seatStatusFixture]);

      const result = await controller.getBookedSeats('trip-1');

      expect(service.getBookedSeats).toHaveBeenCalledWith('trip-1');
      expect(result).toEqual([seatStatusFixture]);
    });
  });

  describe('getAvailableSeats', () => {
    it('returns available seats', async () => {
      mockService.getAvailableSeats.mockResolvedValue([seatStatusFixture]);

      const result = await controller.getAvailableSeats('trip-1');

      expect(service.getAvailableSeats).toHaveBeenCalledWith('trip-1');
      expect(result).toEqual([seatStatusFixture]);
    });
  });
});
