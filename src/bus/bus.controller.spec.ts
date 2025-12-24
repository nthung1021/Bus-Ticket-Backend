import { Test, TestingModule } from '@nestjs/testing';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { Bus } from '../entities/bus.entity';

describe('BusController', () => {
  let controller: BusController;
  let service: BusService;

  const mockBusService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const id = 'uuid-1';
  const busFixture: Bus = {
    id,
    operatorId: 'op-1',
    plateNumber: '29A-12345',
    model: 'Thaco Blue Sky',
    seatCapacity: 45,
    amenities: ['Wifi', 'Water'],
    operator: {} as any,
    trips: [],
    seats: [],
    seatLayout: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusController],
      providers: [
        {
          provide: BusService,
          useValue: mockBusService,
        },
      ],
    }).compile();

    controller = module.get<BusController>(BusController);
    service = module.get<BusService>(BusService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto: CreateBusDto = {
        operatorId: 'op-1',
        plateNumber: '29A-12345',
        model: 'Thaco Blue Sky',
        seatCapacity: 45,
        amenities: ['Wifi', 'Water'],
      };
      mockBusService.create.mockResolvedValue(busFixture);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(busFixture);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockBusService.findAll.mockResolvedValue([busFixture]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([busFixture]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockBusService.findOne.mockResolvedValue(busFixture);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(busFixture);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto: UpdateBusDto = { model: 'Updated Model' };
      const updatedBus = { ...busFixture, ...dto };
      mockBusService.update.mockResolvedValue(updatedBus);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(updatedBus);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockBusService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
