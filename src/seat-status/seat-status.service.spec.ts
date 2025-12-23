import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatStatusService } from './seat-status.service';
import { SeatStatus, SeatState } from '../entities/seat-status.entity';
import { Repository } from 'typeorm';

describe('SeatStatusService', () => {
  let service: SeatStatusService;
  let repo: jest.Mocked<Repository<SeatStatus>>;

  const mockRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<Repository<SeatStatus>>;

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
      providers: [
        SeatStatusService,
        {
          provide: getRepositoryToken(SeatStatus),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SeatStatusService>(SeatStatusService);
    repo = module.get(getRepositoryToken(SeatStatus));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findBySeatId', () => {
    it('returns statuses for seat', async () => {
      repo.find.mockResolvedValue([seatStatusFixture]);

      const result = await service.findBySeatId('seat-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { seatId: 'seat-1' },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual([seatStatusFixture]);
    });
  });

  describe('findBySeatIdAndTripId', () => {
    it('returns status', async () => {
      repo.findOne.mockResolvedValue(seatStatusFixture as any);

      const result = await service.findBySeatIdAndTripId('seat-1', 'trip-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { seatId: 'seat-1', tripId: 'trip-1' },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual(seatStatusFixture);
    });
  });

  describe('findByTripId', () => {
    it('returns statuses for trip', async () => {
      repo.find.mockResolvedValue([seatStatusFixture]);

      const result = await service.findByTripId('trip-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { tripId: 'trip-1' },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual([seatStatusFixture]);
    });
  });

  describe('create', () => {
    it('creates and saves status', async () => {
      const dto = { seatId: 'seat-1', tripId: 'trip-1', state: SeatState.AVAILABLE };
      repo.create.mockReturnValue(seatStatusFixture as any);
      repo.save.mockResolvedValue(seatStatusFixture);

      const result = await service.create(dto as any);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(seatStatusFixture);
      expect(result).toEqual(seatStatusFixture);
    });
  });

  describe('update', () => {
    it('updates and returns status', async () => {
      const dto = { state: SeatState.BOOKED };
      const updated = { ...seatStatusFixture, ...dto };
      repo.update.mockResolvedValue({} as any);
      repo.findOne.mockResolvedValue(updated as any);

      const result = await service.update(id, dto as any);

      expect(repo.update).toHaveBeenCalledWith(id, dto);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('returns true when deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.remove(id);

      expect(repo.delete).toHaveBeenCalledWith(id);
      expect(result).toBe(true);
    });

    it('returns false when nothing deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 0 } as any);

      const result = await service.remove(id);

      expect(result).toBe(false);
    });
  });

  describe('getLockedSeats', () => {
    it('returns locked seats', async () => {
      repo.find.mockResolvedValue([seatStatusFixture]);

      const result = await service.getLockedSeats('trip-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { tripId: 'trip-1', state: SeatState.LOCKED },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual([seatStatusFixture]);
    });
  });

  describe('getBookedSeats', () => {
    it('returns booked seats', async () => {
      repo.find.mockResolvedValue([seatStatusFixture]);

      const result = await service.getBookedSeats('trip-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { tripId: 'trip-1', state: SeatState.BOOKED },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual([seatStatusFixture]);
    });
  });

  describe('getAvailableSeats', () => {
    it('returns available seats', async () => {
      repo.find.mockResolvedValue([seatStatusFixture]);

      const result = await service.getAvailableSeats('trip-1');

      expect(repo.find).toHaveBeenCalledWith({
        where: { tripId: 'trip-1', state: SeatState.AVAILABLE },
        relations: ['trip', 'seat', 'booking'],
      });
      expect(result).toEqual([seatStatusFixture]);
    });
  });
});
