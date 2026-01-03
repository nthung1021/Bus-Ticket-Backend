import { Test, TestingModule } from '@nestjs/testing';
import { RouteController } from '../../src/route/route.controller';
import { RouteService } from '../../src/route/route.service';
import { CreateRouteDto } from '../../src/route/dto/create-route.dto';
import { UpdateRouteDto } from '../../src/route/dto/update-route.dto';
import { Route } from '../../src/entities/route.entity';

describe('RouteController', () => {
  let controller: RouteController;
  let service: RouteService;

  const mockRouteService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const id = 'route-1';
  const routeFixture: Route = {
    id,
    name: 'Route 1',
    operatorId: 'op-1',
    origin: 'City A',
    destination: 'City B',
    distanceKm: 10,
    estimatedMinutes: 30,
    description: 'Test route',
    isActive: true,
    amenities: ['wifi'],
    createdAt: new Date(),
    updatedAt: new Date(),
    operator: {} as any,
    trips: [],
    points: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouteController],
      providers: [
        {
          provide: RouteService,
          useValue: mockRouteService,
        },
      ],
    }).compile();

    controller = module.get<RouteController>(RouteController);
    service = module.get<RouteService>(RouteService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto: CreateRouteDto = {
        name: 'Route 1',
        operatorId: 'op-1',
        origin: 'City A',
        destination: 'City B',
        description: 'Test route',
        distanceKm: 10,
        estimatedMinutes: 30,
        isActive: true,
        amenities: ['wifi'],
        points: [],
      };
      mockRouteService.create.mockResolvedValue(routeFixture);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(routeFixture);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockRouteService.findAll.mockResolvedValue([routeFixture]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([routeFixture]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockRouteService.findOne.mockResolvedValue(routeFixture);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(routeFixture);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto: UpdateRouteDto = { name: 'Updated Route' };
      const updatedRoute = { ...routeFixture, ...dto };
      mockRouteService.update.mockResolvedValue(updatedRoute);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toEqual(updatedRoute);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockRouteService.remove.mockResolvedValue(undefined);

      await controller.remove(id);

      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
