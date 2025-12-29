import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeatService } from '../../src/seat/seat.service';
import { Seat } from '../../src/entities/seat.entity';

describe('SeatService', () => {
  let service: SeatService;
  let repo: any;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatService,
        {
          provide: getRepositoryToken(Seat),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<SeatService>(SeatService);
    repo = module.get(getRepositoryToken(Seat));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
