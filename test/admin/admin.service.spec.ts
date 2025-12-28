// src/admin/admin.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../../src/admin/admin.service';
import { User } from '../../src/entities/user.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { Booking } from '../../src/entities/booking.entity';
import { Trip } from '../../src/entities/trip.entity';
import { Route } from '../../src/entities/route.entity';
import { SeatStatus } from '../../src/entities/seat-status.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CacheService } from '../../src/common/cache.service';

type RepoFindFn<T> = jest.Mock<Promise<T[]>, []>;
type RepoFindOneFn<T> = jest.Mock<
  Promise<T | null>,
  [Partial<Record<keyof T, unknown>>?]
>;
type RepoSaveFn<T> = jest.Mock<Promise<T>, [Partial<T>]>;

type UserRepoMock = {
  find: RepoFindFn<User>;
  findOne: RepoFindOneFn<User>;
  save: RepoSaveFn<User>;
};

type AuditRepoMock = {
  save: RepoSaveFn<AuditLog>;
};

// Generic mock for other repositories to avoid repetition
const createGenericRepoMock = () => ({
  find: jest.fn(() => Promise.resolve([])),
  findOne: jest.fn(() => Promise.resolve(null)),
  save: jest.fn((entity) => Promise.resolve(entity)),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({}),
    getRawMany: jest.fn().mockResolvedValue([]),
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
  })),
});

describe('AdminService', () => {
  let service: AdminService;
  let cacheService: CacheService;

  const usersFixture: User[] = [
    {
      id: 'u1',
      name: 'User1',
      email: 'u1@x.com',
      phone: '0912345678',
    } as User,
  ];

  const usersRepoMock: UserRepoMock = {
    find: jest.fn<Promise<User[]>, []>(() => Promise.resolve([])),
    findOne: jest.fn<
      Promise<User | null>,
      [Partial<Record<keyof User, unknown>>?]
    >(() => Promise.resolve(null)),
    save: jest.fn<Promise<User>, [Partial<User>]>(() =>
      Promise.resolve(usersFixture[0]),
    ),
  };

  const auditRepoMock: AuditRepoMock = {
    save: jest.fn<Promise<AuditLog>, [Partial<AuditLog>]>(() =>
      Promise.resolve({
        id: 'a1',
        actorId: 'actor1',
        targetUserId: 'u1',
        action: 'CHANGE_ROLE',
        details: 'role -> ADMIN',
        metadata: { by: 'actor1', at: new Date().toISOString() },
        createdAt: new Date(),
      } as AuditLog),
    ),
  };

  const bookingRepoMock = createGenericRepoMock();
  const tripRepoMock = createGenericRepoMock();
  const routeRepoMock = createGenericRepoMock();
  const seatStatusRepoMock = createGenericRepoMock();

  beforeEach(async () => {
    // reset call history
    usersRepoMock.find.mockReset();
    usersRepoMock.findOne.mockReset();
    usersRepoMock.save.mockReset();
    auditRepoMock.save.mockReset();
    // clear real cache between tests
    if (cacheService) cacheService.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        CacheService,
        { provide: getRepositoryToken(User), useValue: usersRepoMock },
        { provide: getRepositoryToken(AuditLog), useValue: auditRepoMock },
        { provide: getRepositoryToken(Booking), useValue: bookingRepoMock },
        { provide: getRepositoryToken(Trip), useValue: tripRepoMock },
        { provide: getRepositoryToken(Route), useValue: routeRepoMock },
        { provide: getRepositoryToken(SeatStatus), useValue: seatStatusRepoMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    cacheService = module.get<CacheService>(CacheService);
  });

  it('findAllUsers returns sanitized array', async () => {
    usersRepoMock.find.mockResolvedValueOnce(usersFixture);

    const res = await service.findAllUsers();

    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('userId', usersFixture[0].id);
    expect(res[0]).toHaveProperty('email', usersFixture[0].email);
    expect(usersRepoMock.find).toHaveBeenCalledTimes(1);
  });

  it('updateUserRole updates role and writes audit', async () => {
    const updatedUser = {
      ...usersFixture[0],
      role: 'ADMIN',
    } as unknown as User;

    usersRepoMock.findOne.mockResolvedValueOnce(usersFixture[0]);
    usersRepoMock.save.mockResolvedValueOnce(updatedUser);
    auditRepoMock.save.mockResolvedValueOnce({
      id: 'a1',
      actorId: 'actor1',
      targetUserId: 'u1',
      action: 'CHANGE_ROLE',
      details: 'role -> ADMIN',
      metadata: { by: 'actor1', at: new Date().toISOString() },
      createdAt: new Date(),
    } as AuditLog);

    const result = await service.updateUserRole('u1', 'ADMIN', 'actor1');

    expect(usersRepoMock.findOne).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(usersRepoMock.save).toHaveBeenCalled();
    expect(auditRepoMock.save).toHaveBeenCalled();

    expect(result).toHaveProperty('role', 'ADMIN');
    expect(result).toHaveProperty('id', 'u1');
  });
});
