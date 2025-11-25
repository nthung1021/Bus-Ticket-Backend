import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { repositoryMockFactory } from '../../test/utils/repository.mock';

describe('AdminService', () => {
  let service: AdminService;
  const fakeUsers = [
    {
      id: 'u1',
      name: 'User1',
      email: 'u1@x.com',
      role: 'CUSTOMER',
      createdAt: new Date(),
    },
  ];

  const usersRepoMock = repositoryMockFactory(fakeUsers);
  const auditRepoMock = repositoryMockFactory([]);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: 'UserRepository', useValue: usersRepoMock },
        { provide: 'AuditRepository', useValue: auditRepoMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('findAllUsers returns sanitized array', async () => {
    (usersRepoMock.find as jest.Mock).mockResolvedValue(fakeUsers);
    const res = await service.findAllUsers();
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toHaveProperty('userId');
    expect(res[0]).toHaveProperty('email');
  });

  it('updateUserRole updates role and writes audit', async () => {
    (usersRepoMock.findOne as jest.Mock).mockResolvedValue(fakeUsers[0]);
    (usersRepoMock.save as jest.Mock).mockResolvedValue({
      ...fakeUsers[0],
      role: 'ADMIN',
    });
    const updated = await service.updateUserRole('u1', 'ADMIN', 'actor1');
    expect(updated.role).toBe('ADMIN');
    expect(auditRepoMock.save).toHaveBeenCalled();
  });
});
