import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { repositoryMockFactory } from '../../test/utils/repository.mock';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  const users = [
    {
      id: '1',
      email: 'a@x.com',
      name: 'A',
      password: 'hashedpw',
      role: 'CUSTOMER',
      refreshToken: null,
    },
  ];

  const userRepoMock = repositoryMockFactory(users);
  const jwtServiceMock: Partial<JwtService> = {
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    // Use mockResolvedValue to avoid async arrow without await issues
    (
      jest.spyOn(bcrypt, 'compare') as unknown as jest.SpyInstance<
        Promise<boolean>,
        [string, string]
      >
    ).mockResolvedValue(true);
    (
      jest.spyOn(bcrypt, 'hash') as unknown as jest.SpyInstance<
        Promise<string>,
        [string, any]
      >
    ).mockImplementation((val: string) => Promise.resolve(`hashed-${val}`));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        // If your actual code uses getRepositoryToken(User), replace the token accordingly
        { provide: 'UserRepository', useValue: userRepoMock },
        { provide: JwtService, useValue: jwtServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.resetAllMocks());

  it('login should return tokens and user', async () => {
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(users[0]);
    const loginDto: LoginDto = {
      email: 'a@x.com',
      password: 'password',
    } as LoginDto;

    const result = await service.login(loginDto);

    expect(result).toHaveProperty('accessToken', 'signed-token');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('user');
    expect(
      (jwtServiceMock.sign as jest.Mock).mock.calls.length,
    ).toBeGreaterThan(0);
    expect(userRepoMock.save).toHaveBeenCalled();
  });

  it('login throws on invalid credentials', async () => {
    (userRepoMock.findOne as jest.Mock).mockResolvedValue(null);
    const badDto: LoginDto = {
      email: 'nope',
      password: 'bad',
    } as LoginDto;

    await expect(service.login(badDto)).rejects.toThrow();
  });
});
