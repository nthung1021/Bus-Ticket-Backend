import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatLayoutService } from '../../src/seat-layout/seat-layout.service';
import { SeatLayout, SeatLayoutType } from '../../src/entities/seat-layout.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Seat } from '../../src/entities/seat.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { Operator } from '../../src/entities/operator.entity';
import { testDatabaseConfig } from '../../src/config/test-database.config';
import { NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('SeatLayoutService (integration)', () => {
  let service: SeatLayoutService;
  let moduleRef: TestingModule;
  let seatLayoutRepository: Repository<SeatLayout>;
  let busRepository: Repository<Bus>;
  let operatorRepository: Repository<Operator>;

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
          SeatLayout, 
          Bus, 
          Seat, 
          SeatStatus,
          Operator // Needed for Bus relation
        ]),
      ],
      providers: [SeatLayoutService],
    }).compile();

    moduleRef = module;
    service = module.get<SeatLayoutService>(SeatLayoutService);
    seatLayoutRepository = module.get<Repository<SeatLayout>>(getRepositoryToken(SeatLayout));
    busRepository = module.get<Repository<Bus>>(getRepositoryToken(Bus));
    operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  beforeEach(async () => {
    const entities = ['seat_status', 'seats', 'seat_layouts', 'buses', 'operators'];
    for (const entity of entities) {
      try {
        await seatLayoutRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
      } catch (e) {}
    }
  });

  async function setupBus() {
    const operator = await operatorRepository.save({
      name: 'Layout Test Op',
      contactEmail: `layout-${crypto.randomUUID()}@test.com`,
      contactPhone: '0900000000'
    });

    const bus = await busRepository.save({
      operator,
      plateNumber: `LAYOUT-${crypto.randomUUID()}`,
      model: 'Layout Model',
      seatCapacity: 40
    });

    return { operator, bus };
  }

  describe('createFromTemplate', () => {
    it('should create a seat layout from standard template', async () => {
      const { bus } = await setupBus();
      
      const dto = {
        busId: bus.id,
        layoutType: SeatLayoutType.STANDARD_2X2,
        seatPricing: {
          basePrice: 100000,
          seatTypePrices: {
            normal: 100000,
            vip: 120000,
            business: 150000
          }
        }
      };

      const result = await service.createFromTemplate(dto);

      expect(result.id).toBeDefined();
      expect(result.busId).toBe(bus.id);
      expect(result.layoutType).toBe(SeatLayoutType.STANDARD_2X2);
      expect(result.layoutConfig).toBeDefined();
      expect(result.layoutConfig.seats.length).toBeGreaterThan(0);
    });

    it('should create seats automatically when layout is created', async () => {
      const { bus } = await setupBus();
      const dto = {
        busId: bus.id,
        layoutType: SeatLayoutType.VIP_1X2,
        seatPricing: {
          basePrice: 200000,
          seatTypePrices: {
            normal: 200000,
            vip: 220000,
            business: 250000
          }
        }
      };

      const result = await service.createFromTemplate(dto);
      expect(result.layoutConfig.dimensions).toBeDefined();
    });
  });

  describe('findByBusId', () => {
    it('should return layout for a specific bus', async () => {
      const { bus } = await setupBus();
      const layout = await service.createFromTemplate({
        busId: bus.id,
        layoutType: SeatLayoutType.STANDARD_2X2,
        seatPricing: {
          basePrice: 50000,
          seatTypePrices: {
            normal: 50000,
            vip: 70000,
            business: 90000
          }
        }
      });

      const found = await service.findByBusId(bus.id);
      expect(found.id).toBe(layout.id);
      expect(found.layoutConfig).toEqual(layout.layoutConfig);
    });
    
    it('should throw NotFoundException if no layout exists for bus', async () => {
      const { bus } = await setupBus();
      await expect(service.findByBusId(bus.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update layout configuration', async () => {
      const { bus } = await setupBus();
      const layout = await service.createFromTemplate({
        busId: bus.id,
        layoutType: SeatLayoutType.STANDARD_2X2,
        seatPricing: {
          basePrice: 50000,
          seatTypePrices: {
            normal: 50000,
            vip: 70000,
            business: 90000
          }
        }
      });

      const newPricing = {
        basePrice: 60000,
        seatTypePrices: { normal: 60000, vip: 80000, business: 100000 }
      };

      const updated = await service.update(layout.id, {
        seatPricing: newPricing
      });

      expect(updated.seatPricing.basePrice).toBe(60000);
    });
  });

  describe('getTemplateConfig', () => {
    it('should return default config for a type', () => {
      const config = service.getTemplateConfig(SeatLayoutType.STANDARD_2X2);
      expect(config.seatsPerRow).toBe(2);
      expect(config.layoutConfig.dimensions).toBeDefined();
    });
  });
});
