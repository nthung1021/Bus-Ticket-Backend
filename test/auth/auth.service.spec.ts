// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../../src/auth/auth.service';
import { LoginDto } from '../../src/auth/dto/login.dto';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../src/entities/user.entity';
import { RefreshToken } from '../../src/entities/refresh-token.entity';
import { JwtConfigService } from '../../src/config/jwt.config.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

type RepoFindOneFn<T> = jest.Mock<
  Promise<T | null>,
  [Partial<Record<keyof T, unknown>>?]
>;
type RepoSaveFn<T> = jest.Mock<Promise<T>, [Partial<T>]>;
type RepoCreateFn<T> = jest.Mock<Partial<T>, [Partial<T>]>;

interface UserRepoMock {
  findOne: RepoFindOneFn<User>;
  save: RepoSaveFn<User>;
  create: RepoCreateFn<User>;
}

interface RefreshRepoMock {
  findOne: RepoFindOneFn<RefreshToken>;
  save: RepoSaveFn<RefreshToken>;
  create: RepoCreateFn<RefreshToken>;
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService; // We will use the real instance

  const usersFixture: User[] = [
    {
      id: '1',
      email: 'a@x.com',
      name: 'A',
      phone: '0912345678',
      role: 'CUSTOMER',
      passwordHash: 'hashed-password',
    } as unknown as User,
  ];

  const usersRepoMock: UserRepoMock = {
    findOne: jest.fn<
      Promise<User | null>,
      [Partial<Record<keyof User, unknown>>?]
    >(() => Promise.resolve(null)),
    save: jest.fn<Promise<User>, [Partial<User>]>(() =>
      Promise.resolve(usersFixture[0]),
    ),
    create: jest.fn<Partial<User>, [Partial<User>]>(
      (dto: Partial<User>) => dto as User,
    ),
  };

  const refreshRepoMock: RefreshRepoMock = {
    findOne: jest.fn<
      Promise<RefreshToken | null>,
      [Partial<Record<keyof RefreshToken, unknown>>?]
    >(() => Promise.resolve(null)),
    save: jest.fn<Promise<RefreshToken>, [Partial<RefreshToken>]>(() =>
      Promise.resolve({
        id: 'rt1',
        userId: '1',
      } as RefreshToken),
    ),
    create: jest.fn<Partial<RefreshToken>, [Partial<RefreshToken>]>(
      (dto: Partial<RefreshToken>) => dto as RefreshToken,
    ),
  };

  // Mock ConfigService so JwtConfigService gets the values it needs
  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    usersRepoMock.findOne.mockReset();
    usersRepoMock.save.mockReset();
    refreshRepoMock.findOne.mockReset();
    refreshRepoMock.save.mockReset();

    // bcrypt mocks
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockImplementation((val: string) =>
      Promise.resolve(`hashed-${val}`),
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({}), // Register real JwtModule
      ],
      providers: [
        AuthService,
        JwtConfigService, // Use real JwtConfigService
        { provide: ConfigService, useValue: mockConfigService }, // Provide dependent mock
        { provide: getRepositoryToken(User), useValue: usersRepoMock },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshRepoMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => jest.resetAllMocks());

  it('login should return real JWT tokens', async () => {
    usersRepoMock.findOne.mockResolvedValueOnce(usersFixture[0]);

    const loginDto: LoginDto = {
      email: 'a@x.com',
      password: 'password',
    } as LoginDto;

    const result = await service.login(loginDto);

    // Assert that we got a string back
    expect(typeof result.data.accessToken).toBe('string');
    expect(typeof result.data.refreshToken).toBe('string');

    // Decode and verify the content of the token using the REAL JwtService
    // Since AuthService uses the secrets from JwtConfigService, we can verify with those secrets.
    const decoded = jwtService.verify(result.data.accessToken, {
      secret: 'test-access-secret',
    });

    expect(decoded.email).toBe('a@x.com');
    expect(decoded.sub).toBe('1');
  });

  it('login throws on invalid credentials', async () => {
    usersRepoMock.findOne.mockResolvedValueOnce(null);

    const badDto: LoginDto = {
      email: 'nope',
      password: 'bad',
    } as LoginDto;

    await expect(service.login(badDto)).rejects.toThrow();
  });
});
