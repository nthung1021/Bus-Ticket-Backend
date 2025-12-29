import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusService } from '../../src/bus/bus.service';
import { Bus } from '../../src/entities/bus.entity';
import { Operator } from '../../src/entities/operator.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Seat } from '../../src/entities/seat.entity';
import { SeatLayout } from '../../src/entities/seat-layout.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { User } from '../../src/entities/user.entity';

describe('BusService (integration)', () => {
  let service: BusService;
  let moduleRef: TestingModule;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) =>
            testDatabaseConfig(configService),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([
          Bus, 
          Operator, 
          Trip, 
          Seat, 
          SeatLayout,
          User // Included for truncation consistency
        ]),
      ],
      providers: [BusService],
    }).compile();

    moduleRef = module;
    service = module.get<BusService>(BusService);
    busRepository = module.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(async () => {
    // Database Cleanup
    const entities = [
      'seat_layouts',
      'seats',
      'trips',
      'buses',
      'operators',
      // Add other related tables if necessary to avoid FK issues
      'users' 
    ];
    // Using TRUNCATE CASCADE to handle dependencies automatically
    for (const entity of entities) {
      try {
        await userRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {
        // Ignore errors if table doesn't exist or other minor issues
      }
    }
  });

  async function createOperator() {
    return await operatorRepository.save({
      name: 'Test Bus Operator',
      contactEmail: `bus-op-${crypto.randomUUID()}@test.com`,
      contactPhone: '0987654321',
    });
  }

  describe('create', () => {
    it('should create a bus successfully', async () => {
      const operator = await createOperator();
      const dto = {
        operatorId: operator.id,
        plateNumber: 'BUS-001',
        model: 'Luxury Coach',
        seatCapacity: 40,
        amenities: ['WiFi', 'AC'],
      };

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.plateNumber).toBe('BUS-001');
      expect(result.operatorId).toBe(operator.id);
    });

    it('should fail if operator does not exist', async () => {
      const dto = {
        operatorId: crypto.randomUUID(), // Non-existent ID
        plateNumber: 'BUS-002',
        model: 'Mini Bus',
        seatCapacity: 20,
        amenities: [],
      };

      // TypeORM throws foreign key constraint error
      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return an array of buses with relations', async () => {
      const operator = await createOperator();
      await busRepository.save({
        operatorId: operator.id,
        plateNumber: 'BUS-ALL-1',
        model: 'Model A',
        seatCapacity: 30,
      });
      await busRepository.save({
        operatorId: operator.id,
        plateNumber: 'BUS-ALL-2',
        model: 'Model B',
        seatCapacity: 30,
      });

      const result = await service.findAll();

      expect(result.length).toBe(2);
      expect(result[0].operator).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a bus with relations', async () => {
      const operator = await createOperator();
      const savedBus = await busRepository.save({
        operatorId: operator.id,
        plateNumber: 'BUS-ONE',
        model: 'Target Bus',
        seatCapacity: 45,
      });

      const result = await service.findOne(savedBus.id);

      expect(result.id).toBe(savedBus.id);
      expect(result.operator).toBeDefined();
      expect(result.operator.id).toBe(operator.id);
    });

    it('should throw NotFoundException if bus not found', async () => {
      await expect(service.findOne(crypto.randomUUID())).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update bus details', async () => {
      const operator = await createOperator();
      const savedBus = await busRepository.save({
        operatorId: operator.id,
        plateNumber: 'BUS-UPDATE',
        model: 'Original Model',
        seatCapacity: 40,
      });

      const updateDto = {
        model: 'Updated Model',
        seatCapacity: 42,
      };

      const result = await service.update(savedBus.id, updateDto);

      expect(result.model).toBe('Updated Model');
      expect(result.seatCapacity).toBe(42);
      
      const dbBus = await busRepository.findOne({ where: { id: savedBus.id } });
      expect(dbBus?.model).toBe('Updated Model');
    });

    it('should throw NotFoundException on update if bus not found', async () => {
       await expect(service.update(crypto.randomUUID(), { model: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove the bus', async () => {
      const operator = await createOperator();
      const savedBus = await busRepository.save({
        operatorId: operator.id,
        plateNumber: 'BUS-DEL',
        model: 'To Delete',
        seatCapacity: 40,
      });

      await service.remove(savedBus.id);

      const dbBus = await busRepository.findOne({ where: { id: savedBus.id } });
      expect(dbBus).toBeNull();
    });

    it('should throw NotFoundException if trying to remove non-existent bus', async () => {
      await expect(service.remove(crypto.randomUUID())).rejects.toThrow(NotFoundException);
    });
  });
});
