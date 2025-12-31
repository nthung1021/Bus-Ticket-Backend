import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SeatLayoutService } from '../../src/seat-layout/seat-layout.service';
import { Trip } from '../../src/entities/trip.entity';
import { SeatLayout, SeatLayoutType } from '../../src/entities/seat-layout.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Seat, SeatType } from '../../src/entities/seat.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';

describe('SeatLayoutService', () => {
  let service: SeatLayoutService;
  let layoutRepo: any;
  let busRepo: any;
  let seatRepo: any;
  let seatStatusRepo: any;

  const mockLayoutRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockBusRepo = {
    findOne: jest.fn(),
  };

  const mockSeatRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockSeatStatusRepo = {
    delete: jest.fn(),
  };

  const mockTripRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const layoutConfig = {
    seats: [
      {
        id: 'seat-1',
        code: '1A',
        type: 'normal' as const,
        position: { row: 1, position: 1, x: 0, y: 0, width: 40, height: 40 },
        isAvailable: true,
      },
    ],
    aisles: [] as number[],
    dimensions: { totalWidth: 40, totalHeight: 40, seatWidth: 40, seatHeight: 40, aisleWidth: 0, rowSpacing: 0 },
  } satisfies SeatLayout['layoutConfig'];

  const seatPricing = {
    basePrice: 100,
    seatTypePrices: { normal: 0, vip: 10, business: 20 },
  };

  const layoutFixture: SeatLayout = {
    id: 'layout-1',
    busId: 'bus-1',
    layoutType: SeatLayoutType.STANDARD_2X2,
    totalRows: 1,
    seatsPerRow: 1,
    layoutConfig,
    seatPricing,
    createdAt: new Date(),
    updatedAt: new Date(),
    bus: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatLayoutService,
        { provide: getRepositoryToken(SeatLayout), useValue: mockLayoutRepo },
        { provide: getRepositoryToken(Bus), useValue: mockBusRepo },
        { provide: getRepositoryToken(Seat), useValue: mockSeatRepo },
        { provide: getRepositoryToken(SeatStatus), useValue: mockSeatStatusRepo },
        { provide: getRepositoryToken(Trip), useValue: mockTripRepo },
      ],
    }).compile();

    service = module.get<SeatLayoutService>(SeatLayoutService);
    layoutRepo = module.get(getRepositoryToken(SeatLayout));
    busRepo = module.get(getRepositoryToken(Bus));
    seatRepo = module.get(getRepositoryToken(Seat));
    seatStatusRepo = module.get(getRepositoryToken(SeatStatus));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a layout and seats when bus exists and no layout', async () => {
      busRepo.findOne.mockResolvedValue({ id: 'bus-1' });
      layoutRepo.findOne = jest.fn().mockResolvedValue(null);
      seatRepo.create.mockReturnValue({ ...layoutConfig.seats[0], busId: 'bus-1' });
      seatRepo.save.mockResolvedValue({ ...layoutConfig.seats[0], id: 'db-seat-1' });
      layoutRepo.create.mockReturnValue(layoutFixture);
      layoutRepo.save.mockResolvedValue(layoutFixture);

      const result = await service.create({
        busId: 'bus-1',
        layoutType: SeatLayoutType.STANDARD_2X2,
        totalRows: 1,
        seatsPerRow: 1,
        layoutConfig: JSON.parse(JSON.stringify(layoutConfig)),
        seatPricing,
      } as any);

      expect(busRepo.findOne).toHaveBeenCalledWith({ where: { id: 'bus-1' } });
      expect(layoutRepo.findOne).toHaveBeenCalledWith({ where: { busId: 'bus-1' } });
      expect(seatRepo.create).toHaveBeenCalledWith({
        seatCode: '1A',
        seatType: SeatType.NORMAL,
        isActive: true,
        busId: 'bus-1',
      });
      expect(layoutRepo.save).toHaveBeenCalled();
      expect(result).toEqual(layoutFixture);
    });

    it('throws when bus missing', async () => {
      busRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          busId: 'bus-404',
          layoutType: SeatLayoutType.STANDARD_2X2,
          totalRows: 1,
          seatsPerRow: 1,
          layoutConfig,
          seatPricing,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when layout already exists', async () => {
      busRepo.findOne.mockResolvedValue({ id: 'bus-1' });
      layoutRepo.findOne = jest.fn().mockResolvedValue(layoutFixture);

      await expect(
        service.create({
          busId: 'bus-1',
          layoutType: SeatLayoutType.STANDARD_2X2,
          totalRows: 1,
          seatsPerRow: 1,
          layoutConfig,
          seatPricing,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createFromTemplate', () => {
    it('creates from template when bus exists and no layout', async () => {
      const template = {
        totalRows: 1,
        seatsPerRow: 1,
        layoutConfig,
      };
      jest.spyOn(service, 'getTemplateConfig').mockReturnValue(template as any);
      busRepo.findOne.mockResolvedValue({ id: 'bus-1' });
      layoutRepo.findOne = jest.fn().mockResolvedValue(null);
      seatRepo.create.mockReturnValue({ seatCode: '1A', seatType: SeatType.NORMAL, isActive: true, busId: 'bus-1' });
      seatRepo.save.mockResolvedValue({ ...layoutConfig.seats[0], id: 'db-seat-1' });
      layoutRepo.create.mockReturnValue(layoutFixture);
      layoutRepo.save.mockResolvedValue(layoutFixture);

      const result = await service.createFromTemplate({
        busId: 'bus-1',
        layoutType: SeatLayoutType.STANDARD_2X2,
        seatPricing,
      } as any);

      expect(service.getTemplateConfig).toHaveBeenCalledWith(SeatLayoutType.STANDARD_2X2);
      expect(seatRepo.save).toHaveBeenCalled();
      expect(layoutRepo.save).toHaveBeenCalled();
      expect(result).toEqual(layoutFixture);
    });

    it('throws when bus missing', async () => {
      busRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createFromTemplate({
          busId: 'bus-404',
          layoutType: SeatLayoutType.STANDARD_2X2,
          seatPricing,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns all layouts', async () => {
      layoutRepo.find.mockResolvedValue([layoutFixture]);

      const result = await service.findAll();

      expect(layoutRepo.find).toHaveBeenCalledWith({ relations: ['bus'] });
      expect(result).toEqual([layoutFixture]);
    });
  });

  describe('findOne', () => {
    it('returns layout when found', async () => {
      layoutRepo.findOne.mockResolvedValue(layoutFixture);

      const result = await service.findOne('layout-1');

      expect(layoutRepo.findOne).toHaveBeenCalledWith({ where: { id: 'layout-1' }, relations: ['bus'] });
      expect(result).toEqual(layoutFixture);
    });

    it('throws when missing', async () => {
      layoutRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByBusId', () => {
    it('returns layout', async () => {
      layoutRepo.findOne.mockResolvedValue(layoutFixture);

      const result = await service.findByBusId('bus-1');

      expect(layoutRepo.findOne).toHaveBeenCalledWith({ where: { busId: 'bus-1' }, relations: ['bus'] });
      expect(result).toEqual(layoutFixture);
    });

    it('throws when missing', async () => {
      layoutRepo.findOne.mockResolvedValue(null);

      await expect(service.findByBusId('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates layout without seat changes', async () => {
      layoutRepo.findOne.mockResolvedValue({ ...layoutFixture, layoutType: SeatLayoutType.CUSTOM, seatsPerRow: 0, totalRows: 0, layoutConfig: { seats: [], aisles: [], dimensions: layoutConfig.dimensions } });
      layoutRepo.save.mockResolvedValue(layoutFixture);

      const result = await service.update('layout-1', { layoutType: SeatLayoutType.CUSTOM, seatsPerRow: 0, totalRows: 0, layoutConfig: { seats: [], aisles: [], dimensions: layoutConfig.dimensions } } as any);

      expect(layoutRepo.save).toHaveBeenCalled();
      expect(result).toEqual(layoutFixture);
    });
  });

  describe('remove', () => {
    it('deletes layout when exists', async () => {
      layoutRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove('layout-1');

      expect(layoutRepo.delete).toHaveBeenCalledWith('layout-1');
    });

    it('throws when not found', async () => {
      layoutRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });
});

