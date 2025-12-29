import { Test, TestingModule } from '@nestjs/testing';
import { OperatorService } from '../../src/operator/operator.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Operator, OperatorStatus } from '../../src/entities/operator.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CreateOperatorDto } from '../../src/operator/dto/create-operator.dto';
import { UpdateOperatorDto } from '../../src/operator/dto/update-operator.dto';

describe('OperatorService', () => {
  let service: OperatorService;
  let repo: any;

  const mockOperatorRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
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
      providers: [
        OperatorService,
        {
          provide: getRepositoryToken(Operator),
          useValue: mockOperatorRepo,
        },
      ],
    }).compile();

    service = module.get<OperatorService>(OperatorService);
    repo = module.get(getRepositoryToken(Operator));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save an operator', async () => {
      const dto: CreateOperatorDto = {
        name: 'New Operator',
        contactEmail: 'new@example.com',
        contactPhone: '9876543210',
        status: OperatorStatus.PENDING,
      };

      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...operatorFixture, ...dto });
      repo.save.mockResolvedValue({ ...operatorFixture, ...dto });

      const result = await service.create(dto);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { contactEmail: dto.contactEmail } });
      expect(repo.save).toHaveBeenCalled();
      expect(result.contactEmail).toEqual(dto.contactEmail);
    });

    it('should throw ConflictException if email exists', async () => {
      const dto: CreateOperatorDto = {
        name: 'Existing',
        contactEmail: 'test@example.com',
        contactPhone: '1',
      };
      repo.findOne.mockResolvedValue(operatorFixture);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should set approvedAt if created as approved', async () => {
      const dto: CreateOperatorDto = {
        name: 'Auto Approved',
        contactEmail: 'auto@x.com',
        contactPhone: '1',
        status: OperatorStatus.APPROVED,
      };
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue({ ...dto });
      repo.save.mockImplementation(o => Promise.resolve(o));

      const result = await service.create(dto);
      expect(result.approvedAt).toBeInstanceOf(Date);
    });
  });

  describe('findAll', () => {
    it('should return all operators', async () => {
      repo.find.mockResolvedValue([operatorFixture]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(repo.find).toHaveBeenCalledWith({ relations: ['buses', 'routes'] });
    });
  });

  describe('findOne', () => {
    it('should return an operator if found', async () => {
      repo.findOne.mockResolvedValue(operatorFixture);
      const result = await service.findOne(id);
      expect(result).toEqual(operatorFixture);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an operator', async () => {
      const dto: UpdateOperatorDto = { name: 'Updated Name' };
      repo.findOne.mockResolvedValueOnce(operatorFixture); // For findOne call inside update
      repo.save.mockResolvedValue({ ...operatorFixture, ...dto });

      const result = await service.update(id, dto);
      expect(result.name).toBe('Updated Name');
      expect(repo.save).toHaveBeenCalled();
    });

    it('should set approvedAt when status changes to approved', async () => {
      const dto: UpdateOperatorDto = { status: OperatorStatus.APPROVED };
      repo.findOne.mockResolvedValueOnce(operatorFixture); 
      repo.save.mockImplementation(o => Promise.resolve(o));

      const result = await service.update(id, dto);
      expect(result.approvedAt).toBeInstanceOf(Date);
      expect(result.status).toBe(OperatorStatus.APPROVED);
    });

    it('should throw ConflictException if updating to existing email', async () => {
      const dto: UpdateOperatorDto = { contactEmail: 'other@x.com' };
      repo.findOne.mockResolvedValueOnce(operatorFixture); // existing operator
      repo.findOne.mockResolvedValueOnce({ id: 'other' }); // conflicting operator

      await expect(service.update(id, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove an operator', async () => {
      repo.findOne.mockResolvedValue(operatorFixture);
      repo.remove.mockResolvedValue(operatorFixture);

      await service.remove(id);
      expect(repo.remove).toHaveBeenCalled();
    });
  });

  describe('status methods', () => {
    it('approveOperator should update status', async () => {
      repo.findOne.mockResolvedValue(operatorFixture);
      repo.save.mockImplementation(o => Promise.resolve(o));

      const result = await service.approveOperator(id);
      expect(result.status).toBe(OperatorStatus.APPROVED);
    });

    it('suspendOperator should update status', async () => {
      repo.findOne.mockResolvedValue(operatorFixture);
      repo.save.mockImplementation(o => Promise.resolve(o));

      const result = await service.suspendOperator(id);
      expect(result.status).toBe(OperatorStatus.SUSPENDED);
    });

    it('findByStatus should return filtered operators', async () => {
      repo.find.mockResolvedValue([operatorFixture]);
      const result = await service.findByStatus(OperatorStatus.PENDING);
      expect(repo.find).toHaveBeenCalledWith({ 
        where: { status: OperatorStatus.PENDING },
        relations: ['buses', 'routes']
      });
      expect(result).toHaveLength(1);
    });
  });
});
