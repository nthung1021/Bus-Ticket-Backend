import { Test, TestingModule } from '@nestjs/testing';
import { SeatLayoutController } from '../../src/seat-layout/seat-layout.controller';
import { SeatLayoutService } from '../../src/seat-layout/seat-layout.service';
import { CreateSeatLayoutDto, UpdateSeatLayoutDto, CreateSeatFromTemplateDto } from '../../src/seat-layout/dto/create-seat-layout.dto';
import { SeatLayout, SeatLayoutType } from '../../src/entities/seat-layout.entity';

describe('SeatLayoutController', () => {
  let controller: SeatLayoutController;
  let service: SeatLayoutService;

  const mockService = {
    create: jest.fn(),
    createFromTemplate: jest.fn(),
    findAll: jest.fn(),
    getTemplateConfig: jest.fn(),
    findOne: jest.fn(),
    findByBusId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const id = 'layout-1';
  const layoutFixture: SeatLayout = {
    id,
    busId: 'bus-1',
    layoutType: SeatLayoutType.STANDARD_2X2,
    totalRows: 1,
    seatsPerRow: 1,
    layoutConfig: {
      seats: [
        {
          id: 'seat-1',
          code: '1A',
          type: 'normal',
          position: { row: 1, position: 'A', x: 0, y: 0, width: 40, height: 40 },
          isAvailable: true,
        },
      ],
      aisles: [],
      dimensions: { totalWidth: 40, totalHeight: 40, seatWidth: 40, seatHeight: 40, aisleWidth: 0, rowSpacing: 0 },
    },
    seatPricing: {
      basePrice: 100,
      seatTypePrices: { normal: 0, vip: 10, business: 20 },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    bus: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatLayoutController],
      providers: [
        {
          provide: SeatLayoutService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SeatLayoutController>(SeatLayoutController);
    service = module.get<SeatLayoutService>(SeatLayoutService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('delegates to service', async () => {
      const dto = {} as CreateSeatLayoutDto;
      mockService.create.mockResolvedValue(layoutFixture);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(layoutFixture);
    });
  });

  describe('createFromTemplate', () => {
    it('delegates to service', async () => {
      const dto = {} as CreateSeatFromTemplateDto;
      mockService.createFromTemplate.mockResolvedValue(layoutFixture);

      const result = await controller.createFromTemplate(dto);

      expect(service.createFromTemplate).toHaveBeenCalledWith(dto);
      expect(result).toEqual(layoutFixture);
    });
  });

  describe('findAll', () => {
    it('returns all layouts', async () => {
      mockService.findAll.mockResolvedValue([layoutFixture]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([layoutFixture]);
    });
  });

  describe('getTemplates', () => {
    it('returns template configs', () => {
      const templates = [{ type: SeatLayoutType.STANDARD_2X2 }];
      const result = controller.getTemplates();
      expect(result.templates.length).toBeGreaterThan(0);
      expect(result.templates[0]).toHaveProperty('type');
    });
  });

  describe('getTemplateConfig', () => {
    it('delegates to service', () => {
      mockService.getTemplateConfig.mockReturnValue(layoutFixture.layoutConfig);

      const result = controller.getTemplateConfig(SeatLayoutType.STANDARD_2X2);

      expect(service.getTemplateConfig).toHaveBeenCalledWith(SeatLayoutType.STANDARD_2X2);
      expect(result).toEqual(layoutFixture.layoutConfig);
    });
  });

  describe('findOne', () => {
    it('returns layout by id', async () => {
      mockService.findOne.mockResolvedValue(layoutFixture);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(layoutFixture);
    });
  });

  describe('findByBusId', () => {
    it('returns layout by bus id', async () => {
      mockService.findByBusId.mockResolvedValue(layoutFixture);

      const result = await controller.findByBusId('bus-1');

      expect(service.findByBusId).toHaveBeenCalledWith('bus-1');
      expect(result).toEqual(layoutFixture);
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      const dto = {} as UpdateSeatLayoutDto;
      mockService.update.mockResolvedValue(layoutFixture);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(layoutFixture);
    });
  });

  describe('remove', () => {
    it('delegates to service', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});

