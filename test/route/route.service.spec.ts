import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { RouteService } from '../../src/route/route.service';
import { Route } from '../../src/entities/route.entity';
import { RoutePoint, PointType } from '../../src/entities/route-point.entity';
import { CreateRouteDto } from '../../src/route/dto/create-route.dto';
import { UpdateRouteDto } from '../../src/route/dto/update-route.dto';
import { CreateRoutePointDto } from '../../src/route/dto/create-route-point.dto';
import { Booking } from '../../src/entities/booking.entity';
import { UpdateRoutePointDto } from '../../src/route/dto/update-route-point.dto';

describe('RouteService', () => {
  let service: RouteService;
  let routeRepo: any;
  let pointRepo: any;

  const mockRouteRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockPointRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockBookingRepo = {
    createQueryBuilder: jest.fn(),
  };

  const id = 'route-1';
  const pointId = 'point-1';

  const routePointFixture: RoutePoint = {
    id: pointId,
    routeId: id,
    name: 'Point A',
    latitude: 10,
    longitude: 20,
    type: PointType.BOTH,
    order: 1,
    distanceFromStart: 0,
    estimatedTimeFromStart: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    route: {} as any,
  };

  const routeFixture: Route = {
    id,
    name: 'Route 1',
    operatorId: 'op-1',
    origin: 'City A',
    destination: 'City B',
    description: 'Test route',
    distanceKm: 10,
    estimatedMinutes: 30,
    isActive: true,
    amenities: ['wifi'],
    createdAt: new Date(),
    updatedAt: new Date(),
    operator: {} as any,
    trips: [],
    points: [routePointFixture],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteService,
        {
          provide: getRepositoryToken(Route),
          useValue: mockRouteRepo,
        },
        {
          provide: getRepositoryToken(RoutePoint),
          useValue: mockPointRepo,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepo,
        },
      ],
    }).compile();

    service = module.get<RouteService>(RouteService);
    routeRepo = module.get(getRepositoryToken(Route));
    pointRepo = module.get(getRepositoryToken(RoutePoint));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create route and points', async () => {
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
        points: [
          {
            name: 'Point A',
            latitude: 10,
            longitude: 20,
            type: PointType.BOTH,
            order: 1,
            distanceFromStart: 0,
            estimatedTimeFromStart: 0,
          },
        ],
      };

      routeRepo.create.mockReturnValue(routeFixture);
      routeRepo.save.mockResolvedValue(routeFixture);
      pointRepo.create.mockReturnValue([routePointFixture]);
      pointRepo.save.mockResolvedValue([routePointFixture]);

      const result = await service.create(dto);

      expect(routeRepo.create).toHaveBeenCalledWith({
        name: 'Route 1',
        operatorId: 'op-1',
        origin: 'City A',
        destination: 'City B',
        description: 'Test route',
        distanceKm: 10,
        estimatedMinutes: 30,
        isActive: true,
        amenities: ['wifi'],
      });
      expect(routeRepo.save).toHaveBeenCalledWith(routeFixture);
      expect(pointRepo.create).toHaveBeenCalledWith([
        {
          name: 'Point A',
          latitude: 10,
          longitude: 20,
          type: PointType.BOTH,
          order: 1,
          distanceFromStart: 0,
          estimatedTimeFromStart: 0,
          routeId: id,
        },
      ]);
      expect(pointRepo.save).toHaveBeenCalledWith([routePointFixture]);
      expect(result).toEqual(routeFixture);
    });
  });

  describe('findAll', () => {
    it('should return routes with relations', async () => {
      routeRepo.find.mockResolvedValue([routeFixture]);

      const result = await service.findAll();

      expect(routeRepo.find).toHaveBeenCalledWith({
        relations: ['operator', 'trips', 'points'],
        order: {
          name: 'ASC',
          points: { order: 'ASC' },
        },
        where: { isActive: true },
      });
      expect(result).toEqual([routeFixture]);
    });
  });

  describe('findOne', () => {
    it('should return a route if found', async () => {
      routeRepo.findOne.mockResolvedValue(routeFixture);

      const result = await service.findOne(id);

      expect(routeRepo.findOne).toHaveBeenCalledWith({
        where: { id },
        relations: ['operator', 'trips', 'points', 'points'],
        order: { points: { order: 'ASC' } },
      });
      expect(result).toEqual(routeFixture);
    });

    it('should throw NotFoundException if route not found', async () => {
      routeRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPoints', () => {
    it('should return ordered points for a route', async () => {
      pointRepo.find.mockResolvedValue([routePointFixture]);

      const result = await service.findPoints(id);

      expect(pointRepo.find).toHaveBeenCalledWith({
        where: { routeId: id },
        order: { order: 'ASC' },
      });
      expect(result).toEqual([routePointFixture]);
    });
  });

  describe('findPoint', () => {
    it('should return point when found', async () => {
      pointRepo.findOne.mockResolvedValue(routePointFixture);

      const result = await service.findPoint(id, pointId);

      expect(pointRepo.findOne).toHaveBeenCalledWith({
        where: { id: pointId, routeId: id },
      });
      expect(result).toEqual(routePointFixture);
    });

    it('should throw NotFoundException when missing', async () => {
      pointRepo.findOne.mockResolvedValue(null);

      await expect(service.findPoint(id, pointId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('addPoint', () => {
    it('should add a new point to an existing route', async () => {
      const dto: CreateRoutePointDto = {
        name: 'New Point',
        latitude: 1,
        longitude: 2,
        type: PointType.BOTH,
        order: 2,
      };
      const createdPoint = { ...dto, id: 'point-2', routeId: id } as RoutePoint;

      routeRepo.findOne.mockResolvedValue(routeFixture);
      pointRepo.create.mockReturnValue(createdPoint);
      pointRepo.save.mockResolvedValue(createdPoint);

      const result = await service.addPoint(id, dto);

      expect(routeRepo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(pointRepo.create).toHaveBeenCalledWith({ ...dto, routeId: id });
      expect(pointRepo.save).toHaveBeenCalledWith(createdPoint);
      expect(result).toEqual(createdPoint);
    });

    it('should throw NotFoundException when route missing', async () => {
      routeRepo.findOne.mockResolvedValue(null);

      await expect(service.addPoint(id, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePoint', () => {
    it('should update and save point', async () => {
      const dto: UpdateRoutePointDto = { name: 'Updated Point' };
      const updatedPoint = { ...routePointFixture, ...dto };

      pointRepo.findOne.mockResolvedValue(routePointFixture);
      pointRepo.save.mockResolvedValue(updatedPoint);

      const result = await service.updatePoint(id, pointId, dto);

      expect(pointRepo.save).toHaveBeenCalledWith(updatedPoint);
      expect(result).toEqual(updatedPoint);
    });
  });

  describe('removePoint', () => {
    it('should remove point when route and point exist', async () => {
      routeRepo.findOne.mockResolvedValue(routeFixture);
      pointRepo.delete.mockResolvedValue({ affected: 1 });

      await service.removePoint(id, pointId);

      expect(routeRepo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(pointRepo.delete).toHaveBeenCalledWith({ id: pointId, routeId: id });
    });

    it('should throw when route missing', async () => {
      routeRepo.findOne.mockResolvedValue(null);

      await expect(service.removePoint(id, pointId)).rejects.toThrow(NotFoundException);
    });

    it('should throw when point not found', async () => {
      routeRepo.findOne.mockResolvedValue(routeFixture);
      pointRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removePoint(id, pointId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update route and replace points when provided', async () => {
      const dto: UpdateRouteDto = {
        name: 'Updated Name',
        points: [
          { name: 'P1', latitude: 1, longitude: 2, type: PointType.BOTH, order: 1 },
          { name: 'P2', latitude: 3, longitude: 4, type: PointType.BOTH, order: 2 },
        ],
      };
      const updatedRoute = { ...routeFixture, name: 'Updated Name' };
      const points = dto.points!;
      const createdPoints = [
        { ...points[0], id: 'np1', routeId: id },
        { ...points[1], id: 'np2', routeId: id },
      ] as any;

      routeRepo.findOne.mockResolvedValue(routeFixture);
      routeRepo.save.mockResolvedValue(updatedRoute);
      pointRepo.delete.mockResolvedValue({ affected: 2 });
      pointRepo.create.mockReturnValue(createdPoints);
      pointRepo.save.mockResolvedValue(createdPoints);

      const result = await service.update(id, dto);

      expect(routeRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Name' }));
      expect(pointRepo.delete).toHaveBeenCalledWith({ routeId: id });
      expect(pointRepo.create).toHaveBeenCalledWith([
        { ...points[0], routeId: id },
        { ...points[1], routeId: id },
      ]);
      expect(pointRepo.save).toHaveBeenCalledWith(createdPoints);
      expect(result.points).toEqual(createdPoints);
    });

    it('should retain existing points when points not provided', async () => {
      const dto: UpdateRouteDto = { name: 'Updated Name' };

      routeRepo.findOne.mockResolvedValue(routeFixture);
      routeRepo.save.mockResolvedValue(routeFixture);
      pointRepo.find.mockResolvedValue([routePointFixture]);

      const result = await service.update(id, dto);

      expect(pointRepo.find).toHaveBeenCalledWith({
        where: { routeId: id },
        order: { order: 'ASC' },
      });
      expect(result.points).toEqual([routePointFixture]);
    });
  });

  describe('remove', () => {
    it('should delete points then route', async () => {
      pointRepo.delete.mockResolvedValue({ affected: 2 });
      routeRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove(id);

      expect(pointRepo.delete).toHaveBeenCalledWith({ routeId: id });
      expect(routeRepo.delete).toHaveBeenCalledWith(id);
    });

    it('should throw NotFoundException when route not found', async () => {
      pointRepo.delete.mockResolvedValue({ affected: 0 });
      routeRepo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findRoutesByLocation', () => {
    it('should delegate to query builder and return routes', async () => {
      const qb: any = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([routeFixture]),
      };
      routeRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findRoutesByLocation(1, 2, 5);

      expect(routeRepo.createQueryBuilder).toHaveBeenCalledWith('route');
      expect(qb.innerJoinAndSelect).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalled();
      expect(qb.getMany).toHaveBeenCalled();
      expect(result).toEqual([routeFixture]);
    });
  });
});
