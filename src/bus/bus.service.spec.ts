import { Test, TestingModule } from '@nestjs/testing';
import { BusService } from './bus.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bus } from '../entities/bus.entity';
import { NotFoundException } from '@nestjs/common';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';

describe('BusService', () => {
  let service: BusService;
  let repo: any;

  const mockBusRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
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
      providers: [
        BusService,
        {
          provide: getRepositoryToken(Bus),
          useValue: mockBusRepo,
        },
      ],
    }).compile();

    service = module.get<BusService>(BusService);
    repo = module.get(getRepositoryToken(Bus));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a bus', async () => {
      const dto: CreateBusDto = {
        operatorId: 'op-1',
        plateNumber: '29A-12345',
        model: 'Thaco Blue Sky',
        seatCapacity: 45,
        amenities: ['Wifi', 'Water'],
      };

      repo.create.mockReturnValue(busFixture);
      repo.save.mockResolvedValue(busFixture);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(busFixture);
      expect(result).toEqual(busFixture);
    });
  });

  describe('findAll', () => {
    it('should return an array of buses', async () => {
      repo.find.mockResolvedValue([busFixture]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        relations: ['operator', 'trips', 'seats'],
      });
      expect(result).toEqual([busFixture]);
    });
  });

  describe('findOne', () => {
    it('should return a bus if found', async () => {
      repo.findOne.mockResolvedValue(busFixture);

      const result = await service.findOne(id);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['operator', 'trips', 'seats'],
      });
      expect(result).toEqual(busFixture);
    });

    it('should throw NotFoundException if bus not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and save a bus', async () => {
      const dto: UpdateBusDto = { model: 'Updated Model' };
      const updatedBus = { ...busFixture, ...dto };

      repo.findOne.mockResolvedValue(busFixture);
      repo.save.mockResolvedValue(updatedBus);

      const result = await service.update(id, dto);

      expect(repo.save).toHaveBeenCalled();
      expect(result.model).toEqual('Updated Model');
    });
  });

  describe('remove', () => {
    it('should delete a bus if found', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });

      await service.remove(id);

      expect(repo.delete).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException if bus not found', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });
});
