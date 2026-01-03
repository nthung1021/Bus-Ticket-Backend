import { Test, TestingModule } from '@nestjs/testing';
import { SeatController } from '../../src/seat/seat.controller';
import { SeatService } from '../../src/seat/seat.service';

describe('SeatController', () => {
  let controller: SeatController;
  let service: SeatService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByBus: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatController],
      providers: [
        {
          provide: SeatService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<SeatController>(SeatController);
    service = module.get<SeatService>(SeatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
