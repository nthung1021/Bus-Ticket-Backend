import { Test, TestingModule } from '@nestjs/testing';
import { OperatorController } from '../../src/operator/operator.controller';
import { OperatorService } from '../../src/operator/operator.service';
import { Operator, OperatorStatus } from '../../src/entities/operator.entity';
import { CreateOperatorDto } from '../../src/operator/dto/create-operator.dto';
import { UpdateOperatorDto } from '../../src/operator/dto/update-operator.dto';

describe('OperatorController', () => {
  let controller: OperatorController;
  let service: OperatorService;

  const mockOperatorService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByStatus: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    approveOperator: jest.fn(),
    suspendOperator: jest.fn(),
    remove: jest.fn(),
  };

  const id = 'op-uuid-1';
  const operatorFixture: Operator = {
    id,
    name: 'Test Operator',
    contactEmail: 'test@example.com',
    contactPhone: '0123456789',
    status: OperatorStatus.PENDING,
    approvedAt: null as any,
    buses: [],
    routes: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OperatorController],
      providers: [
        {
          provide: OperatorService,
          useValue: mockOperatorService,
        },
      ],
    }).compile();

    controller = module.get<OperatorController>(OperatorController);
    service = module.get<OperatorService>(OperatorService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create', async () => {
      const dto: CreateOperatorDto = { name: 'New' } as any;
      mockOperatorService.create.mockResolvedValue(operatorFixture);
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(operatorFixture);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll', async () => {
      mockOperatorService.findAll.mockResolvedValue([operatorFixture]);
      const result = await controller.findAll();
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([operatorFixture]);
    });
  });

  describe('findByStatus', () => {
    it('should call service.findByStatus', async () => {
      mockOperatorService.findByStatus.mockResolvedValue([operatorFixture]);
      const result = await controller.findByStatus(OperatorStatus.APPROVED);
      expect(service.findByStatus).toHaveBeenCalledWith(OperatorStatus.APPROVED);
      expect(result).toEqual([operatorFixture]);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne', async () => {
      mockOperatorService.findOne.mockResolvedValue(operatorFixture);
      const result = await controller.findOne(id);
      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toEqual(operatorFixture);
    });
  });

  describe('update', () => {
    it('should call service.update', async () => {
      const dto: UpdateOperatorDto = { name: 'Updated' };
      mockOperatorService.update.mockResolvedValue({ ...operatorFixture, ...dto });
      const result = await controller.update(id, dto);
      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result.name).toBe('Updated');
    });
  });

  describe('approve', () => {
    it('should call service.approveOperator', async () => {
      mockOperatorService.approveOperator.mockResolvedValue({ ...operatorFixture, status: OperatorStatus.APPROVED });
      const result = await controller.approve(id);
      expect(service.approveOperator).toHaveBeenCalledWith(id);
      expect(result.status).toBe(OperatorStatus.APPROVED);
    });
  });

  describe('suspend', () => {
    it('should call service.suspendOperator', async () => {
      mockOperatorService.suspendOperator.mockResolvedValue({ ...operatorFixture, status: OperatorStatus.SUSPENDED });
      const result = await controller.suspend(id);
      expect(service.suspendOperator).toHaveBeenCalledWith(id);
      expect(result.status).toBe(OperatorStatus.SUSPENDED);
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockOperatorService.remove.mockResolvedValue(undefined);
      await controller.remove(id);
      expect(service.remove).toHaveBeenCalledWith(id);
    });
  });
});
